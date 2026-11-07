<?php

namespace Tests\Feature;

use App\Services\Files\FileScanner;
use App\Services\Files\NullFileScanner;
use App\Services\Files\StrictFileScanner;
use App\Services\Files\StrictFileValidator;
use Illuminate\Http\UploadedFile;
use Tests\TestCase;

class FileScannerTest extends TestCase
{
    public function test_null_scanner_never_blocks_uploads(): void
    {
        $this->assertNull((new NullFileScanner)->scan('/tmp/example'));
    }

    public function test_strict_scanner_is_a_no_op_in_testing(): void
    {
        $this->assertNull((new StrictFileScanner)->scan('/tmp/does-not-exist'));
    }

    public function test_strict_scanner_rejects_unknown_content_outside_local_environments(): void
    {
        $this->app['env'] = 'production';

        $file = $this->tempFile('plain text pretending to be a document');

        $reason = (new StrictFileScanner)->scan($file);

        $this->assertNotNull($reason);
        $this->assertStringContainsString('not recognised', $reason);
    }

    public function test_valid_pdf_is_accepted_outside_local_environments(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->pdf());

        $this->assertNull($reason);
    }

    public function test_pdf_with_javascript_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->pdf('<< /JavaScript (app.alert(1)) >>'));

        $this->assertNotNull($reason);
        $this->assertStringContainsString('active content', $reason);
    }

    public function test_truncated_pdf_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->tempFile('%PDF-1.7'));

        $this->assertNotNull($reason);
        $this->assertStringContainsString('incomplete', $reason);
    }

    public function test_valid_image_is_accepted(): void
    {
        $this->app['env'] = 'production';

        $image = UploadedFile::fake()->image('photo.jpg', 40, 40);

        $reason = (new StrictFileScanner)->scan($image->getRealPath());

        $this->assertNull($reason);
    }

    public function test_image_with_appended_payload_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $image = UploadedFile::fake()->image('photo.jpg', 40, 40);
        $path = $image->getRealPath();
        file_put_contents($path, '<?php system($_GET["c"]); ?>', FILE_APPEND);

        $reason = (new StrictFileScanner)->scan($path);

        $this->assertNotNull($reason);
        $this->assertStringContainsString('after its end marker', $reason);
    }

    public function test_legacy_office_binary_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->tempFile("\xD0\xCF\x11\xE0\xA1\xB1\x1A\xE1rest"));

        $this->assertNotNull($reason);
        $this->assertStringContainsString('legacy binary Office', $reason);
    }

    public function test_validator_rejects_a_directory(): void
    {
        $this->assertNotNull((new StrictFileValidator)->validate(sys_get_temp_dir()));
    }

    public function test_production_without_an_engine_resolves_to_structural_validation(): void
    {
        $this->app['env'] = 'production';
        config(['security.uploads.scanner' => 'null']);

        $scanner = $this->app->make(FileScanner::class);

        $this->assertInstanceOf(StrictFileScanner::class, $scanner);
        $this->assertNotNull($scanner->scan($this->tempFile('plain text')));
    }

    public function test_explicit_off_driver_disables_inspection(): void
    {
        $this->app['env'] = 'production';
        config(['security.uploads.scanner' => 'off']);

        $scanner = $this->app->make(FileScanner::class);

        $this->assertInstanceOf(NullFileScanner::class, $scanner);
        $this->assertNull($scanner->scan($this->tempFile('plain text')));
    }

    public function test_structural_validation_runs_before_the_engine(): void
    {
        $this->app['env'] = 'production';

        $engine = new class implements FileScanner
        {
            public bool $called = false;

            public function scan(string $absolutePath): ?string
            {
                $this->called = true;

                return null;
            }
        };

        $scanner = new StrictFileScanner(engine: $engine);

        $reason = $scanner->scan($this->tempFile('plain text'));

        $this->assertNotNull($reason);
        $this->assertFalse($engine->called, 'the engine must not run when structural validation fails');
    }

    public function test_engine_threat_is_surfaced_after_structural_validation_passes(): void
    {
        $this->app['env'] = 'production';

        $engine = new class implements FileScanner
        {
            public function scan(string $absolutePath): ?string
            {
                return 'Eicar-Test-Signature';
            }
        };

        $scanner = new StrictFileScanner(engine: $engine);

        $reason = $scanner->scan($this->pdf());

        $this->assertNotNull($reason);
        $this->assertStringContainsString('malware', $reason);
    }

    public function test_valid_docx_is_accepted(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->docx());

        $this->assertNull($reason);
    }

    public function test_docx_with_a_macro_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->docx(['word/vbaProject.bin' => 'macro']));

        $this->assertNotNull($reason);
        $this->assertStringContainsString('macros', $reason);
    }

    public function test_docx_without_a_word_document_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $reason = (new StrictFileScanner)->scan($this->docx([], false));

        $this->assertNotNull($reason);
        $this->assertStringContainsString('Word documents', $reason);
    }

    public function test_non_zip_ooxml_family_is_rejected(): void
    {
        $this->app['env'] = 'production';

        $path = $this->tempFile("PK\x03\x04not a real zip archive");

        $reason = (new StrictFileScanner)->scan($path);

        $this->assertNotNull($reason);
    }

    /**
     * @param  array<string, string>  $extra
     */
    private function docx(array $extra = [], bool $withDocument = true): string
    {
        $path = tempnam(sys_get_temp_dir(), 'docx').'.docx';

        $zip = new \ZipArchive;
        $zip->open($path, \ZipArchive::CREATE | \ZipArchive::OVERWRITE);
        $zip->addFromString('[Content_Types].xml', '<Types/>');

        if ($withDocument) {
            $zip->addFromString('word/document.xml', '<w:document/>');
        }

        foreach ($extra as $name => $contents) {
            $zip->addFromString($name, $contents);
        }

        $zip->close();

        return $path;
    }

    private function pdf(string $extra = ''): string
    {
        return $this->tempFile("%PDF-1.7\n1 0 obj\n<< /Type /Catalog >>\nendobj\n{$extra}\ntrailer\n<< /Root 1 0 R >>\n%%EOF");
    }

    private function tempFile(string $contents): string
    {
        $path = tempnam(sys_get_temp_dir(), 'scan').'.bin';
        file_put_contents($path, $contents);

        return $path;
    }
}
