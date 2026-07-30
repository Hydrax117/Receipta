'use client';

import { useState, useEffect } from 'react';

export default function DashboardPage() {
  const [stats, setStats] = useState<any>(null);
  const [receipts, setReceipts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      window.location.href = '/login';
      return;
    }

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      
      const [statsRes, receiptsRes] = await Promise.all([
        fetch(`${apiUrl}/api/merchant/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${apiUrl}/api/merchant/receipts`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (statsRes.ok && receiptsRes.ok) {
        const statsData = await statsRes.json();
        const receiptsData = await receiptsRes.json();
        
        setStats(statsData.stats);
        setReceipts(receiptsData.receipts);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen p-8">
        <div className="text-center">Loading...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Merchant Dashboard</h1>

      {stats && (
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
            <div className="text-2xl font-bold">{parseFloat(stats.totalVolume).toFixed(2)} XLM</div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-bold mb-4">Recent Receipts</h2>
        
        {receipts.length === 0 ? (
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
                    <td className="py-2 font-mono text-sm">{receipt.id.substring(0, 16)}...</td>
                    <td className="py-2">{receipt.amount}</td>
                    <td className="py-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        receipt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                        receipt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {receipt.status}
                      </span>
                    </td>
                    <td className="py-2">{new Date(receipt.timestamp * 1000).toLocaleDateString()}</td>
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
