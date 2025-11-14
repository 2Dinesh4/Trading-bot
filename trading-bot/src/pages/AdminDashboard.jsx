/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';
import api from '../services/api';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [pendingUsers, setPendingUsers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('pending');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = authService.getCurrentUser();

  useEffect(() => {
    if (!user?.is_admin) {
      navigate('/profile');
      return;
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [pendingRes, allUsersRes] = await Promise.all([
        api.get('/api/admin/kyc/pending'),
        api.get('/api/admin/users')
      ]);

      setPendingUsers(pendingRes.data.users || []);
      setAllUsers(allUsersRes.data.users || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId, userName) => {
    if (!window.confirm(`Approve KYC for ${userName}?`)) return;

    try {
      await api.post(`/api/admin/kyc/approve/${userId}?admin_id=${user.id}`);
      setSuccess(`✅ KYC approved for ${userName}`);
      await loadData();
    } catch (error) {
      setError(`Failed to approve KYC for ${userName}`);
    }
  };

  const handleReject = async (userId, userName) => {
    const reason = window.prompt(`Enter rejection reason for ${userName}:`);
    if (!reason) return;

    try {
      await api.post(`/api/admin/kyc/reject/${userId}`, { reason });
      setSuccess(`❌ KYC rejected for ${userName}`);
      await loadData();
    } catch (error) {
      setError(`Failed to reject KYC for ${userName}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Profile
          </button>
        </div>

        <h1 className="text-3xl font-bold mb-2">👑 Admin Dashboard</h1>
        <p className="text-gray-600 mb-8">Manage users and KYC approvals</p>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'pending' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Pending KYC ({pendingUsers.length})
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`px-6 py-3 rounded-lg font-semibold ${
              activeTab === 'all' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Users ({allUsers.length})
          </button>
        </div>

        {activeTab === 'pending' && (
          <div>
            {pendingUsers.length === 0 ? (
              <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">No pending KYC requests</div>
            ) : (
              <div className="space-y-4">
                {pendingUsers.map((user) => (
                  <div key={user.user_id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-bold">{user.name}</h3>
                        <p className="text-gray-600">{user.email}</p>
                        {user.phone && <p className="text-gray-600">📱 {user.phone}</p>}
                        <p className="text-sm text-gray-500 mt-2">
                          Submitted: {new Date(user.kyc_submitted_at).toLocaleString()}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-semibold">
                        Pending Review
                      </span>
                    </div>

                    <div className="mb-4">
                      <h4 className="font-semibold mb-2">📄 Documents:</h4>
                      <div className="space-y-2">
                        {user.documents.map((doc) => (
                          <div key={doc.id} className="bg-gray-50 p-3 rounded">
                            <p className="font-medium capitalize">{doc.type}</p>
                            <p className="text-sm text-gray-600">Number: {doc.number}</p>
                            <p className="text-xs text-gray-500">File: {doc.url}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(user.user_id, user.name)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => handleReject(user.user_id, user.name)}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-md font-semibold"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'all' && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">KYC Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Joined</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {allUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{user.name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-semibold ${
                          user.kyc_status === 'approved'
                            ? 'bg-green-100 text-green-800'
                            : user.kyc_status === 'submitted'
                            ? 'bg-yellow-100 text-yellow-800'
                            : user.kyc_status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {user.kyc_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{user.is_active ? '✅' : '❌'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
