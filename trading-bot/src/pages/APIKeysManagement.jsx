/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiKeysService } from '../services/apiKeysService';
import { authService } from '../services/authService';
import { kycService } from '../services/kycService';
import APIKeyCard from '../components/APIKeyCard';

const APIKeysManagement = () => {
  const navigate = useNavigate();
  const [apiKeys, setApiKeys] = useState([]);
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    exchange: 'binance',
    api_key: '',
    api_secret: '',
    access_token: '',
    key_name: ''
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = authService.getCurrentUser();

  useEffect(() => {
    checkKYCAndLoadKeys();
  }, []);

  const checkKYCAndLoadKeys = async () => {
    try {
      const status = await kycService.getStatus(user.id);
      setKycStatus(status);

      if (status.kyc_status === 'approved') {
        await loadApiKeys();
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadApiKeys = async () => {
    try {
      const keys = await apiKeysService.getUserKeys(user.id);
      setApiKeys(keys);
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const handleAddKey = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await apiKeysService.createKey(user.id, formData);
      setSuccess('API Key added successfully! ✅');
      setFormData({
        exchange: 'binance',
        api_key: '',
        api_secret: '',
        access_token: '',
        key_name: ''
      });
      setShowAddForm(false);
      await loadApiKeys();
    } catch (error) {
      setError(error.detail || 'Failed to add API key');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (kycStatus?.kyc_status !== 'approved') {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="mb-6">
            <button
              onClick={() => navigate('/profile')}
              className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
            >
              ← Back to Profile
            </button>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold text-yellow-800 mb-4">⚠️ KYC Required</h2>
            <p className="text-yellow-700 mb-6">
              You need to complete KYC verification before you can add API keys.
            </p>
            <button
              onClick={() => navigate('/kyc-upload')}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-3 rounded-lg font-semibold"
            >
              Complete KYC Verification →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-6">
          <button
            onClick={() => navigate('/profile')}
            className="text-blue-600 hover:text-blue-800 flex items-center gap-2"
          >
            ← Back to Profile
          </button>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">API Keys Management</h1>
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold"
          >
            {showAddForm ? 'Cancel' : '+ Add New Key'}
          </button>
        </div>

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

        {showAddForm && (
          <div className="bg-white shadow rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New API Key</h2>
            <form onSubmit={handleAddKey} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Exchange</label>
                <select
                  value={formData.exchange}
                  onChange={(e) => setFormData({ ...formData, exchange: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="binance">Binance</option>
                  <option value="upstox">Upstox</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Key Name (Optional)</label>
                <input
                  type="text"
                  value={formData.key_name}
                  onChange={(e) => setFormData({ ...formData, key_name: e.target.value })}
                  placeholder="My Trading Key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Key *</label>
                <input
                  type="text"
                  value={formData.api_key}
                  onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                  placeholder="Enter your API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">API Secret</label>
                <input
                  type="password"
                  value={formData.api_secret}
                  onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                  placeholder="Enter your API secret"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>

              {formData.exchange === 'upstox' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Access Token</label>
                  <input
                    type="text"
                    value={formData.access_token}
                    onChange={(e) => setFormData({ ...formData, access_token: e.target.value })}
                    placeholder="Enter your access token"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 rounded-md font-semibold">
                  Add Key
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="flex-1 bg-gray-500 hover:bg-gray-600 text-white py-2 rounded-md font-semibold"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div>
          <h2 className="text-xl font-bold mb-4">Your API Keys ({apiKeys.length})</h2>
          {apiKeys.length === 0 ? (
            <div className="bg-white shadow rounded-lg p-8 text-center text-gray-500">
              No API keys added yet. Click "Add New Key" to get started.
            </div>
          ) : (
            <div className="grid gap-4">
              {apiKeys.map((key) => (
                <APIKeyCard key={key.id} apiKey={key} onDelete={loadApiKeys} onUpdate={loadApiKeys} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default APIKeysManagement;
