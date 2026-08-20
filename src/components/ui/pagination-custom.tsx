import React from "react";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface PaginationProps {
  page: number;
  limit: number;
  totalData: number;
  totalPage: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
  limitOptions?: number[];
}

export function Pagination({
  page,
  limit,
  totalData,
  totalPage,
  onPageChange,
  onLimitChange,
  limitOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const safeTotalPage = Math.max(1, totalPage);

  // Compute pages with ellipsis
  const getPageNumbers = (): (number | "ellipsis")[] => {
    const pages: (number | "ellipsis")[] = [];

    if (safeTotalPage <= 7) {
      for (let i = 1; i <= safeTotalPage; i++) {
        pages.push(i);
      }
    } else {
      pages.push(1);

      if (page > 3) {
        pages.push("ellipsis");
      }

      const start = Math.max(2, page - 1);
      const end = Math.min(safeTotalPage - 1, page + 1);

      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) {
          pages.push(i);
        }
      }

      if (page < safeTotalPage - 2) {
        pages.push("ellipsis");
      }

      if (!pages.includes(safeTotalPage)) {
        pages.push(safeTotalPage);
      }
    }

    return pages;
  };

  const startEntry = totalData > 0 ? (page - 1) * limit + 1 : 0;
  const endEntry = Math.min(page * limit, totalData);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
      {/* Left side: Rows per page & entries count */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            Baris per halaman
          </span>
          <Select
            value={String(limit)}
            onValueChange={(v) => onLimitChange(Number(v))}
          >
            <SelectTrigger className="h-8 w-[70px] text-xs">
              <SelectValue placeholder={String(limit)} />
            </SelectTrigger>
            <SelectContent>
              {limitOptions.map((opt) => (
                <SelectItem key={opt} value={String(opt)}>
                  {opt}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          Menampilkan {startEntry}–{endEntry} dari {totalData} data
        </span>
      </div>

      {/* Right side: Page numbers & Prev/Next buttons */}
      <div className="flex items-center gap-1 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs flex items-center gap-1"
          disabled={page <= 1}
          onClick={() => onPageChange(Math.max(1, page - 1))}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="hidden sm:inline">Prev</span>
        </Button>

        {getPageNumbers().map((p, idx) => {
          if (p === "ellipsis") {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="h-8 w-8 flex items-center justify-center text-xs text-muted-foreground"
              >
                <MoreHorizontal className="h-4 w-4" />
              </span>
            );
          }

          const isCurrent = p === page;
          return (
            <Button
              key={p}
              variant={isCurrent ? "default" : "outline"}
              size="sm"
              className="h-8 w-8 p-0 text-xs font-medium"
              onClick={() => onPageChange(p)}
            >
              {p}
            </Button>
          );
        })}

        <Button
          variant="outline"
          size="sm"
          className="h-8 px-2.5 text-xs flex items-center gap-1"
          disabled={page >= safeTotalPage}
          onClick={() => onPageChange(page + 1)}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
