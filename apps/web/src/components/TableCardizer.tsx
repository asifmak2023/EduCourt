"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Turns every data table into a thumb-friendly card list on small screens.
 *
 * Tables keep their desktop markup; at runtime we copy the column headers onto
 * each cell as `data-label` and tag the table so `globals.css` can stack rows
 * into cards below the `md` breakpoint. Print documents, voucher slips and
 * explicitly opted-out grids (e.g. the weekly timetable) are left untouched.
 */
const SKIP_SELECTOR = [
  '[data-cardizer="off"]',
  ".report-document",
  ".report-table",
  ".voucher-slip-row",
  ".voucher-slip",
].join(", ");

const WRAP_SELECTOR = [
  '[data-slot="table-scroll-container"]',
  ".overflow-x-auto",
  ".overflow-auto",
].join(", ");

function addClass(element: Element, className: string) {
  if (!element.classList.contains(className)) {
    element.classList.add(className);
  }
}

function setLabel(cell: HTMLElement, label: string) {
  if (label) {
    if (cell.getAttribute("data-label") !== label) {
      cell.setAttribute("data-label", label);
    }
  } else if (cell.hasAttribute("data-label")) {
    cell.removeAttribute("data-label");
  }
}

export function TableCardizer() {
  const pathname = usePathname();

  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;

      document.querySelectorAll<HTMLTableElement>("table").forEach((table) => {
        if (table.closest(SKIP_SELECTOR)) {
          return;
        }

        // Data-entry grids (attendance registers, marks entry) need their
        // controls at full width; keep them as scrollable tables on phones.
        if (table.querySelector("select, input, textarea")) {
          return;
        }

        const headerCells = Array.from(
          table.querySelectorAll<HTMLTableCellElement>("thead tr:last-child > th")
        );
        const labels = headerCells.map((cell) =>
          (cell.textContent ?? "").replace(/\s+/g, " ").trim()
        );

        if (labels.length === 0) {
          return;
        }

        addClass(table, "lw-card-table");

        let ancestor: HTMLElement | null = table.parentElement;
        while (ancestor && ancestor !== document.body) {
          if (ancestor.matches(WRAP_SELECTOR)) {
            addClass(ancestor, "lw-card-table-wrap");
          }
          ancestor = ancestor.parentElement;
        }

        table
          .querySelectorAll<HTMLTableRowElement>("tbody tr, tfoot tr")
          .forEach((row) => {
            addClass(row, "lw-card-row");
            const isBodyRow = row.parentElement?.tagName.toLowerCase() === "tbody";

            Array.from(row.children).forEach((cell, index) => {
              if (!(cell instanceof HTMLElement)) {
                return;
              }

              addClass(cell, "lw-card-cell");

              if (cell.hasAttribute("colspan")) {
                addClass(cell, "lw-card-cell-wide");
                setLabel(cell, "");
                return;
              }

              setLabel(cell, labels[index] ?? "");

              if (isBodyRow && index === 0) {
                addClass(cell, "lw-card-title");
              }
            });
          });
      });
    };

    const schedule = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(apply);
    };

    schedule();

    // Watch for inserted/removed nodes and className changes (React can drop
    // our class when it re-renders a row). All writes above are idempotent, so
    // re-running settles immediately instead of looping.
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => {
      observer.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [pathname]);

  return null;
}

