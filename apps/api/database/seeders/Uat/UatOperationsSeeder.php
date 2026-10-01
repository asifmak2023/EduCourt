<?php

namespace Database\Seeders\Uat;

use App\Enums\BookIssueStatus;
use App\Enums\CanteenPaymentMethod;
use App\Enums\CanteenSaleStatus;
use App\Enums\EquipmentCondition;
use App\Enums\EquipmentMovementType;
use App\Enums\FixtureOutcome;
use App\Enums\FixtureStatus;
use App\Enums\HygieneStatus;
use App\Enums\HostelAllocationStatus;
use App\Enums\HostelRoomType;
use App\Enums\HostelType;
use App\Enums\InventoryMovementType;
use App\Enums\LabBookingStatus;
use App\Enums\LabEquipmentCondition;
use App\Enums\LabType;
use App\Enums\OutpassStatus;
use App\Enums\SportCategory;
use App\Enums\StockEntryType;
use App\Enums\TeamMemberStatus;
use App\Enums\TransitStatus;
use App\Enums\TransportDirection;
use App\Enums\VehicleType;
use App\Models\Book;
use App\Models\BookIssue;
use App\Models\CanteenHygieneCheck;
use App\Models\CanteenItem;
use App\Models\CanteenSale;
use App\Models\CanteenSaleItem;
use App\Models\CanteenStockEntry;
use App\Models\CanteenSupplier;
use App\Models\Hostel;
use App\Models\HostelAllocation;
use App\Models\HostelOutpass;
use App\Models\HostelRoom;
use App\Models\InventoryCategory;
use App\Models\InventoryItem;
use App\Models\InventoryStockMovement;
use App\Models\Lab;
use App\Models\LabBooking;
use App\Models\LabEquipment;
use App\Models\Sport;
use App\Models\SportAchievement;
use App\Models\SportEquipment;
use App\Models\SportEquipmentMovement;
use App\Models\SportFixture;
use App\Models\SportTeam;
use App\Models\SportTeamMember;
use App\Models\SportTrainingSession;
use App\Models\TransportAllocation;
use App\Models\TransportRoute;
use App\Models\TransportRouteStop;
use App\Models\Vehicle;

/**
 * Seeds the operational domains: library, inventory/store, laboratories,
 * transport, hostel and canteen.
 */
class UatOperationsSeeder extends UatSeederBase
{
    public function seed(UatCampusContext $ctx): void
    {
        mt_srand((int) $ctx->campus->id + 8000);

        $this->library($ctx);
        $this->inventory($ctx);
        $this->labs($ctx);
        $this->transport($ctx);
        $this->hostel($ctx);
        $this->canteen($ctx);
        $this->sports($ctx);

        $this->command?->info('UAT:   '.$ctx->campusCode().' - library, inventory, labs, transport, hostel, canteen, sports');
    }

    protected function library(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);
        $titles = [
            ['Physics for Class XI', 'H. C. Verma', 'Science'],
            ['Chemistry Fundamentals', 'P. Bahadur', 'Science'],
            ['Biology: A Modern Approach', 'S. M. Ali', 'Science'],
            ['Mathematics Made Easy', 'M. Ashraf', 'Mathematics'],
            ['English Grammar in Use', 'Raymond Murphy', 'Language'],
            ['Urdu Adab Kishti', 'Ibn-e-Insha', 'Language'],
            ['Islamic Studies', 'Dr. Israr Ahmed', 'Religion'],
            ['Pakistan Studies', 'K. K. Aziz', 'Social Studies'],
            ['Introduction to Programming', 'A. Sattar', 'Computers'],
            ['Data Structures Simplified', 'N. A. Khan', 'Computers'],
            ['Accounting Principles', 'F. R. Shaikh', 'Commerce'],
            ['Business Management', 'Nadeem Butt', 'Commerce'],
        ];

        $books = [];
        foreach ($titles as $i => [$title, $author, $category]) {
            $total = 5 + ($i % 4);
            $books[] = $this->first(Book::class, [
                'campus_id' => $ctx->campus->id,
                'title' => $title,
            ], $tenant + [
                'author' => $author,
                'isbn' => '978-'.sprintf('%010d', abs(crc32($title.$ctx->campusCode()))),
                'publisher' => 'National Book Foundation',
                'category' => $category,
                'total_copies' => $total,
                'available_copies' => max(0, $total - 1),
                'shelf' => 'S-'.sprintf('%02d', $i + 1),
                'price' => 650 + $i * 40,
                'is_active' => true,
            ]);
        }

