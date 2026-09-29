"use client";

import { Pagination as HeroPagination } from "@heroui/react";
import { formatNumber } from "@/lib/format";

export function Pagination({
  page,
  lastPage,
  total,
  onPage,
}: {
  page: number;
  lastPage: number;
  total: number;
  onPage: (page: number) => void;
}) {
  if (total === 0) {
    return null;
  }

  return (
    <HeroPagination size="sm">
      <HeroPagination.Summary>
        {formatNumber(total)} record{total === 1 ? "" : "s"}
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPage(page - 1)}
          >
            <HeroPagination.PreviousIcon />
            Previous
          </HeroPagination.Previous>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <span className="px-2 text-xs text-muted">
            Page {page} of {lastPage}
          </span>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={page >= lastPage}
            onPress={() => onPage(page + 1)}
          >
            Next
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
