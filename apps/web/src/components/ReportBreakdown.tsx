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
  const columns = rows.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <SectionCard title={title}>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">No data for this selection.</p>
      ) : (
        <Table variant="secondary">
          <Table.ScrollContainer>
            <Table.Content aria-label={title}>
              <Table.Header>
                {Array.from({ length: columns }, (_, index) => (
                  <Table.Column
                    key={index}
                    isRowHeader={index === 0}
                    className={index === 0 ? "sr-only" : "sr-only text-right"}
                  >
                    {index === 0 ? "Label" : index === 1 ? "Value" : `Value ${index}`}
                  </Table.Column>
                ))}
              </Table.Header>
              <Table.Body>
                {rows.map((row, index) => (
                  <Table.Row key={index} id={`row-${index}`}>
                    {Array.from({ length: columns }, (_, cellIndex) => (
                      <Table.Cell
                        key={cellIndex}
                        className={
                          cellIndex === 0
                            ? "capitalize text-foreground"
                            : "text-right text-muted"
                        }
                      >
                        {row[cellIndex] ?? ""}
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