        foreach ($ctx->students as $index => $student) {
            if ($index % 4 !== 0) {
                continue;
            }

            $book = $books[$index % count($books)];
            $issuedOn = $this->day('2026-09-01', $index % 20);
            $returned = $index % 12 === 0;

            BookIssue::firstOrCreate(
                ['book_id' => $book->id, 'student_id' => $student->id, 'issued_on' => $issuedOn],
                $tenant + [
                    'member_type' => 'student',
                    'due_on' => $this->day($issuedOn, 14),
                    'returned_on' => $returned ? $this->day($issuedOn, 10) : null,
                    'fine_amount' => $returned ? 0 : ($index % 24 === 0 ? 200 : 0),
                    'status' => $returned ? BookIssueStatus::Returned : ($index % 24 === 0 ? BookIssueStatus::Overdue : BookIssueStatus::Issued),
                    'issued_by' => $ctx->role('librarian')?->id,
                ]
            );
        }
    }

    protected function inventory(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $categories = [
            'STN' => 'Stationery',
            'FRN' => 'Furniture',
            'ELC' => 'Electronics',
            'SPT' => 'Sports Goods',
            'CLN' => 'Cleaning Supplies',
        ];
        $catModels = [];
        foreach ($categories as $code => $name) {
            $catModels[$code] = $this->first(InventoryCategory::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + ['name' => $name, 'description' => $name.' inventory']);
        }

        $items = [
            ['STN-001', 'A4 Paper Ream', 'STN', 'ream', 950, 200],
            ['STN-002', 'Whiteboard Markers (Box)', 'STN', 'box', 450, 100],
            ['STN-003', 'Notebooks (Pack)', 'STN', 'pack', 1200, 300],
            ['FRN-001', 'Student Desk', 'FRN', 'unit', 8500, 40],
            ['FRN-002', 'Teacher Chair', 'FRN', 'unit', 6500, 20],
            ['ELC-001', 'Epson Projector', 'ELC', 'unit', 85000, 5],
            ['ELC-002', 'Desktop Computer', 'ELC', 'unit', 95000, 8],
            ['ELC-003', 'WiFi Router', 'ELC', 'unit', 12000, 10],
            ['SPT-001', 'Cricket Bat', 'SPT', 'unit', 5500, 15],
            ['SPT-002', 'Football', 'SPT', 'unit', 3500, 20],
            ['SPT-003', 'Badminton Racket', 'SPT', 'unit', 2500, 25],
            ['CLN-001', 'Floor Cleaner (5L)', 'CLN', 'bottle', 850, 60],
            ['CLN-002', 'Disinfectant Spray', 'CLN', 'bottle', 600, 80],
            ['CLN-003', 'Trash Bags (Roll)', 'CLN', 'roll', 300, 150],
        ];

        foreach ($items as $i => [$code, $name, $cat, $unit, $cost, $qty]) {
            $item = $this->first(InventoryItem::class, [
                'campus_id' => $ctx->campus->id,
                'code' => $code,
            ], $tenant + [
                'inventory_category_id' => $catModels[$cat]->id,
                'name' => $name,
                'unit' => $unit,
                'unit_cost' => $cost,
                'quantity' => $qty,
                'reorder_level' => max(5, (int) ($qty * 0.2)),
                'is_active' => true,
            ]);

            InventoryStockMovement::firstOrCreate(
                ['inventory_item_id' => $item->id, 'type' => InventoryMovementType::Purchase->value, 'moved_on' => '2026-08-01'],
                $tenant + [
                    'quantity' => $qty,
                    'unit_cost' => $cost,
                    'reference' => 'GRN-'.sprintf('%04d', $i + 1),
                    'notes' => 'Opening stock purchase.',
                    'created_by' => $ctx->role('store_incharge')?->id,
                ]
            );
        }
    }

    protected function labs(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $labs = [
            ['Physics Lab', 'LAB-PHY', LabType::Science, 'Block A - First Floor', 40],
            ['Chemistry Lab', 'LAB-CHE', LabType::Science, 'Block A - First Floor', 40],
            ['Biology Lab', 'LAB-BIO', LabType::Science, 'Block A - Second Floor', 40],
            ['Computer Lab', 'LAB-COMP', LabType::Computer, 'Block B - First Floor', 45],
        ];

        foreach ($labs as $i => [$name, $code, $type, $location, $capacity]) {
            $lab = $this->first(Lab::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'type' => $type,
                'location' => $location,
                'capacity' => $capacity,
                'incharge_user_id' => $ctx->teacher($i)?->id,
                'is_active' => true,
            ]);

            $equipment = match ($code) {
                'LAB-COMP' => [['Desktop PC', 25, LabEquipmentCondition::Working], ['Projector', 1, LabEquipmentCondition::Working], ['Printer', 2, LabEquipmentCondition::Working]],
                default => [['Microscope', 15, LabEquipmentCondition::Working], ['Apparatus Kit', 20, LabEquipmentCondition::Working], ['Safety Goggles', 40, LabEquipmentCondition::Working], ['Digital Balance', 3, LabEquipmentCondition::UnderRepair]],
            };

            foreach ($equipment as $j => [$eqName, $qty, $condition]) {
                LabEquipment::firstOrCreate(
                    ['lab_id' => $lab->id, 'name' => $eqName],
                    $tenant + [
                        'code' => $code.'-'.sprintf('%02d', $j + 1),
                        'quantity' => $qty,
                        'condition' => $condition,
                        'purchased_on' => '2024-08-01',
                    ]
                );
            }

            foreach ([0, 1, 2] as $k) {
                $class = array_values($ctx->classes)[($i + $k) % count($ctx->classes)];
                LabBooking::firstOrCreate(
                    ['lab_id' => $lab->id, 'class_room_id' => $class->id, 'session_date' => $this->day('2026-10-01', $k)],
                    $tenant + [
                        'teacher_user_id' => $ctx->teacher($i + $k)?->id,
                        'start_time' => '09:00:00',
                        'end_time' => '10:30:00',
                        'purpose' => 'Practical session for '.$class->name,
                        'status' => LabBookingStatus::Scheduled,
                    ]
                );
            }
        }
    }

    protected function transport(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $vehicles = [
            ['Bus 1', 'LEB-1234', VehicleType::Bus, 50, 'Hino'],
            ['Bus 2', 'LEB-5678', VehicleType::Bus, 50, 'Hino'],
            ['Coaster 1', 'LEC-1122', VehicleType::Coaster, 30, 'Toyota'],
            ['Van 1', 'LED-3344', VehicleType::Van, 15, 'Suzuki'],
        ];
        $vehicleModels = [];
        foreach ($vehicles as $i => [$name, $reg, $type, $capacity, $model]) {
            $vehicleModels[] = $this->first(Vehicle::class, ['campus_id' => $ctx->campus->id, 'registration_no' => $reg], $tenant + [
                'name' => $name,
                'type' => $type,
                'capacity' => $capacity,
                'model' => $model,
                'driver_name' => $this->pick(['Rashid Ali', 'Nadeem Akhtar', 'Waqar Younis', 'Saleem Iqbal']),
                'driver_phone' => $this->phone($ctx->campus, 12000 + $i),
                'conductor_name' => $this->pick(['Imran Shah', 'Bilal Ahmed']),
                'is_active' => true,
            ]);
        }

        $routes = [
            ['Route A - City Centre', 'RA', 'Main Campus', 'City Centre', 14.5, 4500],
            ['Route B - North Suburbs', 'RB', 'Main Campus', 'North Suburbs', 22.0, 5500],
            ['Route C - East Side', 'RC', 'Main Campus', 'East Side', 18.0, 5000],
            ['Route D - West Side', 'RD', 'Main Campus', 'West Side', 16.5, 4800],
        ];

        $routeModels = [];
        foreach ($routes as $i => [$name, $code, $start, $end, $distance, $fare]) {
            $route = $this->first(TransportRoute::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'start_point' => $start,
                'end_point' => $end,
                'distance_km' => $distance,
                'fare' => $fare,
                'vehicle_id' => $vehicleModels[$i % count($vehicleModels)]->id,
                'is_active' => true,
            ]);
            $routeModels[] = $route;

            for ($s = 1; $s <= 4; $s++) {
                TransportRouteStop::firstOrCreate(
                    ['transport_route_id' => $route->id, 'sequence' => $s],
                    $tenant + [
                        'name' => $end.' Stop '.$s,
                        'pickup_time' => sprintf('06:%02d:00', 30 + $s * 5),
                        'drop_time' => sprintf('14:%02d:00', 30 + $s * 5),
                        'fare' => $fare,
                    ]
                );
            }
        }

        foreach ($ctx->students as $index => $student) {
            if ($index % 6 !== 0) {
                continue;
            }

            $route = $routeModels[$index % count($routeModels)];
            $stop = TransportRouteStop::query()->where('transport_route_id', $route->id)->orderBy('sequence')->first();

            TransportAllocation::firstOrCreate(
                ['student_id' => $student->id, 'start_date' => '2026-04-01'],
                $tenant + [
                    'transport_route_id' => $route->id,
                    'transport_route_stop_id' => $stop?->id,
                    'vehicle_id' => $route->vehicle_id,
                    'direction' => TransportDirection::Both,
                    'fare' => $route->fare,
                    'status' => TransitStatus::Active,
                ]
            );
        }
    }

    protected function hostel(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $hostels = [
            ['Boys Hostel', 'HST-B', HostelType::Boys, 120],
            ['Girls Hostel', 'HST-G', HostelType::Girls, 100],
        ];

        $roomModels = [];
        foreach ($hostels as $i => [$name, $code, $type, $capacity]) {
            $hostel = $this->first(Hostel::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'type' => $type,
                'warden_user_id' => $ctx->role('transport_hostel_incharge')?->id,
                'warden_name' => $this->pick(['Mr. Aslam Khan', 'Ms. Rukhsana Bibi']),
                'warden_phone' => $this->phone($ctx->campus, 13000 + $i),
                'address' => 'Campus Housing Block, '.$ctx->campus->name,
                'capacity' => $capacity,
                'is_active' => true,
            ]);

            for ($r = 1; $r <= 8; $r++) {
                $roomModels[] = $this->first(HostelRoom::class, [
                    'hostel_id' => $hostel->id,
                    'room_no' => sprintf('%d-%02d', $i + 1, $r),
                ], $tenant + [
                    'floor' => (string) intdiv($r - 1, 4),
                    'type' => $r % 3 === 0 ? HostelRoomType::Triple : HostelRoomType::Double,
                    'capacity' => $r % 3 === 0 ? 3 : 2,
                    'occupied' => 0,
                    'monthly_fee' => 12000,
                    'is_active' => true,
                ]);
            }
        }

        $allocated = 0;
        foreach ($ctx->students as $index => $student) {
            if ($index % 5 !== 0 || $allocated >= 24) {
                continue;
            }

            $room = $roomModels[$allocated % count($roomModels)];
            $allocation = $this->first(HostelAllocation::class, [
                'student_id' => $student->id,
                'allocated_on' => '2026-04-05',
            ], $tenant + [
                'hostel_id' => $room->hostel_id,
                'hostel_room_id' => $room->id,
                'bed_no' => 'B'.(($allocated % 3) + 1),
                'monthly_fee' => 12000,
                'status' => HostelAllocationStatus::Allocated,
            ]);

            $room->increment('occupied');
            $allocated++;

            if ($index % 15 === 0) {
                HostelOutpass::firstOrCreate(
                    ['student_id' => $student->id, 'from_datetime' => '2026-10-05 08:00:00'],
                    $tenant + [
                        'hostel_allocation_id' => $allocation->id,
                        'to_datetime' => '2026-10-06 20:00:00',
                        'reason' => 'Family visit at home.',
                        'status' => OutpassStatus::Approved,
                        'approved_by' => $ctx->role('transport_hostel_incharge')?->id,
                        'approved_at' => now(),
                    ]
                );
            }
        }
    }

    protected function canteen(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $suppliers = ['Fresh Foods Distributors', 'Metro Cash & Carry', 'Local Bakery House'];
        foreach ($suppliers as $i => $name) {
            CanteenSupplier::firstOrCreate(
                ['campus_id' => $ctx->campus->id, 'name' => $name],
                $tenant + [
                    'contact_person' => $this->pick(['Ahmed Raza', 'Sara Butt', 'Kashif Ali']),
                    'phone' => $this->phone($ctx->campus, 14000 + $i),
                    'email' => 'supplier'.$i.'.'.strtolower($ctx->campus->code).'@'.UatFoundationSeeder::EMAIL_DOMAIN,
                    'address' => $this->street($i).', '.$this->city($i),
                    'is_active' => true,
                ]
            );
        }

        $items = [
            ['Chicken Patties', 'CI-001', 'Bakery', 'piece', 120, 80],
            ['Samosa', 'CI-002', 'Snacks', 'piece', 40, 25],
            ['Cold Drink 500ml', 'CI-003', 'Beverages', 'bottle', 100, 65],
            ['Mineral Water 1.5L', 'CI-004', 'Beverages', 'bottle', 90, 60],
            ['Chocolate Bar', 'CI-005', 'Confectionery', 'piece', 150, 100],
            ['Fruit Juice', 'CI-006', 'Beverages', 'pack', 80, 55],
            ['Sandwich', 'CI-007', 'Snacks', 'piece', 180, 120],
            ['Biryani Plate', 'CI-008', 'Meals', 'plate', 350, 240],
        ];

        $itemModels = [];
        foreach ($items as $i => [$name, $code, $category, $unit, $price, $cost]) {
            $item = $this->first(CanteenItem::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'category' => $category,
                'unit' => $unit,
                'price' => $price,
                'cost_price' => $cost,
                'track_stock' => true,
                'stock_quantity' => 200,
                'reorder_level' => 50,
                'is_active' => true,
            ]);
            $itemModels[] = $item;

            CanteenStockEntry::firstOrCreate(
                ['canteen_item_id' => $item->id, 'entry_date' => '2026-08-01', 'type' => StockEntryType::Purchase->value],
                $tenant + [
                    'quantity' => 200,
                    'unit_cost' => $cost,
                    'total_cost' => $cost * 200,
                    'balance_after' => 200,
                    'recorded_by' => $ctx->role('canteen_manager')?->id,
                ]
            );
        }

        for ($i = 1; $i <= 40; $i++) {
            $buyer = $ctx->students[($i * 3) % count($ctx->students)];
            $item = $itemModels[$i % count($itemModels)];
            $qty = 1 + ($i % 3);
            $lineTotal = $this->decimal($item->price * $qty);
            $payWithWallet = $i % 3 === 0;

            $sale = $this->first(CanteenSale::class, [
                'campus_id' => $ctx->campus->id,
                'bill_no' => 'CS-'.$ctx->campusCode().'-'.sprintf('%05d', $i),
            ], $tenant + [
                'student_id' => $buyer->id,
                'wallet_id' => $payWithWallet ? ($ctx->wallets[$buyer->id]->id ?? null) : null,
                'customer_name' => $buyer->first_name.' '.$buyer->last_name,
                'payment_method' => $payWithWallet ? CanteenPaymentMethod::Wallet : CanteenPaymentMethod::Cash,
                'subtotal' => $lineTotal,
                'discount' => 0,
                'total' => $lineTotal,
                'cost_total' => $this->decimal($item->cost_price * $qty),
                'status' => CanteenSaleStatus::Completed,
                'sold_on' => $this->day('2026-09-01', $i % 20),
                'served_by' => $ctx->role('canteen_manager')?->id,
            ]);

            CanteenSaleItem::firstOrCreate(
                ['canteen_sale_id' => $sale->id, 'canteen_item_id' => $item->id],
                $tenant + [
                    'item_name' => $item->name,
                    'quantity' => $qty,
                    'unit_price' => $item->price,
                    'unit_cost' => $item->cost_price,
                    'line_total' => $lineTotal,
                ]
            );
        }

        foreach ([0, 1, 2] as $i) {
            CanteenHygieneCheck::firstOrCreate(
                ['campus_id' => $ctx->campus->id, 'check_date' => $this->day('2026-10-01', $i), 'area' => 'Kitchen'],
                $tenant + [
                    'status' => $i === 1 ? HygieneStatus::NeedsAttention : HygieneStatus::Pass,
                    'score' => $i === 1 ? 72 : 92,
                    'remarks' => $i === 1 ? 'Deep cleaning required.' : 'Area clean and compliant.',
                    'checked_by' => $ctx->role('canteen_manager')?->id,
                ]
            );
        }
    }

    protected function sports(UatCampusContext $ctx): void
    {
        $tenant = $this->tenant($ctx->campus);

        $sports = [
            ['Cricket', 'CRK', SportCategory::Outdoor, 250000],
            ['Football', 'FBL', SportCategory::Outdoor, 180000],
            ['Badminton', 'BDM', SportCategory::Indoor, 90000],
            ['Athletics', 'ATH', SportCategory::Athletics, 120000],
        ];

        foreach ($sports as $i => [$name, $code, $category, $budget]) {
            $sport = $this->first(Sport::class, ['campus_id' => $ctx->campus->id, 'code' => $code], $tenant + [
                'name' => $name,
                'category' => $category,
                'season' => 'Winter',
                'coach_user_id' => $ctx->role('sports_director')?->id,
                'min_attendance_percent' => 75,
                'budget' => $budget,
                'is_active' => true,
                'rules' => 'Standard inter-campus rules apply.',
                'description' => $name.' program for all eligible students.',
            ]);

            $team = $this->first(SportTeam::class, ['sport_id' => $sport->id, 'name' => $ctx->campus->name.' '.$name.' Team'], $tenant + [
                'age_group' => 'Under-16',
                'gender' => 'mixed',
                'coach_user_id' => $ctx->role('sports_director')?->id,
                'is_active' => true,
            ]);

            foreach (array_slice($ctx->students, $i * 10, 12) as $member) {
                SportTeamMember::firstOrCreate(
                    ['sport_team_id' => $team->id, 'student_id' => $member->id],
                    $tenant + [
                        'position' => $this->pick(['Captain', 'Vice Captain', 'Player', 'Reserve']),
                        'jersey_no' => (string) $this->randInt(1, 99),
                        'joined_on' => '2026-08-01',
                        'status' => TeamMemberStatus::Active,
                    ]
                );
            }

            $equipment = [
                ['Ball / Shuttle', 'EQ-'.$code.'-1', 20, 1500],
                ['Practice Kit', 'EQ-'.$code.'-2', 10, 8000],
                ['Jerseys', 'EQ-'.$code.'-3', 30, 2500],
            ];
            foreach ($equipment as $j => [$eqName, $eqCode, $qty, $cost]) {
                $eq = $this->first(SportEquipment::class, ['sport_id' => $sport->id, 'code' => $eqCode], $tenant + [
                    'name' => $eqName,
                    'unit' => 'unit',
                    'quantity' => $qty,
                    'available_quantity' => $qty - 2,
                    'unit_cost' => $cost,
                    'condition' => EquipmentCondition::Good,
                    'is_active' => true,
                ]);

                SportEquipmentMovement::firstOrCreate(
                    ['sport_equipment_id' => $eq->id, 'movement_date' => '2026-08-05', 'type' => EquipmentMovementType::Purchase->value],
                    $tenant + [
                        'quantity' => $qty,
                        'balance_after' => $qty,
                        'remarks' => 'Opening sports equipment purchase.',
                        'created_by' => $ctx->role('sports_director')?->id,
                    ]
                );
            }

            foreach ([0, 1] as $k) {
                SportFixture::firstOrCreate(
                    ['sport_team_id' => $team->id, 'fixture_date' => $this->day('2026-11-01', $k * 14), 'opponent' => 'City Rivals '.($k + 1)],
                    $tenant + [
                        'sport_id' => $sport->id,
                        'home_away' => $k === 0 ? 'home' : 'away',
                        'venue' => $k === 0 ? 'Main Campus Ground' : 'Opponent Ground',
                        'start_time' => '15:00:00',
                        'status' => $k === 0 ? FixtureStatus::Completed : FixtureStatus::Scheduled,
                        'our_score' => $k === 0 ? 3 : null,
                        'opponent_score' => $k === 0 ? 1 : null,
                        'outcome' => $k === 0 ? FixtureOutcome::Win : null,
                        'created_by' => $ctx->role('sports_director')?->id,
                    ]
                );

                SportTrainingSession::firstOrCreate(
                    ['sport_team_id' => $team->id, 'session_date' => $this->day('2026-10-05', $k * 7)],
                    $tenant + [
                        'title' => $name.' Training',
                        'start_time' => '16:00:00',
                        'end_time' => '17:30:00',
                        'venue' => 'Main Campus Ground',
                        'focus' => 'Fitness and drills.',
                        'created_by' => $ctx->role('sports_director')?->id,
                    ]
                );
            }

            foreach (array_slice($ctx->students, $i * 10, 2) as $medalist) {
                SportAchievement::firstOrCreate(
                    ['sport_id' => $sport->id, 'student_id' => $medalist->id, 'title' => 'Inter-Campus Championship'],
                    $tenant + [
                        'level' => 'district',
                        'position' => $this->pick(['Gold', 'Silver', 'Bronze']),
                        'achieved_on' => '2026-06-15',
                        'description' => 'Won a medal at the district championship.',
                    ]
                );
            }
        }
    }
}
