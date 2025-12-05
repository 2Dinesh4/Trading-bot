import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Settings, FileText, Key, Wallet, CheckCircle } from 'lucide-react';

export default function UserProfile({ user, onLogout }) {
  const [showMenu, setShowMenu] = useState(false);
  const [userData, setUserData] = useState(null);
  const [walletBalance, setWalletBalance] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      console.log('🔍 User from props:', user);
      console.log('🔍 is_admin from props:', user.is_admin, typeof user.is_admin);
      setUserData(user);
    } else {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log('🔍 User from localStorage:', parsedUser);
          console.log('🔍 is_admin from localStorage:', parsedUser.is_admin, typeof parsedUser.is_admin);
          setUserData(parsedUser);
        } else {
          setUserData({
            name: 'User',
            email: 'user@email.com',
            kyc_status: 'pending',
            is_admin: false
          });
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        setUserData({
          name: 'User',
          email: 'user@email.com',
          kyc_status: 'pending',
          is_admin: false
        });
      }
    }
  }, [user]);

  // Fetch wallet balance
  useEffect(() => {
    const fetchWalletBalance = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch('http://localhost:10152/api/wallet/balance', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        const data = await response.json();
        if (data.success) {
          setWalletBalance(data.balance);
        }
      } catch (error) {
        console.error('Error fetching wallet balance:', error);
      }
    };

    fetchWalletBalance();
    const interval = setInterval(fetchWalletBalance, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    onLogout();
    navigate('/login');
  };

  const getInitial = () => {
    return userData?.name ? userData.name.charAt(0).toUpperCase() : 'U';
  };

  const getKYCBadge = () => {
    const status = userData?.kyc_status || 'pending';
    
    switch(status) {
      case 'approved':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-semibold">✅ Verified</span>;
      case 'submitted':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-semibold">⏳ Pending</span>;
      case 'rejected':
        return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">❌ Rejected</span>;
      default:
        return <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 font-semibold">⚠️ Not Verified</span>;
    }
  };

  // ✅ SECURITY CHECK: Only show admin panel if is_admin is STRICTLY true
  const isAdmin = () => {
    const adminStatus = userData?.is_admin === true || userData?.is_admin === 'true';
    console.log('🔒 Admin check:', adminStatus, 'for user:', userData?.email);
    return adminStatus;
  };

  if (!userData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex items-center gap-3">
      {/* Wallet Balance Badge */}
      <button
        onClick={() => navigate('/profile')}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 hover:bg-green-600 transition-colors shadow-lg"
        title="Click to view wallet"
      >
        <Wallet className="w-4 h-4 text-white" />
        <div className="text-left">
          <p className="text-[10px] text-green-100 font-medium">Wallet Balance</p>
          <p className="text-sm font-bold text-white">
            ${walletBalance !== null ? walletBalance.toFixed(2).toLocaleString() : '---'}
          </p>
        </div>
      </button>

      {/* User Avatar Button */}
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors relative z-10"
      >
        <div className="w-10 h-10 rounded-full border-2 border-white bg-blue-600 flex items-center justify-center text-white font-bold">
          {getInitial()}
        </div>
        <div className="text-left hidden md:block">
          <p className="text-white font-semibold text-sm">{userData.name}</p>
          <p className="text-blue-200 text-xs">{userData.email}</p>
        </div>
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9998]"
            onClick={() => setShowMenu(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-full mt-3 w-72 bg-white rounded-lg shadow-2xl z-[9999] overflow-hidden border border-slate-200">
            {/* User Info Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full border-2 border-white bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                  {getInitial()}
                </div>
                <div className="flex-1">
                  <p className="text-white font-semibold">{userData.name}</p>
                  <p className="text-blue-100 text-xs mb-1">{userData.email}</p>
                  {getKYCBadge()}
                </div>
              </div>
            </div>

            {/* Menu Items */}
            <div className="py-2">
              {/* Profile */}
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 font-medium"
              >
                <User className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="font-semibold">My Profile</div>
                  <div className="text-xs text-gray-500">View account details</div>
                </div>
              </button>
              
              {/* KYC Verification */}
              <button
                onClick={() => {
                  navigate('/kyc-upload');
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 font-medium"
              >
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <div className="font-semibold">KYC Verification</div>
                  <div className="text-xs text-gray-500">Upload documents</div>
                </div>
              </button>

              {/* API Keys */}
              <button
                onClick={() => {
                  navigate('/api-keys');
                  setShowMenu(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 font-medium"
              >
                <Key className="w-5 h-5 text-purple-600" />
                <div>
                  <div className="font-semibold">API Keys</div>
                  <div className="text-xs text-gray-500">Manage exchange keys</div>
                </div>
              </button>

              {/* Settings */}
              <button
                onClick={() => setShowMenu(false)}
                className="w-full px-4 py-3 text-left hover:bg-slate-100 transition-colors flex items-center gap-3 text-slate-700 font-medium"
              >
                <Settings className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="font-semibold">Settings</div>
                  <div className="text-xs text-gray-500">Account preferences</div>
                </div>
              </button>

              {/* ✅ ADMIN PANEL - STRICT SECURITY CHECK */}
              {isAdmin() && (
                <>
                  <div className="border-t border-slate-200 my-2"></div>
                  
                  <button
                    onClick={() => {
                      navigate('/admin/kyc');
                      setShowMenu(false);
                    }}
                    className="w-full px-4 py-3 text-left hover:bg-orange-50 transition-colors flex items-center gap-3 text-orange-700 font-medium"
                  >
                    <CheckCircle className="w-5 h-5" />
                    <div>
                      <div className="font-semibold">Admin KYC</div>
                      <div className="text-xs text-orange-500">Verify user documents</div>
                    </div>
                  </button>
                </>
              )}
              
              <div className="border-t border-slate-200 my-2"></div>
              
              {/* Logout */}
              <button
                onClick={handleLogout}
                className="w-full px-4 py-3 text-left hover:bg-red-50 transition-colors flex items-center gap-3 text-red-600 font-medium"
              >
                <LogOut className="w-5 h-5" />
                <div>
                  <div className="font-semibold">Logout</div>
                  <div className="text-xs text-red-400">Sign out of account</div>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
