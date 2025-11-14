import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import { kycService } from '../services/kycService';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = authService.getCurrentUser();
    setUser(currentUser);
    loadKYCStatus(currentUser.id);
  }, []);

  const loadKYCStatus = async (userId) => {
    try {
      const status = await kycService.getStatus(userId);
      setKycStatus(status);
    } catch (error) {
      console.error('Error loading KYC status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    authService.logout();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  const getKYCBadge = () => {
    switch (kycStatus?.kyc_status) {
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

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Dashboard
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        {/* User Info Card */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">{user?.name}</h2>
            {getKYCBadge()}
          </div>

          <div className="space-y-3 text-gray-700">
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>User ID:</strong> {user?.id}</p>
            <p><strong>Account Created:</strong> {new Date().toLocaleDateString()}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <button
            onClick={() => navigate('/kyc-upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg shadow text-left"
          >
            <h3 className="text-xl font-semibold mb-2">📄 KYC Verification</h3>
            <p className="text-blue-100">Manage your KYC documents</p>
          </button>

          <button
            onClick={() => navigate('/api-keys')}
            className={`p-6 rounded-lg shadow text-left ${
              kycStatus?.kyc_status === 'approved'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-gray-300 cursor-not-allowed text-gray-600'
            }`}
            disabled={kycStatus?.kyc_status !== 'approved'}
          >
            <h3 className="text-xl font-semibold mb-2">🔑 API Keys</h3>
            <p className={kycStatus?.kyc_status === 'approved' ? 'text-green-100' : 'text-gray-500'}>
              {kycStatus?.kyc_status === 'approved' 
                ? 'Manage your exchange API keys' 
                : 'Complete KYC to access'}
            </p>
          </button>
        </div>

        {/* Admin Panel */}
        {user?.is_admin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg shadow text-left mb-6"
          >
            <h3 className="text-xl font-semibold mb-2">👑 Admin Panel</h3>
            <p className="text-purple-100">Manage users and KYC approvals</p>
          </button>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg font-semibold"
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Profile;
