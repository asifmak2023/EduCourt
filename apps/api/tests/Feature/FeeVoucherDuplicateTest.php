<?php

namespace Tests\Feature;

use App\Enums\RoleName;
use App\Enums\VoucherStatus;
use App\Models\FeeCharge;
use App\Models\FeeStructure;
use App\Models\FeeStructureItem;
use App\Models\Student;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\Feature\Concerns\BuildsFeeTenant;
use Tests\TestCase;

class FeeVoucherDuplicateTest extends TestCase
{
    use BuildsFeeTenant;
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        $this->setUpFeeTenant();

        $structure = FeeStructure::create([
            'institution_id' => $this->institution->id,
            'campus_id' => $this->campus->id,
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classRoom->id,
            'name' => 'Class 1 structure',
            'is_active' => true,
        ]);

        FeeStructureItem::create([
            'fee_structure_id' => $structure->id,
            'name' => 'Tuition',
            'billing_kind' => 'monthly',
            'amount' => 12000,
            'is_active' => true,
        ]);
    }

    public function test_single_generation_reuses_the_existing_monthly_voucher(): void
    {
        $first = $this->generate($this->ali, 7, 'Monthly Fee');

        $this->assertSame(1, $first['created']);
        $this->assertSame(0, $first['existing']);

        $second = $this->generate($this->ali, 7, 'Tuition Fee');

        $this->assertSame(0, $second['created']);
        $this->assertSame(1, $second['existing']);
        $this->assertSame($first['charges'][0]['id'], $second['charges'][0]['id']);
        $this->assertStringContainsString('already exists', $second['message']);
        $this->assertSame(1, FeeCharge::query()->where('student_id', $this->ali->id)->count());
    }

    public function test_single_generation_still_creates_a_different_month(): void
    {
        $this->generate($this->ali, 7, 'Monthly Fee');
        $august = $this->generate($this->ali, 8, 'Monthly Fee');

        $this->assertSame(1, $august['created']);
        $this->assertSame(0, $august['existing']);
        $this->assertSame(2, FeeCharge::query()->where('student_id', $this->ali->id)->count());
    }

    public function test_bulk_generation_returns_existing_vouchers_without_voiding_them(): void
    {
        $payload = [
            'academic_year_id' => $this->year->id,
            'class_room_id' => $this->classRoom->id,
            'section_id' => $this->section->id,
            'period_year' => 2026,
            'period_month' => 7,
        ];

        $first = $this->asAdmin()
            ->postJson('/api/v1/fee-counter/generate-bulk', $payload)
            ->assertStatus(201)
            ->assertJsonPath('created', 2)
            ->json();

        $second = $this->asAdmin()
            ->postJson('/api/v1/fee-counter/generate-bulk', $payload)
            ->assertStatus(201)
            ->assertJsonPath('created', 0)
            ->assertJsonPath('skipped', 2)
            ->json();

        $this->assertSame('existing', $second['results'][0]['status']);
        $this->assertSame($first['results'][0]['voucher_no'], $second['results'][0]['voucher_no']);
        $this->assertNotNull($second['results'][0]['charge_id']);

        $this->assertSame(2, FeeCharge::query()->count());
        $this->assertSame(0, FeeCharge::query()->where('status', VoucherStatus::Void->value)->count());
    }

    public function test_single_generation_reuses_a_voucher_created_by_bulk(): void
    {
        $this->asAdmin()
            ->postJson('/api/v1/fee-counter/generate-bulk', [
                'academic_year_id' => $this->year->id,
                'class_room_id' => $this->classRoom->id,
                'section_id' => $this->section->id,
                'period_year' => 2026,
                'period_month' => 9,
            ])
            ->assertStatus(201)
            ->assertJsonPath('created', 2);

        $single = $this->generate($this->ali, 9, 'Monthly Fee');

        $this->assertSame(0, $single['created']);
        $this->assertSame(1, $single['existing']);
        $this->assertSame(2, FeeCharge::query()->count());
    }

    /**
     * @return array<string, mixed>
     */
    private function generate(Student $student, int $month, string $title): array
    {
        return $this->asAdmin()
            ->postJson('/api/v1/fee-counter/generate', [
                'student_id' => $student->id,
                'academic_year_id' => $this->year->id,
                'items' => [[
                    'billing_kind' => 'monthly',
                    'period_year' => 2026,
                    'period_month' => $month,
                    'title' => $title,
                    'amount' => 12000,
                    'due_date' => sprintf('2026-%02d-10', $month),
                ]],
            ])
            ->assertStatus(201)
            ->json();
    }

    private function asAdmin(): static
    {
        return $this->as($this->actor(RoleName::CampusAdmin));
    }
}
