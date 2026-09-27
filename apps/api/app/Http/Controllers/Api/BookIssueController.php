<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\StampsAcademicTenant;
use App\Http\Controllers\Controller;
use App\Http\Resources\BookIssueResource;
use App\Models\Book;
use App\Models\BookIssue;
use App\Services\Library\LibraryService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Validation\Rule;

class BookIssueController extends Controller
{
    use StampsAcademicTenant;

    public function __construct(private readonly LibraryService $library) {}

    public function index(Request $request): AnonymousResourceCollection
    {
        $issues = BookIssue::query()
            ->with(['book', 'student'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('book_id'), fn ($q) => $q->where('book_id', $request->integer('book_id')))
            ->when($request->filled('student_id'), fn ($q) => $q->where('student_id', $request->integer('student_id')))
            ->when($request->boolean('overdue'), fn ($q) => $q->where('status', 'overdue'))
            ->orderByDesc('id')
            ->paginate($request->integer('per_page', 50));

        return BookIssueResource::collection($issues);
    }

    public function store(Request $request): JsonResponse
    {
        $this->academicTenantAttributes();

        $data = $request->validate([
            'book_id' => ['required', 'integer', Rule::exists('books', 'id')],
            'member_type' => ['sometimes', Rule::in(['student', 'staff'])],
            'student_id' => ['nullable', 'integer', Rule::exists('students', 'id')],
            'user_id' => ['nullable', 'integer', Rule::exists('users', 'id')],
            'issued_on' => ['nullable', 'date'],
            'due_on' => ['nullable', 'date', 'after_or_equal:issued_on'],
            'loan_days' => ['sometimes', 'integer', 'min:1', 'max:365'],
            'notes' => ['nullable', 'string'],
        ]);

        $book = Book::query()->findOrFail($data['book_id']);
        $issue = $this->library->issueBook($book, $data, $request->user()?->id);

        return (new BookIssueResource($issue->load(['book', 'student'])))->response()->setStatusCode(201);
    }

    public function show(BookIssue $bookIssue): BookIssueResource
    {
        return new BookIssueResource($bookIssue->load(['book', 'student']));
    }

    public function returnBook(Request $request, BookIssue $bookIssue): BookIssueResource
    {
        $data = $request->validate([
            'returned_on' => ['nullable', 'date'],
            'lost' => ['sometimes', 'boolean'],
            'fine_per_day' => ['sometimes', 'numeric', 'min:0'],
            'fine_amount' => ['sometimes', 'numeric', 'min:0'],
            'notes' => ['nullable', 'string'],
        ]);

        $issue = $this->library->returnBook($bookIssue, $data);

        return new BookIssueResource($issue->load(['book', 'student']));
    }
}
