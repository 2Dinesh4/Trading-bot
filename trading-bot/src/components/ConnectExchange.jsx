import React, { useState } from 'react';
import { Link, AlertCircle, CheckCircle, Loader } from 'lucide-react';

// Use localhost directly to ensure connection matches your backend setup
const API_URL = 'http://localhost:10152';

const ConnectExchange = ({ userId, token, onLinkSuccess }) => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  
  // Status states for better UX
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      console.log("🔗 Submitting keys...");

      const response = await fetch(`${API_URL}/api/keys/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          exchange: 'binance',
          api_key: apiKey.trim(),     // 🧹 TRIM SPACES (Critical Fix)
          api_secret: apiSecret.trim(), // 🧹 TRIM SPACES (Critical Fix)
          key_name: 'Main Binance Account'
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // 🛡️ FIX [object Object] ERROR:
        // If data.detail is an object/array, turn it into a string we can read.
        const errorMsg = typeof data.detail === 'object' 
          ? JSON.stringify(data.detail) 
          : data.detail || 'Failed to link account.';
        
        throw new Error(errorMsg);
      }

      // ✅ Success Scenario
      setStatus('success');
      setMessage('✅ Binance Account Linked Successfully!');
      
      // Clear sensitive data immediately
      setApiKey('');
      setApiSecret('');

      // Wait 1.5s so user sees the success message, then close modal
      if (onLinkSuccess) {
        setTimeout(() => {
          onLinkSuccess(); 
        }, 1500);
      }
      
    } catch (err) {
      console.error("Link Error:", err);
      setStatus('error');
      
      // 🧠 Smart Error Translation
      let cleanMsg = err.message;
      if (cleanMsg.includes('APIError')) cleanMsg = "Binance Rejected Connection (Check IP Whitelist)";
      if (cleanMsg.includes('Signature')) cleanMsg = "Invalid Secret Key";
      if (cleanMsg.includes('Invalid API-key')) cleanMsg = "Invalid API Key";
      
      setMessage(cleanMsg);
    }
  };

  return (
    <div className="bg-gray-800 rounded-xl shadow-2xl p-8 border border-gray-700 max-w-md w-full mx-auto relative z-50">
      
      {/* Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-500 rounded-full mb-4 shadow-lg">
          <Link className="w-8 h-8 text-gray-900" />
        </div>
        <h2 className="text-2xl font-bold text-white">Connect Binance</h2>
        <p className="text-gray-400 text-sm mt-2">
          Enter your Spot Trading API Keys to sync balance.
        </p>
      </div>

      {/* Status Message Box */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 border ${
          status === 'error' 
            ? 'bg-red-500/10 border-red-500 text-red-400' 
            : 'bg-green-500/10 border-green-500 text-green-400'
        }`}>
          {status === 'error' ? <AlertCircle className="w-5 h-5 shrink-0" /> : <CheckCircle className="w-5 h-5 shrink-0" />}
          <p className="text-sm font-medium break-words">{message}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">API Key</label>
          <input
            type="text"
            required
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Paste your Binance API Key"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-1">Secret Key</label>
          <input
            type="password"
            required
            className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-yellow-500 outline-none transition-all"
            value={apiSecret}
            onChange={(e) => setApiSecret(e.target.value)}
            placeholder="Paste your Binance Secret Key"
          />
        </div>

        <button
          type="submit"
          disabled={status === 'loading' || status === 'success'}
          className={`w-full py-3 px-4 rounded-lg font-bold flex items-center justify-center gap-2 transition-all ${
            status === 'loading'
              ? 'bg-gray-600 cursor-not-allowed'
              : 'bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-400 hover:to-yellow-500 text-gray-900 shadow-lg transform hover:scale-[1.02]'
          }`}
        >
          {status === 'loading' ? (
            <><Loader className="animate-spin w-5 h-5" /> Validating...</>
          ) : (
            '🚀 Link Account'
          )}
        </button>
      </form>
      
      <p className="text-xs text-center text-gray-500 mt-6">
        Keys are encrypted securely. Withdrawal permissions should be DISABLED on Binance.
      </p>
    </div>
  );
};

export default ConnectExchange;