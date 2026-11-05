<?php

namespace Tests\Feature;

use App\Services\Files\NullFileScanner;
use RuntimeException;
use Tests\TestCase;

class FileScannerTest extends TestCase
{
    public function test_null_scanner_is_a_no_op_in_testing(): void
    {
        $this->assertNull((new NullFileScanner)->scan('/tmp/example'));
    }

    public function test_null_scanner_fails_closed_outside_local_environments(): void
    {
        $this->app['env'] = 'production';

        $this->expectException(RuntimeException::class);
        $this->expectExceptionMessage('UPLOAD_SCANNER=clamav');

        (new NullFileScanner)->scan('/tmp/example');
    }
}
