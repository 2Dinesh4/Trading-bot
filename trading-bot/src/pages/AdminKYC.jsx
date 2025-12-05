import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, FileText, Calendar, Mail, Phone, AlertCircle } from 'lucide-react';

export default function AdminKYC() {
  const [pendingKYC, setPendingKYC] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showRejectModal, setShowRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Fetch pending KYC documents
  useEffect(() => {
    fetchPendingKYC();
  }, []);

  const fetchPendingKYC = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      
      const response = await fetch('http://localhost:10152/api/admin/kyc/pending', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPendingKYC(data.users);
      }
    } catch (error) {
      console.error('Error fetching pending KYC:', error);
      alert('Failed to load pending KYC documents');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Are you sure you want to APPROVE this KYC?')) return;

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      const user = JSON.parse(localStorage.getItem('user'));
      
      console.log('🔍 Approving user:', userId);
      console.log('🔍 Admin:', user);
      console.log('🔍 Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`http://localhost:10152/api/admin/kyc/approve/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          admin_id: user?.id || 1
        })
      });

      console.log('🔍 Response status:', response.status);
      
      const data = await response.json();
      console.log('🔍 Response data:', data);
      
      if (data.success) {
        alert('✅ KYC Approved Successfully!');
        fetchPendingKYC(); // Refresh list
      } else {
        // Show detailed error
        const errorMsg = data.message || data.detail || 'Unknown error';
        alert('Failed to approve KYC: ' + errorMsg);
        console.error('Approval failed:', data);
      }
    } catch (error) {
      console.error('Error approving KYC:', error);
      alert('Failed to approve KYC: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async (userId) => {
    if (!rejectReason.trim()) {
      alert('Please enter a rejection reason');
      return;
    }

    setProcessing(true);
    try {
      const token = localStorage.getItem('token');
      
      console.log('🔍 Rejecting user:', userId);
      console.log('🔍 Reason:', rejectReason);
      console.log('🔍 Token:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`http://localhost:10152/api/admin/kyc/reject/${userId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          reason: rejectReason.trim()
        })
      });

      console.log('🔍 Response status:', response.status);
      
      const data = await response.json();
      console.log('🔍 Response data:', data);
      
      if (data.success) {
        alert('❌ KYC Rejected');
        setShowRejectModal(null);
        setRejectReason('');
        fetchPendingKYC(); // Refresh list
      } else {
        // Show detailed error
        const errorMsg = data.message || data.detail || 'Unknown error';
        alert('Failed to reject KYC: ' + errorMsg);
        console.error('Rejection failed:', data);
      }
    } catch (error) {
      console.error('Error rejecting KYC:', error);
      alert('Failed to reject KYC: ' + error.message);
    } finally {
      setProcessing(false);
    }
  };

  const viewDocument = (documentUrl) => {
    // Open document in new window
    const fullPath = `http://localhost:10152/${documentUrl.replace('app/', '')}`;
    window.open(fullPath, '_blank');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading pending KYC documents...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-md rounded-lg p-6 mb-6">
          <h1 className="text-3xl font-bold text-white mb-2">Admin KYC Verification</h1>
          <p className="text-gray-300">Review and approve/reject user KYC documents</p>
          <div className="mt-4 flex gap-4">
            <div className="bg-yellow-500/20 px-4 py-2 rounded-lg">
              <p className="text-yellow-300 text-sm">Pending Documents</p>
              <p className="text-white text-2xl font-bold">{pendingKYC.length}</p>
            </div>
          </div>
        </div>

        {/* KYC List */}
        {pendingKYC.length === 0 ? (
          <div className="bg-white rounded-lg p-12 text-center">
            <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-600 mb-2">No Pending KYC Documents</h3>
            <p className="text-gray-500">All KYC verifications are up to date!</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {pendingKYC.map((kycUser) => (
              <div key={kycUser.user_id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                <div className="p-6">
                  {/* User Info */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                        {kycUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-800">{kycUser.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-gray-600 mt-1">
                          <span className="flex items-center gap-1">
                            <Mail className="w-4 h-4" />
                            {kycUser.email}
                          </span>
                          {kycUser.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-4 h-4" />
                              {kycUser.phone}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <Calendar className="w-4 h-4" />
                          Submitted: {new Date(kycUser.kyc_submitted_at).toLocaleString()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Documents */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Uploaded Documents ({kycUser.documents.length})
                    </h4>
                    <div className="grid md:grid-cols-2 gap-3">
                      {kycUser.documents.map((doc) => (
                        <div key={doc.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="font-semibold text-gray-800 capitalize">{doc.type}</p>
                              <p className="text-sm text-gray-600">Number: {doc.number}</p>
                            </div>
                            <button
                              onClick={() => viewDocument(doc.url)}
                              className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 flex items-center gap-1"
                            >
                              <Eye className="w-4 h-4" />
                              View
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleApprove(kycUser.user_id)}
                      disabled={processing}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                      {processing ? 'Processing...' : 'Approve KYC'}
                    </button>
                    <button
                      onClick={() => setShowRejectModal(kycUser.user_id)}
                      disabled={processing}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-6 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <XCircle className="w-5 h-5" />
                      Reject KYC
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Reject Modal */}
        {showRejectModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-xl font-bold text-gray-800 mb-4">Reject KYC - Reason Required</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Enter reason for rejection (e.g., unclear document, mismatch, etc.)"
                className="w-full border border-gray-300 rounded-lg p-3 h-32 resize-none mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={() => handleReject(showRejectModal)}
                  disabled={processing || !rejectReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg disabled:opacity-50"
                >
                  {processing ? 'Processing...' : 'Confirm Reject'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(null);
                    setRejectReason('');
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 font-semibold py-2 px-4 rounded-lg"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
