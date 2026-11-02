<?php

namespace App\Support;

use Carbon\CarbonImmutable;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Resolves the requested reporting window (daily, weekly, monthly, yearly or
 * overall) into concrete date bounds and chart buckets.
 *
 * The bucket expression is deliberately MySQL-native so one grouped query can
 * produce a full time series; gaps are filled in PHP from the same bounds so a
 * quiet day still shows as a zero bar rather than disappearing from the chart.
 */
class ReportPeriod
{
    public const GRANULARITIES = ['day', 'week', 'month', 'year', 'all'];

    public function __construct(
        public readonly string $granularity,
        public readonly ?CarbonImmutable $from,
        public readonly ?CarbonImmutable $to,
    ) {}

    /**
     * @param  array<string, mixed>  $filters
     */
    public static function fromFilters(array $filters): self
    {
        $granularity = (string) ($filters['granularity'] ?? 'all');

        if (! in_array($granularity, self::GRANULARITIES, true)) {
            throw new InvalidArgumentException('Unsupported report granularity.');
        }

        $today = CarbonImmutable::today();
        $from = isset($filters['from']) && $filters['from'] !== null
            ? CarbonImmutable::parse((string) $filters['from'])->startOfDay()
            : null;
        $to = isset($filters['to']) && $filters['to'] !== null
            ? CarbonImmutable::parse((string) $filters['to'])->startOfDay()
            : null;

        if ($granularity === 'all') {
            if ($from !== null && $to !== null && $from->greaterThan($to)) {
                [$from, $to] = [$to, $from];
            }

            return new self($granularity, $from, $to?->endOfDay());
        }

        if ($from === null && $to === null) {
            [$from, $to] = match ($granularity) {
                'day' => [$today, $today],
                'week' => [$today->startOfWeek(CarbonImmutable::MONDAY), $today->endOfWeek(CarbonImmutable::SUNDAY)],
                'month' => [$today->startOfMonth(), $today->endOfMonth()],
                'year' => [$today->startOfYear(), $today->endOfYear()],
            };
        } elseif ($from === null) {
            $from = match ($granularity) {
                'day' => $to,
                'week' => $to->startOfWeek(CarbonImmutable::MONDAY),
                'month' => $to->startOfMonth(),
                'year' => $to->startOfYear(),
            };
        } elseif ($to === null) {
            $to = match ($granularity) {
                'day' => $from,
                'week' => $from->endOfWeek(CarbonImmutable::SUNDAY),
                'month' => $from->endOfMonth(),
                'year' => $from->endOfYear(),
            };
        }

        if ($from->greaterThan($to)) {
            [$from, $to] = [$to, $from];
        }

        return new self($granularity, $from, $to);
    }

    /**
     * SQL expression that truncates a date column to the bucket start.
     */
    public function bucketExpression(string $column): string
    {
        return match ($this->granularity) {
            'day' => "DATE_FORMAT({$column}, '%Y-%m-%d')",
            'week' => "DATE_FORMAT(DATE_SUB({$column}, INTERVAL WEEKDAY({$column}) DAY), '%Y-%m-%d')",
            'month' => "DATE_FORMAT({$column}, '%Y-%m-01')",
            default => "DATE_FORMAT({$column}, '%Y-01-01')",
        };
    }

    /**
     * Bucket key for a single date, matching bucketExpression().
     */
    public function keyFor(CarbonImmutable $date): string
    {
        return match ($this->granularity) {
            'day' => $date->toDateString(),
            'week' => $date->startOfWeek(CarbonImmutable::MONDAY)->toDateString(),
            'month' => $date->startOfMonth()->toDateString(),
            default => $date->startOfYear()->toDateString(),
        };
    }

    public function labelForKey(string $key): string
    {
        $date = CarbonImmutable::parse($key);

        return match ($this->granularity) {
            'day' => $date->format('d M'),
            'week' => $date->format('d M'),
            'month' => $date->format('M Y'),
            default => $date->format('Y'),
        };
    }

    /**
     * Every bucket between the bounds, in order, so charts include quiet
     * periods. When only one bound is known the series is bounded by data.
     *
     * @return array<int, array{key: string, label: string}>
     */
    public function buckets(): array
    {
        if ($this->from === null || $this->to === null) {
            return [];
        }

        $buckets = [];
        $cursor = match ($this->granularity) {
            'day' => $this->from->startOfDay(),
            'week' => $this->from->startOfWeek(CarbonImmutable::MONDAY),
            'month' => $this->from->startOfMonth(),
            default => $this->from->startOfYear(),
        };

        $guard = 0;

        while ($cursor->lessThanOrEqualTo($this->to) && $guard < 4000) {
            $key = $cursor->toDateString();
            $buckets[] = ['key' => $key, 'label' => $this->labelForKey($key)];

            $cursor = match ($this->granularity) {
                'day' => $cursor->addDay(),
                'week' => $cursor->addWeek(),
                'month' => $cursor->addMonth(),
                default => $cursor->addYear(),
            };
            $guard++;
        }

        return $buckets;
    }

    /**
     * Merge grouped rows into the ordered bucket skeleton, filling gaps with
     * the supplied zero row.
     *
     * @param  array<int, array{key: string, label: string}>  $buckets
     * @param  iterable<int, array{key: string, label: string}>  $rows
     * @param  array<string, mixed>  $zero
     * @return array<int, array<string, mixed>>
     */
    public function fill(array $buckets, iterable $rows, array $zero = []): array
    {
        $indexed = [];

        foreach ($rows as $row) {
            $indexed[$row['key']] = $row;
        }

        if ($buckets === []) {
            $buckets = array_map(
                fn (array $row) => ['key' => $row['key'], 'label' => $row['label']],
                array_values($indexed),
            );
        }

        $series = [];

        foreach ($buckets as $bucket) {
            $series[] = array_merge(
                ['key' => $bucket['key'], 'label' => $bucket['label']],
                $zero,
                $indexed[$bucket['key']] ?? [],
            );
        }

        return $series;
    }

    /**
     * The bucket expression aliased as `bucket`, ready for groupBy.
     */
    public function selectBucket(string $column): \Illuminate\Contracts\Database\Query\Expression
    {
        return DB::raw($this->bucketExpression($column).' as bucket');
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        return [
            'granularity' => $this->granularity,
            'from' => $this->from?->toDateString(),
            'to' => $this->to?->toDateString(),
            'label' => $this->label(),
        ];
    }

    public function label(): string
    {
        if ($this->granularity === 'all' && $this->from === null && $this->to === null) {
            return 'All time';
        }

        if ($this->from === null || $this->to === null) {
            return 'All time';
        }

        return match ($this->granularity) {
            'day' => $this->from->format('d M Y'),
            'week' => $this->from->format('d M').' - '.$this->to->format('d M Y'),
            'month' => $this->from->format('M Y'),
            'year' => $this->from->format('Y'),
            default => $this->from->format('d M Y').' - '.$this->to->format('d M Y'),
        };
    }
}
