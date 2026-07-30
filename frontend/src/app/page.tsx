export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-8 bg-gradient-to-b from-blue-50 to-white">
      <div className="text-center max-w-3xl">
        <h1 className="text-5xl font-bold mb-4 text-gray-900">Receipta</h1>
        <p className="text-xl text-gray-600 mb-8">
          Blockchain-powered payment verification on Stellar
        </p>
        <p className="text-gray-700 mb-12 max-w-2xl mx-auto">
          Eliminate payment fraud with tamper-proof, cryptographically verifiable digital receipts. 
          Every transaction is secured on the Stellar blockchain using Soroban smart contracts.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
          <a
            href="/verify"
            className="px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Verify a Receipt
          </a>
          <a
            href="/register"
            className="px-8 py-4 bg-white text-blue-600 border-2 border-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
          >
            Merchant Sign Up
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">🔒</div>
            <h3 className="font-bold mb-2">Tamper-Proof</h3>
            <p className="text-sm text-gray-600">
              Receipts stored on Stellar blockchain cannot be altered or faked
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">⚡</div>
            <h3 className="font-bold mb-2">Instant Verification</h3>
            <p className="text-sm text-gray-600">
              Anyone can verify payment authenticity in seconds
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-3xl mb-3">💰</div>
            <h3 className="font-bold mb-2">Low Fees</h3>
            <p className="text-sm text-gray-600">
              Powered by Stellar's efficient blockchain infrastructure
            </p>
          </div>
        </div>

        <div className="mt-12 text-sm text-gray-500">
          <a href="/login" className="hover:text-blue-600">Merchant Login</a>
          {' · '}
          <a href="/dashboard" className="hover:text-blue-600">Dashboard</a>
        </div>
      </div>
    </main>
  );
}
