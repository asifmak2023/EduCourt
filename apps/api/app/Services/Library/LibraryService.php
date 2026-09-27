<?php

namespace App\Services\Library;

use App\Enums\BookIssueStatus;
use App\Models\Book;
use App\Models\BookIssue;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Handles book issuing and returns with availability tracking and overdue
 * fine calculation.
 */
class LibraryService
{
    public const DEFAULT_FINE_PER_DAY = 5.0;

    /**
     * @param  array<string, mixed>  $data
     */
    public function issueBook(Book $book, array $data, ?int $userId): BookIssue
    {
        return DB::transaction(function () use ($book, $data, $userId) {
            $locked = Book::query()->whereKey($book->id)->lockForUpdate()->firstOrFail();

            if ($locked->available_copies < 1) {
                throw ValidationException::withMessages([
                    'book_id' => 'No copies of this book are currently available.',
                ]);
            }

            $issuedOn = isset($data['issued_on']) ? Carbon::parse($data['issued_on']) : now();
            $dueOn = isset($data['due_on'])
                ? Carbon::parse($data['due_on'])
                : $issuedOn->copy()->addDays((int) ($data['loan_days'] ?? 14));

            $issue = $locked->issues()->create($data + [
                'institution_id' => $locked->institution_id,
                'campus_id' => $locked->campus_id,
                'issued_on' => $issuedOn->toDateString(),
                'due_on' => $dueOn->toDateString(),
                'status' => BookIssueStatus::Issued,
                'issued_by' => $userId,
            ]);

            $locked->decrement('available_copies');

            return $issue;
        });
    }

    /**
     * @param  array<string, mixed>  $data
     */
    public function returnBook(BookIssue $issue, array $data = []): BookIssue
    {
        return DB::transaction(function () use ($issue, $data) {
            if ($issue->status !== BookIssueStatus::Issued && $issue->status !== BookIssueStatus::Overdue) {
                throw ValidationException::withMessages([
                    'status' => 'Only issued or overdue books can be returned.',
                ]);
            }

            $returnedOn = isset($data['returned_on']) ? Carbon::parse($data['returned_on']) : now();
            $lost = (bool) ($data['lost'] ?? false);
            $finePerDay = (float) ($data['fine_per_day'] ?? self::DEFAULT_FINE_PER_DAY);
            $daysLate = max(0, (int) $issue->due_on->startOfDay()->diffInDays($returnedOn->copy()->startOfDay(), false));

            $fine = $lost ? (float) ($data['fine_amount'] ?? 0) : round($daysLate * $finePerDay, 2);

            $issue->forceFill([
                'returned_on' => $returnedOn->toDateString(),
                'fine_amount' => $fine,
                'status' => $lost ? BookIssueStatus::Lost : BookIssueStatus::Returned,
                'notes' => $data['notes'] ?? $issue->notes,
            ])->save();

            if (! $lost) {
                Book::query()->whereKey($issue->book_id)->increment('available_copies');
            }

            return $issue->refresh();
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function summary(): array
    {
        $this->flagOverdue();

        $issues = BookIssue::query()->get();

        return [
            'titles' => Book::query()->count(),
            'copies' => (int) Book::query()->sum('total_copies'),
            'available' => (int) Book::query()->sum('available_copies'),
            'issued' => $issues->where('status', BookIssueStatus::Issued)->count(),
            'overdue' => $issues->where('status', BookIssueStatus::Overdue)->count(),
            'lost' => $issues->where('status', BookIssueStatus::Lost)->count(),
            'fines_collected' => (float) $issues->sum('fine_amount'),
        ];
    }

    private function flagOverdue(): void
    {
        BookIssue::query()
            ->where('status', BookIssueStatus::Issued)
            ->whereDate('due_on', '<', now()->toDateString())
            ->update(['status' => BookIssueStatus::Overdue]);
    }
}
