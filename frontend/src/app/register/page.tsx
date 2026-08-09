'use client';

import { useState } from 'react';
import { apiUrl } from '@/lib/api';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [publicKey, setPublicKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${apiUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // credentials: 'include' tells the browser to send/receive cookies cross-origin
        credentials: 'include',
        body: JSON.stringify({ email, password, publicKey }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Registration failed');
      }

      // The server sets the HttpOnly cookie; no token in the response body to store
      window.location.href = '/dashboard';
    } catch (err: any) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-8">
      <div className="bg-white rounded-lg shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6">Merchant Registration</h1>

        <form onSubmit={handleRegister} noValidate>
          <div className="mb-4">
            <label
              htmlFor="register-email"
              className="block text-sm font-medium mb-2"
            >
              Email
            </label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="email"
              required
              aria-required="true"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="register-password"
              className="block text-sm font-medium mb-2"
            >
              Password
            </label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="new-password"
              required
              aria-required="true"
              minLength={8}
            />
          </div>

          <div className="mb-6">
            <label
              htmlFor="register-public-key"
              className="block text-sm font-medium mb-2"
            >
              Stellar Public Key
            </label>
            <input
              id="register-public-key"
              type="text"
              value={publicKey}
              onChange={(e) => setPublicKey(e.target.value)}
              placeholder="G..."
              className="w-full px-4 py-2 border rounded-lg font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoComplete="off"
              required
              aria-required="true"
              aria-describedby="public-key-hint"
            />
            <p
              id="public-key-hint"
              className="text-xs text-gray-500 mt-1"
            >
              Your Stellar account public key for receiving payments
            </p>
          </div>

          {error && (
            <div
              id="register-error"
              role="alert"
              aria-live="assertive"
              className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm"
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            aria-disabled={loading}
            className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            {loading ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{' '}
          <a
            href="/login"
            className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 rounded"
          >
            Login
          </a>
        </p>
      </div>
    </main>
  );
}
