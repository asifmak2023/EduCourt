"use client";

import { Table } from "@heroui/react";
import { SectionCard } from "@/components/ui";

export function BreakdownCard({
  title,
  rows,
}: {
  title: string;
  rows: (string | number)[][];
}) {
  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No data for this selection.</p>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label={title}>
              <Table.Body>
                {rows.map((row, index) => (
                  <Table.Row key={index} id={index}>
                    {row.map((cell, cellIndex) => (
                      <Table.Cell
                        key={cellIndex}
                        className={
                          cellIndex === 0
                            ? "capitalize text-foreground"
                            : "text-right text-muted"
                        }
                      >
                        {cell}
                      </Table.Cell>
                    ))}
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      )}
    </SectionCard>
  );
}
