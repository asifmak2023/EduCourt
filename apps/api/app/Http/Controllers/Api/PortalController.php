<?php

namespace App\Http\Controllers\Api;

use App\Enums\VoucherStatus;
use App\Enums\WhatsAppConsentStatus;
use App\Enums\WhatsAppMessageCategory;
use App\Http\Controllers\Controller;
use App\Http\Resources\FeeVoucherResource;
use App\Http\Resources\StudentAttendanceResource;
use App\Http\Resources\StudentResource;
use App\Http\Resources\TimetableSlotResource;
use App\Models\Exam;
use App\Models\CampusIntegrationPolicy;
use App\Models\FeeVoucher;
use App\Models\Guardian;
use App\Models\IntegrationPolicy;
use App\Models\Student;
use App\Models\StudentAttendance;
use App\Models\StudentEnrollment;
use App\Models\TimetableSlot;
use App\Models\WhatsAppConsent;
use App\Models\WhatsAppUsage;
use App\Services\Attendance\AttendanceService;
use App\Services\Exams\ResultService;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\Storage;

/**
 * Self-service endpoints for the signed-in student or parent. Every request is
 * resolved against the student records linked to the acting user so a portal
 * account can only ever read its own (or its children's) data.
 *
 * These routes are deliberately not gated by the staff module permissions
 * (timetable.view, fee.view, ...): a portal account is authorized by its linked
 * student record alone, so a student can see their own fees without being
 * granted campus-wide fee access.
 */
class PortalController extends Controller
{
    public function children(Request $request): AnonymousResourceCollection
    {
        $students = $this->actingStudents($request)->load([
            'enrollments.academicYear', 'enrollments.classRoom', 'enrollments.section', 'user', 'guardians',
        ]);

        return StudentResource::collection($students);
    }

    public function timetable(Request $request): AnonymousResourceCollection
    {
        $student = $this->studentOrFail($request);
        $enrollment = $this->currentEnrollment($student, $request->integer('academic_year_id') ?: null);

        if ($enrollment === null) {
            return TimetableSlotResource::collection(collect());
        }

        $slots = TimetableSlot::query()
            ->where('class_room_id', $enrollment->class_room_id)
            ->when($enrollment->section_id, fn ($q, $sectionId) => $q->where('section_id', $sectionId))
            ->where('academic_year_id', $enrollment->academic_year_id)
            ->where('is_published', true)
            ->when($request->filled('term_id'), fn ($q) => $q->where('term_id', $request->integer('term_id')))
            ->orderBy('day_of_week')
            ->orderBy('period_id')
            ->with(['period', 'subject', 'teacher', 'classRoom', 'section', 'room'])
            ->get();

        return TimetableSlotResource::collection($slots);
    }

    public function attendance(Request $request, AttendanceService $attendance): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $from = $request->filled('from')
            ? $request->date('from')->toDateString()
            : now()->startOfMonth()->toDateString();
        $to = $request->filled('to') ? $request->date('to')->toDateString() : now()->toDateString();

        $records = StudentAttendance::query()
            ->where('student_id', $student->id)
            ->whereBetween('attendance_date', [$from, $to])
            ->with(['classRoom', 'section'])
            ->orderByDesc('attendance_date')
            ->limit(120)
            ->get();

