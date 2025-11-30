"use client";

import * as React from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
} from "@tanstack/react-table";
import { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type PlayerRow = {
  _id: Id<"players">;
  name: string;
  email?: string;
  number?: number;
  position?: string;
  role?: "player" | "spare" | "spectator";
  isAdmin?: boolean;
  flair?: string;
};

export function RosterDataTable({
  data,
  onRowClick,
}: {
  data: PlayerRow[];
  onRowClick?: (player: PlayerRow) => void;
}) {
  const columns = React.useMemo<ColumnDef<PlayerRow>[]>(
    () => [
      {
        accessorKey: "name",
        header: () => <span>Name</span>,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="font-medium text-foreground">
              {row.original.name}
            </span>
            {row.original.flair && (
              <span className="text-xs text-muted-foreground">
                {row.original.flair}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "number",
        header: () => <span>Number</span>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.number ?? "—"}
          </span>
        ),
      },
      {
        accessorKey: "position",
        header: () => <span>Position</span>,
        cell: ({ row }) => (
          <span className="text-muted-foreground">
            {row.original.position ?? "—"}
          </span>
        ),
      },
    ],
    []
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card shadow">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((hg) => (
            <TableRow key={hg.id}>
              {hg.headers.map((header) => (
                <TableHead
                  key={header.id}
                  onClick={header.column.getToggleSortingHandler?.()}
                  className="cursor-pointer select-none text-muted-foreground"
                >
                  {header.isPlaceholder
                    ? null
                    : flexRender(
                        header.column.columnDef.header,
                        header.getContext()
                      )}
                  {header.column.getIsSorted() === "asc" && " \u2191"}
                  {header.column.getIsSorted() === "desc" && " \u2193"}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 && (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                No results
              </TableCell>
            </TableRow>
          )}
          {table.getRowModel().rows.map((row) => (
            <TableRow
              key={row.id}
              data-state={row.getIsSelected() && "selected"}
              className={`hover:bg-muted/50 ${
                onRowClick ? "cursor-pointer" : ""
              }`}
              onClick={() => onRowClick?.(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <TableCell key={cell.id} className="text-sm text-foreground">
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
