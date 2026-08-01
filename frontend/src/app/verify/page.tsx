'use client';

import { useState } from 'react';

const stroopsToXLM = (stroops: number): number => {
  return stroops / 10000000;
};

export default function VerifyPage() {
  const [receiptId, setReceiptId] = useState('');
  const [receipt, setReceipt] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async () => {
    if (!receiptId || receiptId.length !== 64) {
      setError('Please enter a valid 64-character receipt ID');
      return;
    }

    setLoading(true);
    setError('');
    setReceipt(null);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/receipts/${receiptId}`);
      
      if (!response.ok) {
        throw new Error('Receipt not found');
      }

      const data = await response.json();
      setReceipt(data.receipt);
    } catch (err) {
      setError('Receipt not found or invalid');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Verify Receipt</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <label className="block text-sm font-medium mb-2">Receipt ID</label>
        <input
          type="text"
          value={receiptId}
          onChange={(e) => setReceiptId(e.target.value)}
          placeholder="Enter 64-character receipt ID"
          className="w-full px-4 py-2 border rounded-lg mb-4"
          maxLength={64}
        />
        
        <button
          onClick={handleVerify}
          disabled={loading}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Verifying...' : 'Verify Receipt'}
        </button>

        {error && (
          <div className="mt-4 p-4 bg-red-50 text-red-700 rounded-lg">
            {error}
          </div>
        )}
      </div>

      {receipt && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className={`text-xl font-bold mb-4 ${
            receipt.status === 'Confirmed' ? 'text-green-600' :
            receipt.status === 'Pending' ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {receipt.status === 'Confirmed' ? '✓ Receipt Confirmed' :
             receipt.status === 'Pending' ? '⏳ Receipt Pending — payment not yet confirmed' :
             '✗ Receipt Failed — this payment did not complete'}
          </h2>
          
          <div className="space-y-3">
            <div>
              <span className="font-medium">Status:</span>
              <span className={`ml-2 px-3 py-1 rounded-full text-sm ${
                receipt.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                receipt.status === 'Pending' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {receipt.status}
              </span>
            </div>
            
            <div>
              <span className="font-medium">Amount:</span>
              <span className="ml-2">{stroopsToXLM(receipt.amount).toFixed(7)} XLM ({receipt.amount.toLocaleString()} stroops)</span>
            </div>
            
            <div>
              <span className="font-medium">Sender:</span>
              <span className="ml-2 text-sm font-mono break-all">{receipt.sender}</span>
            </div>
            
            <div>
              <span className="font-medium">Receiver:</span>
              <span className="ml-2 text-sm font-mono break-all">{receipt.receiver}</span>
            </div>
            
            <div>
              <span className="font-medium">Timestamp:</span>
              <span className="ml-2">{new Date(receipt.timestamp * 1000).toLocaleString()}</span>
            </div>
            
            {receipt.fee_amount > 0 && (
              <div>
                <span className="font-medium">Platform Fee:</span>
                <span className="ml-2">{stroopsToXLM(receipt.fee_amount).toFixed(7)} XLM ({receipt.fee_amount.toLocaleString()} stroops)</span>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Status Explanation:</h3>
            <p className="text-sm text-gray-600">
              {receipt.status === 'Confirmed' 
                ? 'This payment has been successfully confirmed on the Stellar network. The transaction is complete and irreversible.'
                : receipt.status === 'Pending'
                ? 'This payment is still being processed on the Stellar network. It has not yet been confirmed. Please check back later.'
                : 'This payment failed to complete. The transaction was not successful and no funds were transferred.'}
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
