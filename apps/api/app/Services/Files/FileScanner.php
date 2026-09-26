<?php

namespace App\Services\Files;

interface FileScanner
{
    /**
     * Scan an absolute file path for malware.
     *
     * @return string|null The threat name when the file is infected, null when clean.
     */
    public function scan(string $absolutePath): ?string;
}
