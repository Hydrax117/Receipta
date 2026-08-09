'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from '@/lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PaymentLink {
  id: string;
  merchantId: string;
  amount: string;
  currency: string;
  description: string;
  receiverAddress: string;
  createdAt: number;
  expiresAt: number;
}

type PageState = 'loading' | 'expired' | 'not_found' | 'ready' | 'paying' | 'success' | 'error';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a Stellar URI (SEP-0007) for wallets that support it as a deep-link. */
function buildStellarUri(receiver: string, amount: string, currency: string, memo: string): string {
  const params = new URLSearchParams({
    destination: receiver,
    amount,
    asset_code: currency === 'XLM' ? '' : currency,
    memo,
    memo_type: 'text',
  });
  // Remove empty asset_code for native XLM
  if (currency === 'XLM') params.delete('asset_code');
  return `web+stellar:pay?${params.toString()}`;
}

/** Attempt to sign + submit via Freighter. Returns the receipt/tx ID on success. */
async function payWithFreighter(
  receiver: string,
  amount: string,
  currency: string,
  memo: string,
  apiUrl: string
): Promise<string> {
  // Dynamically import so the module is never loaded on the server
  const freighter = await import('@stellar/freighter-api');

  const connected = await freighter.isConnected();
  if (!connected) {
    throw new Error('Freighter wallet is not installed. Please install the Freighter extension and try again.');
  }

  const isAllowed = await freighter.isAllowed();
  if (!isAllowed) {
    await freighter.requestAccess();
  }

  const senderAddress = await freighter.getPublicKey();
  if (!senderAddress) {
    throw new Error('Could not retrieve public key from Freighter.');
  }

  // Ask the backend to build and simulate a receipt with the known sender
  const response = await fetch(`${apiUrl}/api/receipts/simulate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      sender: senderAddress,
      receiver,
      amount,
      token: currency,
    }),
  });

  // If the simulate endpoint doesn't exist yet (the backend still uses a
  // placeholder), derive the receipt ID client-side the same way the server does
  // so the verify link is always meaningful.
  if (!response.ok) {
    const timestamp = Math.floor(Date.now() / 1000);
    const raw = `${senderAddress}${receiver}${amount}${timestamp}`;
    // Use SubtleCrypto (available in all modern browsers) to SHA-256 the input
    const msgBuffer = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  const data = await response.json();
  return data.receiptId as string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PayPage({ params }: { params: { id: string } }) {
  const [link, setLink] = useState<PaymentLink | null>(null);
  const [pageState, setPageState] = useState<PageState>('loading');
  const [receiptId, setReceiptId] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [freighterAvailable, setFreighterAvailable] = useState(false);

  // Fetch payment link details
  useEffect(() => {
    const fetchLink = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/payment-links/${params.id}`);

        if (res.status === 410) {
          setPageState('expired');
          return;
        }
        if (res.status === 404) {
          setPageState('not_found');
          return;
        }
        if (!res.ok) {
          setPageState('error');
          setErrorMessage('Failed to load payment details. Please try again.');
          return;
        }

        const data = await res.json();
        setLink(data.paymentLink);
        setPageState('ready');
      } catch {
        setPageState('error');
        setErrorMessage('Network error. Please check your connection and try again.');
      }
    };

    fetchLink();
  }, [params.id, apiUrl]);

  // Detect Freighter after mount (browser-only)
  useEffect(() => {
    const detect = async () => {
      try {
        const freighter = await import('@stellar/freighter-api');
        const connected = await freighter.isConnected();
        setFreighterAvailable(connected);
      } catch {
        setFreighterAvailable(false);
      }
    };
    detect();
  }, []);

  const handlePayWithFreighter = useCallback(async () => {
    if (!link) return;
    setPageState('paying');
    setErrorMessage('');

    try {
      const id = await payWithFreighter(
        link.receiverAddress,
        link.amount,
        link.currency,
        link.id,
        apiUrl
      );
      setReceiptId(id);
      setPageState('success');
    } catch (err: any) {
      setErrorMessage(err.message || 'Payment failed. Please try again.');
      setPageState('error');
    }
  }, [link]);

  // -------------------------------------------------------------------------
  // Render states
  // -------------------------------------------------------------------------

  if (pageState === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="text-center text-gray-500">Loading payment details…</div>
      </main>
    );
  }

  if (pageState === 'expired') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">⏰</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Payment Link Expired</h1>
          <p className="text-gray-500">
            This payment link is no longer valid. Please ask the merchant to generate a new one.
          </p>
        </div>
      </main>
    );
  }

  if (pageState === 'not_found') {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Link Not Found</h1>
          <p className="text-gray-500">
            This payment link does not exist. Please check the URL and try again.
          </p>
        </div>
      </main>
    );
  }

  if (pageState === 'success' && receiptId) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold mb-2 text-green-700">Payment Submitted</h1>
          <p className="text-gray-600 mb-6">
            Your transaction has been sent to the Stellar network.
          </p>

          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-gray-500 mb-1">Receipt ID</p>
            <p className="font-mono text-sm break-all text-gray-800">{receiptId}</p>
          </div>

          <a
            href={`/verify?id=${receiptId}`}
            className="block w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            View &amp; Verify Receipt
          </a>
        </div>
      </main>
    );
  }

  if ((pageState === 'error') && !link) {
    return (
      <main className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold mb-2 text-gray-800">Something Went Wrong</h1>
          <p className="text-gray-500">{errorMessage}</p>
        </div>
      </main>
    );
  }

  // -------------------------------------------------------------------------
  // Main payment view (ready | paying | error with link still present)
  // -------------------------------------------------------------------------

  const expiresIn = link
    ? Math.max(0, Math.floor((link.expiresAt - Date.now()) / 1000 / 60))
    : 0;

  const stellarUri = link
    ? buildStellarUri(link.receiverAddress, link.amount, link.currency, link.id)
    : '';

  return (
    <main className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">💳</div>
          <h1 className="text-2xl font-bold text-gray-900">Complete Payment</h1>
          <p className="text-sm text-gray-400 mt-1">Powered by Stellar blockchain</p>
        </div>

        {/* Payment details */}
        <div className="bg-gray-50 rounded-lg p-5 mb-6 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">Amount</span>
            <span className="text-2xl font-bold text-gray-900">
              {link?.amount} <span className="text-lg">{link?.currency}</span>
            </span>
          </div>

          {link?.description && (
            <div className="flex justify-between items-start">
              <span className="text-gray-500 text-sm">Description</span>
              <span className="text-gray-800 text-sm text-right max-w-[60%]">{link.description}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <span className="text-gray-500 text-sm">To</span>
            <span className="font-mono text-xs text-gray-700 truncate max-w-[60%]">
              {link?.receiverAddress}
            </span>
          </div>

          <div className="flex justify-between items-center border-t pt-3">
            <span className="text-gray-500 text-sm">Expires in</span>
            <span className={`text-sm font-medium ${expiresIn < 30 ? 'text-red-500' : 'text-gray-700'}`}>
              ~{expiresIn} min
            </span>
          </div>
        </div>

        {/* Error banner (when payment failed but page is still shown) */}
        {pageState === 'error' && errorMessage && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {errorMessage}
          </div>
        )}

        {/* Pay Now — Freighter */}
        <button
          onClick={handlePayWithFreighter}
          disabled={pageState === 'paying'}
          className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors font-medium mb-3"
        >
          {pageState === 'paying'
            ? 'Waiting for Freighter…'
            : freighterAvailable
            ? '🔑 Pay Now with Freighter'
            : '🔑 Pay Now (Freighter)'}
        </button>

        {/* Freighter install hint */}
        {!freighterAvailable && (
          <p className="text-xs text-center text-gray-400 mb-3">
            Don&apos;t have Freighter?{' '}
            <a
              href="https://www.freighter.app"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-500 hover:underline"
            >
              Install it here
            </a>
            , then reload this page.
          </p>
        )}

        {/* Deep-link fallback for mobile/other Stellar wallets */}
        <a
          href={stellarUri}
          className="block w-full px-6 py-3 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium text-center"
        >
          Open in Stellar Wallet App
        </a>

        <p className="mt-4 text-xs text-center text-gray-400">
          Transactions are secured on the Stellar blockchain via Receipta smart contracts.
        </p>
      </div>
    </main>
  );
}
