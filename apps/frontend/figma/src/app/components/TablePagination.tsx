import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface TablePaginationProps {
  total: number;
  page: number;
  perPage: number;
  onPageChange: (page: number) => void;
  onPerPageChange: (perPage: number) => void;
}

const PER_PAGE_OPTIONS = [10, 20, 50];

export function TablePagination({
  total,
  page,
  perPage,
  onPageChange,
  onPerPageChange,
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  // Build page number array with ellipsis
  const getPages = (): (number | "...")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (page > 3) pages.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      pages.push(i);
    }
    if (page < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  return (
    <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between gap-4">
      {/* Left: info + per-page */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] text-zinc-400">
          {from}–{to} / {total} kayıt
        </span>
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-zinc-400">Sayfa başına</span>
          <select
            value={perPage}
            onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1); }}
            className="text-[11px] text-zinc-600 border border-zinc-200 rounded-md px-1.5 py-0.5 bg-white focus:outline-none focus:border-zinc-400 cursor-pointer"
          >
            {PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Right: page buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {getPages().map((p, i) =>
          p === "..." ? (
            <span key={`ellipsis-${i}`} className="w-7 h-7 flex items-center justify-center text-[11px] text-zinc-400">
              ···
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-medium transition-colors ${
                page === p
                  ? "bg-zinc-900 text-white border border-zinc-900"
                  : "border border-zinc-200 bg-white text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className="w-7 h-7 rounded-lg flex items-center justify-center border border-zinc-200 bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
