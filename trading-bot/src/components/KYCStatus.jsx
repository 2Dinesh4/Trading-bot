import React, { useState, useEffect } from 'react';
import { kycService } from '../services/kycService';
import { authService } from '../services/authService';

const KYCStatus = () => {
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const user = authService.getCurrentUser();

  useEffect(() => {
    const loadKYCStatus = async () => {
      try {
        const status = await kycService.getStatus(user.id);
        setKycStatus(status);
      } catch (error) {
        console.error('Error loading KYC status:', error);
      } finally {
        setLoading(false);
      }
    };

    loadKYCStatus();
  }, [user.id]);

  if (loading) {
    return <div className="text-center p-4">Loading KYC status...</div>;
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'pending':
      case 'submitted':
        return 'bg-yellow-100 text-yellow-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'approved':
        return '✅ Approved';
      case 'pending':
        return '⏳ Pending';
      case 'submitted':
        return '📋 Submitted - Under Review';
      case 'rejected':
        return '❌ Rejected';
      default:
        return '🔍 Unknown';
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">KYC Status</h2>
      
      <div className={`inline-block px-4 py-2 rounded-full font-semibold ${getStatusColor(kycStatus.kyc_status)}`}>
        {getStatusText(kycStatus.kyc_status)}
      </div>

      {kycStatus.kyc_status === 'pending' && (
        <div className="mt-4 p-4 bg-blue-50 rounded">
          <p className="text-blue-800">
            📄 Please upload your KYC documents to start trading.
          </p>
        </div>
      )}

      {kycStatus.kyc_status === 'submitted' && kycStatus.kyc_submitted_at && (
        <div className="mt-4 p-4 bg-yellow-50 rounded">
          <p className="text-yellow-800">
            ⏳ Your documents are under review. Submitted on: {new Date(kycStatus.kyc_submitted_at).toLocaleDateString()}
          </p>
        </div>
      )}

      {kycStatus.kyc_status === 'approved' && kycStatus.kyc_approved_at && (
        <div className="mt-4 p-4 bg-green-50 rounded">
          <p className="text-green-800">
            ✅ Your KYC was approved on {new Date(kycStatus.kyc_approved_at).toLocaleDateString()}
          </p>
          <p className="text-green-600 mt-2">You can now add API keys and start trading!</p>
        </div>
      )}

      {kycStatus.kyc_status === 'rejected' && (
        <div className="mt-4 p-4 bg-red-50 rounded">
          <p className="text-red-800 font-semibold">❌ Your KYC was rejected</p>
          {kycStatus.kyc_rejected_reason && (
            <p className="text-red-600 mt-2">Reason: {kycStatus.kyc_rejected_reason}</p>
          )}
          <p className="text-red-600 mt-2">Please upload correct documents.</p>
        </div>
      )}
    </div>
  );
};

export default KYCStatus;
