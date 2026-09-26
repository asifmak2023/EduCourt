<?php

namespace App\Services\Files;

use RuntimeException;
use Symfony\Component\Process\ExecutableFinder;
use Symfony\Component\Process\Process;

/**
 * ClamAV backed scanner. Works with both the clamd client (clamdscan) and the
 * standalone scanner (clamscan). Configure with UPLOAD_SCANNER=clamav.
 */
class ClamavFileScanner implements FileScanner
{
    public function scan(string $absolutePath): ?string
    {
        $binary = (string) config('security.uploads.clamav_binary', 'clamdscan');
        $resolved = (new ExecutableFinder)->find($binary);

        if ($resolved === null) {
            throw new RuntimeException("Antivirus binary [{$binary}] is not installed.");
        }

        $process = new Process([$resolved, '--no-summary', $absolutePath]);
        $process->setTimeout((int) config('security.uploads.scan_timeout', 30));
        $process->run();

        return match ($process->getExitCode()) {
            0 => null,
            1 => $this->threatFrom($process->getOutput()),
            default => throw new RuntimeException('Antivirus scan failed: '.trim($process->getErrorOutput() ?: $process->getOutput())),
        };
    }

    private function threatFrom(string $output): string
    {
        if (preg_match('/:\s*(.+?)\s+FOUND/u', $output, $matches) === 1) {
            return $matches[1];
        }

        return 'Malware detected';
    }
}
