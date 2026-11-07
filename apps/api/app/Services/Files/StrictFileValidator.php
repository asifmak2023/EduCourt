<?php

namespace App\Services\Files;

use ZipArchive;

/**
 * Content-based structural validation for uploaded files.
 *
 * This is the fallback used when no antivirus engine (ClamAV) is configured.
 * Instead of trusting the client-supplied name or MIME type, every file is
 * identified by its magic bytes and then validated against the rules for that
 * concrete format:
 *
 *  - Images must decode as a real image, be within sane dimensions, and carry
 *    no data appended after the end-of-image marker (polyglot / trailing-code
 *    attacks). The original bytes are preserved so EXIF orientation and image
 *    quality are untouched.
 *  - PDFs must be terminated correctly and must not embed active content
 *    (JavaScript, launches, embedded files, XFA) unless explicitly allowed.
 *  - DOCX files must be well-formed Office Open XML with safe archive paths
 *    and no embedded macros.
 *
 * It is not a substitute for antivirus scanning, but it removes the most
 * common file-upload attack vectors without breaking legitimate documents.
 */
class StrictFileValidator
{
    private const MAX_IMAGE_DIMENSION = 20000;

    private const MAX_IMAGE_PIXELS = 100_000_000;

    private const JPEG = 'jpeg';

    private const PNG = 'png';

    private const WEBP = 'webp';

    private const PDF = 'pdf';

    private const DOCX = 'docx';

    private const LEGACY_OFFICE = 'legacy-office';

    private const UNKNOWN = 'unknown';

    /**
     * Validate the file at the given path.
     *
     * @return string|null A human readable reason when the file is rejected, null when it is accepted.
     */
    public function validate(string $absolutePath): ?string
    {
        if (! is_file($absolutePath) || ! is_readable($absolutePath)) {
            return 'the uploaded file could not be read';
        }

        $type = $this->detectType($absolutePath);

        return match ($type) {
            self::JPEG, self::PNG, self::WEBP => $this->validateImage($absolutePath, $type),
            self::PDF => $this->validatePdf($absolutePath),
            self::DOCX => $this->validateDocx($absolutePath),
            self::LEGACY_OFFICE => 'legacy binary Office files are not accepted; save the document as PDF or DOCX',
            default => 'the file type is not recognised; only PDF, JPEG, PNG, WEBP and DOCX files are accepted',
        };
    }

    private function detectType(string $path): string
    {
        $handle = fopen($path, 'rb');

        if ($handle === false) {
            return self::UNKNOWN;
        }

        $head = (string) fread($handle, 16);
        fclose($handle);

        if (str_starts_with($head, "\xFF\xD8\xFF")) {
            return self::JPEG;
        }

        if (str_starts_with($head, "\x89PNG\r\n\x1A\n")) {
            return self::PNG;
        }

        if (str_starts_with($head, 'RIFF') && substr($head, 8, 4) === 'WEBP') {
            return self::WEBP;
        }

        if (str_starts_with($head, '%PDF-')) {
            return self::PDF;
        }

        if (str_starts_with($head, "\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1")) {
            return self::LEGACY_OFFICE;
        }

        if (str_starts_with($head, "PK\x03\x04") || str_starts_with($head, "PK\x05\x06")) {
            return self::DOCX;
        }

        return self::UNKNOWN;
    }

    private function validateImage(string $path, string $format): ?string
    {
        $info = @getimagesize($path);

        if ($info === false) {
            return 'the image could not be decoded';
        }

        [$width, $height] = $info;

        if ($width < 1 || $height < 1) {
            return 'the image has invalid dimensions';
        }

        if ($width > self::MAX_IMAGE_DIMENSION || $height > self::MAX_IMAGE_DIMENSION || ($width * $height) > self::MAX_IMAGE_PIXELS) {
            return 'the image dimensions are too large';
        }

        $contents = @file_get_contents($path);

        if ($contents === false) {
            return 'the image could not be read';
        }

        return match ($format) {
            self::JPEG => $this->assertNoTrailingData($contents, "\xFF\xD9", 'JPEG'),
            self::PNG => $this->assertNoTrailingPngData($contents),
            self::WEBP => $this->assertNoTrailingWebpData($contents),
            default => null,
        };
    }

    private function assertNoTrailingData(string $contents, string $endMarker, string $label): ?string
    {
        $end = strrpos($contents, $endMarker);

        if ($end === false) {
            return "the {$label} is truncated";
        }

        $trailing = substr($contents, $end + strlen($endMarker));

        if (trim($trailing, "\x00\x09\x0A\x0D\x20") !== '') {
            return "the {$label} contains unexpected data after its end marker";
        }

        return null;
    }

    private function assertNoTrailingPngData(string $contents): ?string
    {
        $end = strrpos($contents, 'IEND');

        if ($end === false) {
            return 'the PNG is truncated';
        }

        $trailing = substr($contents, $end + 8);

        if (trim($trailing, "\x00\x09\x0A\x0D\x20") !== '') {
            return 'the PNG contains unexpected data after its end marker';
        }

        return null;
    }

    private function assertNoTrailingWebpData(string $contents): ?string
    {
        if (strlen($contents) < 12) {
            return 'the WEBP image is truncated';
        }

        $declared = unpack('V', substr($contents, 4, 4))[1] ?? 0;
        $trailing = substr($contents, $declared + 8);

        if (trim((string) $trailing, "\x00\x09\x0A\x0D\x20") !== '') {
            return 'the WEBP image contains unexpected data after its end marker';
        }

        return null;
    }

    private function validatePdf(string $path): ?string
    {
        $contents = @file_get_contents($path);

        if ($contents === false) {
            return 'the document could not be read';
        }

        if (strlen($contents) < 8) {
            return 'the PDF is empty or truncated';
        }

        if (! str_contains(substr($contents, -2048), '%%EOF')) {
            return 'the PDF is incomplete or corrupted';
        }

        if (! config('security.uploads.allow_pdf_scripts', false)) {
            $forbidden = ['/JavaScript', '/Launch', '/EmbeddedFile', '/RichMedia', '/XFA'];

            foreach ($forbidden as $token) {
                if (str_contains($contents, $token)) {
                    return "the PDF contains embedded active content ({$token}) which is not allowed";
                }
            }
        }

        return null;
    }

    private function validateDocx(string $path): ?string
    {
        $zip = new ZipArchive;

        if ($zip->open($path) !== true) {
            return 'the document archive is not valid';
        }

        try {
            $names = [];

            for ($i = 0; $i < $zip->numFiles; $i++) {
                $name = (string) $zip->getNameIndex($i);
                $names[] = $name;

                if (str_contains($name, "\0") || str_starts_with($name, '/') || in_array('..', explode('/', $name), true)) {
                    return 'the document archive contains an unsafe path';
                }

                if (strcasecmp($name, 'word/vbaProject.bin') === 0) {
                    return 'documents containing macros are not accepted';
                }
            }

            if (! in_array('[Content_Types].xml', $names, true)) {
                return 'the document is not a valid Office Open XML file';
            }

            if (! in_array('word/document.xml', $names, true)) {
                return 'only Word documents (DOCX) are accepted';
            }
        } finally {
            $zip->close();
        }

        return null;
    }
}
