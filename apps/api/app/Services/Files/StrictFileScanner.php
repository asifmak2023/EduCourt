<?php

namespace App\Services\Files;

/**
 * Structural-validation scanner used when no antivirus engine is configured.
 *
 * In local/testing it is a no-op so developer uploads and fake test files are
 * never blocked. Everywhere else it runs {@see StrictFileValidator}, which
 * identifies each upload by its magic bytes and validates the content. This
 * lets production accept ordinary PDF, image and DOCX uploads without an AV
 * binary, while still rejecting spoofed, malformed or script-bearing files.
 *
 * An optional engine (e.g. {@see ClamavFileScanner}) may be supplied to run a
 * real malware scan in addition to the structural checks.
 */
class StrictFileScanner implements FileScanner
{
    private readonly StrictFileValidator $validator;

    public function __construct(?StrictFileValidator $validator = null, private readonly ?FileScanner $engine = null)
    {
        $this->validator = $validator ?? new StrictFileValidator;
    }

    public function scan(string $absolutePath): ?string
    {
        if (! app()->environment(['local', 'testing'])) {
            $reason = $this->validator->validate($absolutePath);

            if ($reason !== null) {
                return $reason;
            }
        }

        if ($this->engine !== null) {
            $threat = $this->engine->scan($absolutePath);

            if ($threat !== null) {
                return "malware was detected ({$threat})";
            }
        }

        return null;
    }
}
