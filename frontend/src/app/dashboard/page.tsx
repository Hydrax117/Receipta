'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';

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

interface SectionError {
  stats: string | null;
  receipts: string | null;
}

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
// Page
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [loading, setLoading] = useState(true);
  // null = no error; string = user-visible message
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [sectionErrors, setSectionErrors] = useState<SectionError>({
    stats: null,
    receipts: null,
  });

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setGlobalError(null);
    setSectionErrors({ stats: null, receipts: null });

    try {
      // Fire both requests concurrently; settle independently so a partial
      // failure still shows whatever data is available.
      const [statsRes, receiptsRes] = await Promise.all([
        fetch(`${apiUrl}/api/merchant/stats`, { credentials: 'include' }),
        fetch(`${apiUrl}/api/merchant/receipts`, { credentials: 'include' }),
      ]);

      // A 401 from either endpoint means the session cookie is gone/expired.
      // Redirect with a query param so the login page can show a message.
      if (statsRes.status === 401 || receiptsRes.status === 401) {
        window.location.href = '/login?reason=session_expired';
        return;
      }

      // Handle each section independently so a partial failure still renders
      // the section that succeeded.
      if (statsRes.ok) {
        const data = await statsRes.json();
        setStats(data.stats);
      } else {
        setSectionErrors((prev) => ({
          ...prev,
          stats: `Could not load statistics (${statsRes.status}).`,
        }));
      }

      if (receiptsRes.ok) {
        const data = await receiptsRes.json();
        setReceipts(data.receipts);
      } else {
        setSectionErrors((prev) => ({
          ...prev,
          receipts: `Could not load receipts (${receiptsRes.status}).`,
        }));
      }
    } catch {
      // Network-level failure — neither response arrived.
      setGlobalError(
        'Failed to load dashboard. Please check your connection and try again.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="text-center text-gray-500">
          <div className="text-4xl mb-3 animate-pulse">📊</div>
          Loading dashboard…
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Full-page error (network failure — no data at all)
  // -------------------------------------------------------------------------

  if (globalError) {
    return (
      <main className="min-h-screen p-8 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-xl font-bold mb-2 text-gray-800">Something Went Wrong</h1>
          <p className="text-gray-500 text-sm mb-6">{globalError}</p>
          <button
            onClick={fetchDashboardData}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Retry
          </button>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Dashboard — may render with partial data + section-level error banners
  // -------------------------------------------------------------------------

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Merchant Dashboard</h1>
        {/* Always-visible retry keeps the UX consistent even in success state */}
        <button
          onClick={fetchDashboardData}
          className="px-4 py-2 text-sm text-blue-600 border border-blue-300 rounded-lg hover:bg-blue-50 transition-colors"
        >
          ↻ Refresh
        </button>
      </div>

      {/* ── Stats section ────────────────────────────────────────────────── */}
      {sectionErrors.stats ? (
        <div className="mb-8">
          <ErrorBanner
            message={sectionErrors.stats}
            onRetry={fetchDashboardData}
          />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Total Receipts</div>
            <div className="text-3xl font-bold">{stats.totalReceipts}</div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Confirmed</div>
            <div className="text-3xl font-bold text-green-600">
              {stats.confirmedReceipts}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Pending</div>
            <div className="text-3xl font-bold text-yellow-600">
              {stats.pendingReceipts}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="text-gray-600 text-sm">Total Volume</div>
            <div className="text-2xl font-bold">
              {parseFloat(stats.totalVolume).toFixed(2)} XLM
            </div>
          </div>
        </div>
      ) : null}

      {/* ── Receipts section ─────────────────────────────────────────────── */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Receipts</h2>

        {sectionErrors.receipts ? (
          <SectionErrorCard
            section="Receipts"
            message={sectionErrors.receipts}
            onRetry={fetchDashboardData}
          />
        ) : receipts === null ? null : receipts.length === 0 ? (
          <p className="text-gray-500">No receipts yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">ID</th>
                  <th className="text-left py-2">Amount</th>
                  <th className="text-left py-2">Status</th>
                  <th className="text-left py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {receipts.map((receipt) => (
                  <tr key={receipt.id} className="border-b">
                    <td className="py-2 font-mono text-sm">
                      {receipt.id.substring(0, 16)}…
                    </td>
                    <td className="py-2">{receipt.amount}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
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
                    <td className="py-2">
                      {new Date(receipt.timestamp * 1000).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}