        return response()->json([
            'student' => $this->studentBrief($student),
            'summary' => $attendance->studentSummary($student->id, $from, $to),
            'data' => StudentAttendanceResource::collection($records),
        ]);
    }

    public function results(Request $request, ResultService $results): JsonResponse
    {
        $student = $this->studentOrFail($request);
        $enrollment = $this->currentEnrollment($student, $request->integer('academic_year_id') ?: null);

        $exams = Exam::query()
            ->when(
                $enrollment !== null,
                fn ($q) => $q->where('academic_year_id', $enrollment->academic_year_id)
            )
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->get();

        $cards = $exams
            ->map(function (Exam $exam) use ($student, $results): array {
                $card = $results->resultCard($student, $exam);
                $card['exam'] = [
                    'id' => $exam->id,
                    'name' => $exam->name,
                    'starts_on' => $exam->starts_on?->toDateString(),
                    'ends_on' => $exam->ends_on?->toDateString(),
                ];

                return $card;
            })
            ->values();

        return response()->json([
            'student' => $this->studentBrief($student),
            'data' => $cards,
        ]);
    }

    public function fees(Request $request): JsonResponse
    {
        $student = $this->studentOrFail($request);

        $vouchers = FeeVoucher::query()
            ->where('student_id', $student->id)
            ->whereIn('status', [
                VoucherStatus::Unpaid->value,
                VoucherStatus::Partial->value,
                VoucherStatus::Paid->value,
            ])
            ->orderBy('due_date')
            ->orderBy('id')
            ->get();

        $billed = (float) $vouchers->sum('amount');
        $paid = (float) $vouchers->sum('paid_amount');

        return response()->json([
            'student' => $this->studentBrief($student),
            'totals' => [
                'billed' => number_format($billed, 2, '.', ''),
                'paid' => number_format($paid, 2, '.', ''),
                'outstanding' => number_format(max($billed - $paid, 0), 2, '.', ''),
            ],
            'data' => FeeVoucherResource::collection($vouchers),
        ]);
    }

    /**
     * WhatsApp consent for the acting guardian/student, one row per category.
     */
    public function whatsappConsent(Request $request): JsonResponse
    {
        $phones = $this->actingPhones($request);

        $consents = WhatsAppConsent::query()
            ->whereIn('phone', $phones)
            ->get()
            ->map(fn (WhatsAppConsent $consent) => [
                'phone' => $consent->phone,
                'category' => $consent->message_category?->value,
                'status' => $consent->status?->value,
                'opted_in_at' => $consent->opted_in_at,
                'opted_out_at' => $consent->opted_out_at,
            ]);

        return response()->json([
            'data' => [
                'phones' => array_values($phones),
                'consents' => $consents,
            ],
        ]);
    }

    /**
     * Opt in or out of proactive WhatsApp messaging for the acting user's phone
     * numbers. History is preserved by the consent model.
     */
    public function updateWhatsappConsent(Request $request): JsonResponse
    {
        $data = $request->validate([
            'status' => ['required', 'in:opted_in,opted_out'],
            'category' => ['sometimes', 'string', 'max:24'],
        ]);

        $phones = $this->actingPhones($request);

        if ($phones === []) {
            abort(422, 'No phone number is linked to your account.');
        }

        $category = WhatsAppMessageCategory::tryFrom($data['category'] ?? 'utility') ?? WhatsAppMessageCategory::Utility;
        $institutionId = (int) $request->user()->institution_id;

        // Consent is matched per business account (WABA) at delivery time, and a
        // campus may send from its own number. Record the choice against every
        // business account the institution can actually send from, otherwise a
        // portal opt-in would never match the sender used for the message.
        $businessAccountIds = $this->businessAccountIds($institutionId);

        foreach ($businessAccountIds as $businessAccountId) {
            foreach ($phones as $phone) {
                $consent = WhatsAppConsent::firstOrNew([
                    'institution_id' => $institutionId,
                    'business_account_id' => $businessAccountId,
                    'phone' => $phone,
                    'message_category' => $category->value,
                ]);

                if ($data['status'] === 'opted_in') {
                    $consent->fill([
                        'status' => WhatsAppConsentStatus::OptedIn,
                        'source' => 'portal',
                        'opted_in_at' => now(),
                    ]);
                } else {
                    $consent->fill([
                        'status' => WhatsAppConsentStatus::OptedOut,
                        'source' => 'portal',
                        'opted_out_at' => now(),
                    ]);
                }

                $consent->save();
            }
        }

        return $this->whatsappConsent($request);
    }

    /**
     * Business account ids (WABAs) the institution may send from: the assigned
     * institution sender plus any campus-assigned senders. Falls back to a
     * placeholder when no sender is configured yet so consent can still be
     * recorded before the platform provisions a number.
     *
     * @return array<int, string>
     */
    private function businessAccountIds(int $institutionId): array
    {
        $ids = [];

        $institutionAccount = IntegrationPolicy::query()
            ->where('institution_id', $institutionId)
            ->first()?->whatsappSender?->business_account_id;

        if (is_string($institutionAccount) && $institutionAccount !== '') {
            $ids[$institutionAccount] = $institutionAccount;
        }

        $campusAccounts = CampusIntegrationPolicy::query()
            ->with('whatsappSender')
            ->where('institution_id', $institutionId)
            ->get();

        foreach ($campusAccounts as $policy) {
            $account = $policy->whatsappSender?->business_account_id;

            if (is_string($account) && $account !== '') {
                $ids[$account] = $account;
            }
        }

        if ($ids === []) {
            $ids['default'] = 'default';
        }

        return array_values($ids);
    }

    /**
     * WhatsApp messages delivered to the acting guardian/student's phones.
     */
    public function whatsappMessages(Request $request): JsonResponse
    {
        $phones = $this->actingPhones($request);

        $messages = WhatsAppUsage::query()
            ->whereIn('recipient', $phones)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get()
            ->map(fn (WhatsAppUsage $usage) => [
                'id' => $usage->id,
                'recipient' => $usage->recipient,
                'delivery_status' => $usage->delivery_status?->value,
                'created_at' => $usage->created_at,
                'delivered_at' => $usage->delivered_at,
            ]);

        return response()->json(['data' => $messages]);
    }

    /**
     * Normalised phone numbers linked to the acting user through guardians.
     *
     * @return array<int, string>
     */
    private function actingPhones(Request $request): array
    {
        $user = $request->user();
        $phones = [];

        $guardians = Guardian::query()->where('user_id', $user->id)->get();

        foreach ($guardians as $guardian) {
            foreach ([$guardian->phone, $guardian->alternate_phone] as $raw) {
                $normalised = WhatsAppConsent::normalisePhone((string) $raw);

                if ($normalised !== null) {
                    $phones[$normalised] = $normalised;
                }
            }
        }

        $normalisedOwn = WhatsAppConsent::normalisePhone((string) ($user->phone ?? ''));

        if ($normalisedOwn !== null) {
            $phones[$normalisedOwn] = $normalisedOwn;
        }

        return array_values($phones);
    }

    /**
     * Students linked to the acting user: the user's own student record, or the
     * children of a parent/guardian account.
     *
     * @return Collection<int, Student>
     */
    private function actingStudents(Request $request): Collection
    {
        $user = $request->user();

        $own = Student::query()->where('user_id', $user->id)->get();

        if ($own->isNotEmpty()) {
            return $own;
        }

        $guardianIds = Guardian::query()->where('user_id', $user->id)->pluck('id');

        if ($guardianIds->isEmpty()) {
            return new Collection;
        }

        return Student::query()
            ->whereHas('guardians', fn ($q) => $q->whereIn('guardians.id', $guardianIds))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get();
    }

    private function studentOrFail(Request $request): Student
    {
        $students = $this->actingStudents($request);

        if ($students->isEmpty()) {
            abort(403, 'No student profile is linked to your account.');
        }

        $studentId = $request->integer('student_id') ?: null;

        $student = $studentId !== null
            ? $students->firstWhere('id', $studentId)
            : $students->first();

        if ($student === null) {
            abort(404, 'Student not found.');
        }

        return $student;
    }

    private function currentEnrollment(Student $student, ?int $academicYearId): ?StudentEnrollment
    {
        return StudentEnrollment::query()
            ->where('student_id', $student->id)
            ->when($academicYearId !== null, fn ($q) => $q->where('academic_year_id', $academicYearId))
            ->orderByDesc('starts_on')
            ->orderByDesc('id')
            ->first();
    }

    /**
     * @return array{id: int, name: string, admission_no: string, photo_url: ?string}
     */
    private function studentBrief(Student $student): array
    {
        return [
            'id' => $student->id,
            'name' => $student->full_name,
            'admission_no' => $student->admission_no,
            'photo_url' => $student->photo_path
                ? Storage::disk('public')->url($student->photo_path)
                : null,
        ];
    }
}
