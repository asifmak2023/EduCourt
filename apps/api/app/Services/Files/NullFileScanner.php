<?php

namespace App\Services\Files;

/**
 * Explicit opt-out: performs no inspection at all.
 *
 * Only selected when UPLOAD_SCANNER is "off" or "none". The default in every
 * environment is {@see StrictFileScanner}, which validates uploads
 * structurally even without ClamAV. Use this driver only for local experiments
 * where you deliberately want raw uploads.
 */
class NullFileScanner implements FileScanner
{
    public function scan(string $absolutePath): ?string
    {
        return null;
    }
}
