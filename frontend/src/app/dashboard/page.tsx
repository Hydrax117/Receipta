'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { apiUrl } from '@/lib/api';

// ---------------------------------------------------------------------------
// Auth-error helper
// ---------------------------------------------------------------------------

/**
 * Call after receiving a 401 response.
 * Reads the JSON body to distinguish TOKEN_EXPIRED (redirect with notice)
 * from other auth failures (plain login redirect).
 */
async function handleAuthError(res: Response): Promise<void> {
  try {
    const body = await res.json();
    if (body?.code === 'TOKEN_EXPIRED') {
      window.location.href = '/login?reason=session_expired';
      return;
    }
  } catch {
    // non-JSON body — fall through to plain redirect
  }
  window.location.href = '/login';
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Stats {
  totalReceipts: number;
  confirmedReceipts: number;
  pendingReceipts: number;
  failedReceipts: number;
  totalVolume: string;
}

interface Receipt {
  id: string;
  amount: string;
  status: string;
  timestamp: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SectionError {
  stats: string | null;
  receipts: string | null;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

// ---------------------------------------------------------------------------
// Small reusable components
// ---------------------------------------------------------------------------

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
      <span>{message}</span>
      <button
        onClick={onRetry}
        className="shrink-0 px-4 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

function SectionErrorCard({
  section,
  message,
  onRetry,
}: {
  section: string;
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
      <p className="text-red-700 text-sm mb-3">
        {section}: {message}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
      >
        Retry
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Pagination bar
// ---------------------------------------------------------------------------

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination;
  onPageChange: (page: number) => void;
}) {
  const { page, limit, total, totalPages, hasNextPage, hasPrevPage } = pagination;

  // "Showing X–Y of Z receipts"
  const firstItem = total === 0 ? 0 : (page - 1) * limit + 1;
  const lastItem = Math.min(page * limit, total);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t mt-4">
      {/* Count summary */}
      <p className="text-sm text-gray-500" aria-live="polite">
        {total === 0
          ? 'No receipts'
          : `Showing ${firstItem}–${lastItem} of ${total} receipt${total !== 1 ? 's' : ''}`}
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-2" role="navigation" aria-label="Receipts pagination">
        <button
          onClick={() => onPageChange(1)}
          disabled={!hasPrevPage}
          aria-label="First page"
          className="px-2 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          «
        </button>
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={!hasPrevPage}
          aria-label="Previous page"
          className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          ‹ Prev
        </button>

        {/* Page indicator */}
        <span className="px-3 py-1.5 text-sm text-gray-700 font-medium">
          {page} / {totalPages}
        </span>

        <button
          onClick={() => onPageChange(page + 1)}
          disabled={!hasNextPage}
          aria-label="Next page"
          className="px-3 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Next ›
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={!hasNextPage}
          aria-label="Last page"
          className="px-2 py-1.5 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          »
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Inner dashboard — reads and writes URL search params
// ---------------------------------------------------------------------------

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Derive current page/limit from URL; fall back to defaults
  const page = Math.max(1, parseInt(searchParams.get('page') ?? String(DEFAULT_PAGE), 10) || DEFAULT_PAGE);
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT);

  const [stats, setStats] = useState<Stats | null>(null);
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [receiptsLoading, setReceiptsLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionError>({
    stats: null,
    receipts: null,
  });

  // ── Helpers to update URL params ─────────────────────────────────────────

  const updateSearchParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        params.set(key, value);
      }
      router.push(`/dashboard?${params.toString()}`, { scroll: false });
    },
    [router, searchParams]
  );

  // ── Fetch stats (independent of pagination) ───────────────────────────────

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    setSectionErrors((prev) => ({ ...prev, stats: null }));

    try {
      const res = await fetch(`${apiUrl}/api/merchant/stats`, {
        credentials: 'include',
      });

      if (res.status === 401) {
        await handleAuthError(res);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
      } else {
        setSectionErrors((prev) => ({
          ...prev,
          stats: `Could not load statistics (${res.status}).`,
        }));
      }
    } catch {
      setSectionErrors((prev) => ({
        ...prev,
        stats: 'Could not load statistics. Please check your connection.',
      }));
    } finally {
      setStatsLoading(false);
    }
  }, []);

  // ── Fetch receipts page ───────────────────────────────────────────────────

  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    setSectionErrors((prev) => ({ ...prev, receipts: null }));

    try {
      const res = await fetch(
        `${apiUrl}/api/merchant/receipts?page=${page}&limit=${limit}`,
        { credentials: 'include' }
      );

      if (res.status === 401) {
        await handleAuthError(res);
        return;
      }

      if (res.ok) {
        const data = await res.json();
        setReceipts(data.receipts);
        setPagination(data.pagination);
      } else {
        setSectionErrors((prev) => ({
          ...prev,
          receipts: `Could not load receipts (${res.status}).`,
        }));
      }
    } catch {
      setGlobalError(
        'Failed to load dashboard. Please check your connection and try again.'
      );
    } finally {
      setReceiptsLoading(false);
    }
  }, [page, limit]);

  // ── Initial + page-change fetches ────────────────────────────────────────

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // ── Page navigation ───────────────────────────────────────────────────────

  const handlePageChange = useCallback(
    (newPage: number) => {
      updateSearchParams({ page: String(newPage), limit: String(limit) });
    },
    [updateSearchParams, limit]
  );

  const handleRefresh = useCallback(() => {
    fetchStats();
    fetchReceipts();
  }, [fetchStats, fetchReceipts]);

  const loading = statsLoading && receiptsLoading;

  // ── Loading state (first load only) ──────────────────────────────────────

  if (loading && receipts === null && stats === null) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          Loading dashboard…
        </div>
      </main>
    );
  }

  // ── Full-page network error ───────────────────────────────────────────────

  if (globalError) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2 text-gray-800">Something Went Wrong</h1>
          <p className="text-gray-500 text-sm mb-6">{globalError}</p>
          <button
            onClick={handleRefresh}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Merchant Dashboard</h1>
        <button
          onClick={handleRefresh}
          className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Stats ────────────────────────────────────────────────────────── */}
      {sectionErrors.stats ? (
        <div className="mb-8">
          <ErrorBanner message={sectionErrors.stats} onRetry={fetchStats} />
        </div>
      ) : statsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
              <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
              <div className="h-8 bg-gray-200 rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Total Receipts</div>
            <div className="text-3xl font-bold">{stats.totalReceipts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Confirmed</div>
            <div className="text-3xl font-bold text-green-600">{stats.confirmedReceipts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">{stats.pendingReceipts}</div>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Total Volume</div>
            <div className="text-2xl font-bold">
              {parseFloat(stats.totalVolume).toFixed(2)} XLM
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Receipts ─────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold">Recent Receipts</h2>

          {/* Page-size selector */}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <label htmlFor="page-size-select">Rows per page:</label>
            <select
              id="page-size-select"
              value={limit}
              onChange={(e) =>
                updateSearchParams({ page: '1', limit: e.target.value })
              }
              className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        {sectionErrors.receipts ? (
          <SectionErrorCard
            section="Receipts"
            message={sectionErrors.receipts}
            onRetry={fetchReceipts}
          />
        ) : receiptsLoading ? (
          <div className="space-y-3">
            {[...Array(limit > 5 ? 5 : limit)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-100 rounded animate-pulse" />
            ))}
          </div>
        ) : receipts === null ? null : receipts.length === 0 && page === 1 ? (
          <p className="text-gray-500">No receipts yet</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium text-gray-700">ID</th>
                    <th className="text-left py-2 font-medium text-gray-700">Amount</th>
                    <th className="text-left py-2 font-medium text-gray-700">Status</th>
                    <th className="text-left py-2 font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt.id} className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-2 font-mono text-sm text-gray-700">
                        {receipt.id.substring(0, 16)}…
                      </td>
                      <td className="py-2 text-gray-800">{receipt.amount}</td>
                      <td className="py-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium ${
                            receipt.status === 'Confirmed'
                              ? 'bg-green-100 text-green-800'
                              : receipt.status === 'Pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {receipt.status}
                        </span>
                      </td>
                      <td className="py-2 text-gray-700">
                        {new Date(receipt.timestamp * 1000).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination bar — only shown when there is data */}
            {pagination && (
              <PaginationBar
                pagination={pagination}
                onPageChange={handlePageChange}
              />
            )}
          </>
        )}
      </div>
    </main>
  );
}

// ---------------------------------------------------------------------------
// Page export — Suspense boundary required by Next.js for useSearchParams
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen p-8 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="text-4xl mb-3 animate-pulse">📊</div>
            Loading dashboard…
          </div>
        </main>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
