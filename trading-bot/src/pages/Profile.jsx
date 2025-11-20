import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet, TrendingUp, TrendingDown, Plus, ArrowLeftRight } from 'lucide-react';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    
    if (!storedUser || !token) {
      navigate('/login');
      return;
    }

    try {
      const userData = JSON.parse(storedUser);
      setUser(userData);
      setWalletBalance(userData?.wallet_balance || 0);
      loadKYCStatus(userData.id);
      loadWalletData();
    } catch (error) {
      console.error('Error parsing user data:', error);
      navigate('/login');
    }
  }, [navigate]);

  const loadKYCStatus = async (userId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:10152/api/kyc/status/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setKycStatus(data);
      }
    } catch (error) {
      console.error('Error loading KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWalletData = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('🔑 Token:', token ? 'Present' : 'Missing');
      
      // Get balance
      const balanceRes = await fetch('http://localhost:10152/api/wallet/balance', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📊 Balance response status:', balanceRes.status);
      
      if (balanceRes.ok) {
        const balanceData = await balanceRes.json();
        console.log('💰 Balance data:', balanceData);
        if (balanceData.success) {
          setWalletBalance(balanceData.balance);
        }
      } else {
        console.error('❌ Balance fetch failed:', balanceRes.status);
      }
      
      // Get transactions
      const txRes = await fetch('http://localhost:10152/api/wallet/transactions?limit=10', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (txRes.ok) {
        const txData = await txRes.json();
        if (txData.success) {
          setTransactions(txData.transactions);
        }
      }
    } catch (error) {
      console.error('❌ Error loading wallet data:', error);
    }
  };

  const handleAddFunds = async () => {
    const amount = prompt('Enter amount to add (fake money for testing):');
    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
      alert('Please enter a valid positive number');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:10152/api/wallet/add-funds?amount=${amount}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setWalletBalance(data.new_balance);
          await loadWalletData(); // Reload transactions
          alert(`✅ Added ${amount} USDT to wallet!`);
        }
      } else {
        console.error('Add funds failed:', res.status);
        alert('❌ Failed to add funds. Please try logging in again.');
      }
    } catch (error) {
      console.error('Error adding funds:', error);
      alert('❌ Network error. Please check your connection.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const getKYCBadge = () => {
    const status = kycStatus?.kyc_status || user?.kyc_status || 'pending';
    switch (status) {
      case 'approved':
        return <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-semibold">✅ Verified</span>;
      case 'submitted':
        return <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">⏳ Pending</span>;
      case 'rejected':
        return <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">❌ Rejected</span>;
      default:
        return <span className="px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-semibold">⚠️ Not Verified</span>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/trading-bot')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8 text-gray-800">My Profile</h1>

        {/* User Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{user?.name}</h2>
            {getKYCBadge()}
          </div>

          <div className="space-y-3 text-gray-700">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Account Created:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Wallet Card */}
        <div className="bg-gradient-to-br from-blue-600 to-purple-600 text-white shadow-lg rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Wallet className="w-8 h-8" />
              <h2 className="text-2xl font-bold">Wallet Balance</h2>
            </div>
            <button
              onClick={handleAddFunds}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Funds
            </button>
          </div>

          <div className="text-5xl font-bold mb-2">
            ${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <p className="text-blue-100">Available for trading (USDT)</p>
          
          {/* Recent Transactions */}
          <div className="mt-6 pt-6 border-t border-white/20">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5" />
              Recent Transactions
            </h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {transactions.length === 0 ? (
                <p className="text-blue-100 text-sm">No transactions yet</p>
              ) : (
                transactions.map(tx => (
                  <div key={tx.id} className="flex items-center justify-between bg-white/10 p-3 rounded">
                    <div className="flex items-center gap-2">
                      {tx.amount > 0 ? 
                        <TrendingUp className="w-4 h-4 text-green-300" /> : 
                        <TrendingDown className="w-4 h-4 text-red-300" />
                      }
                      <div>
                        <p className="font-semibold text-sm">{tx.description}</p>
                        <p className="text-xs text-blue-100">{new Date(tx.created_at).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className={`font-bold ${tx.amount > 0 ? 'text-green-300' : 'text-red-300'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toFixed(2)} USDT
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/kyc-upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow text-left transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">📄 KYC Verification</h3>
            <p className="text-blue-100">Manage your KYC documents</p>
          </button>

          <button
            onClick={() => navigate('/api-keys')}
            className={`p-6 rounded-lg shadow text-left transition-colors ${
              (kycStatus?.kyc_status || user?.kyc_status) === 'approved'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 cursor-not-allowed text-gray-600'
            }`}
            disabled={(kycStatus?.kyc_status || user?.kyc_status) !== 'approved'}
          >
            <h3 className="text-xl font-semibold mb-2">🔑 API Keys</h3>
            <p className={(kycStatus?.kyc_status || user?.kyc_status) === 'approved' ? 'text-green-100' : 'text-gray-500'}>
              {(kycStatus?.kyc_status || user?.kyc_status) === 'approved' 
                ? 'Manage your exchange API keys' 
                : 'Complete KYC to access'}
            </p>
          </button>
        </div>

        {/* Admin Panel */}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow text-left mb-6 transition-colors"
          >
            <h3 className="text-xl font-semibold mb-2">👑 Admin Panel</h3>
            <p className="text-purple-100">Manage users and KYC approvals</p>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
