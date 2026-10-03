"use client";

import { Pagination as HeroPagination } from "@heroui/react";
import { useTranslation } from "@eis/i18n";

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
  const { t } = useTranslation();

  if (total === 0) {
    return null;
  }

  return (
    <HeroPagination
      size="sm"
      className="border-t border-border-secondary px-5 py-4"
    >
      <HeroPagination.Summary>
        {t("admin.list.count", { count: total })}
      </HeroPagination.Summary>
      <HeroPagination.Content>
        <HeroPagination.Item>
          <HeroPagination.Previous
            isDisabled={page <= 1}
            onPress={() => onPage(page - 1)}
          >
            <HeroPagination.PreviousIcon />
            {t("common.previous")}
          </HeroPagination.Previous>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <span className="px-2 text-xs text-muted">
            {t("common.pageOf", { page, lastPage })}
          </span>
        </HeroPagination.Item>
        <HeroPagination.Item>
          <HeroPagination.Next
            isDisabled={page >= lastPage}
            onPress={() => onPage(page + 1)}
          >
            {t("common.next")}
            <HeroPagination.NextIcon />
          </HeroPagination.Next>
        </HeroPagination.Item>
      </HeroPagination.Content>
    </HeroPagination>
  );
}
