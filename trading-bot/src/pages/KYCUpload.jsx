import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function KYCUpload() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [kycData, setKycData] = useState({
    documentType: '',
    documentNumber: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        setUser(userData);
      } catch (error) {
        console.error('Error parsing user data:', error);
        navigate('/login');
      }
    } else {
      navigate('/login');
    }
    setLoading(false);
  }, [navigate]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const getStatusBadge = () => {
    const status = user?.kyc_status || 'pending';
    switch(status) {
      case 'approved':
        return (<div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg"><CheckCircle className="w-5 h-5" /> <span className="font-semibold">KYC Approved ✅</span></div>);
      case 'submitted':
        return (<div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg"><Clock className="w-5 h-5" /> <span className="font-semibold">KYC Pending Review ⏳</span></div>);
      case 'rejected':
        return (<div className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg"><XCircle className="w-5 h-5" /> <span className="font-semibold">KYC Rejected ❌</span></div>);
      default:
        return (<div className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg"><FileText className="w-5 h-5" /> <span className="font-semibold">KYC Not Submitted ⚠️</span></div>);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setMessage('File size must be less than 5MB');
        return;
      }
      setKycData({ ...kycData, file });
      setMessage('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!kycData.documentType || !kycData.documentNumber || !kycData.file) {
      setMessage('Please fill all fields and upload a document');
      return;
    }

    setUploading(true);
    setMessage('');

    const controller = new AbortController();
    const timeoutId = setTimeout(() => { controller.abort(); }, 30000); // 30 sec timeout

    try {
      const formData = new FormData();
      formData.append('document_type', kycData.documentType);
      formData.append('document_number', kycData.documentNumber);
      formData.append('file', kycData.file);

      const token = localStorage.getItem('token');

      const response = await fetch('http://localhost:10152/api/kyc/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (response.ok) {
        setMessage('KYC document uploaded successfully! ✅');
        const updatedUser = { ...user, kyc_status: 'submitted' };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUser(updatedUser);
        setTimeout(() => { navigate('/trading-bot'); }, 2000);
      } else {
        let errorMsg = 'Upload failed. Please try again.';
        if (data.detail) {
          if (Array.isArray(data.detail)) {
            errorMsg = data.detail.map(err => `${err.loc[1]}: ${err.msg}`).join(', ');
          } else if (typeof data.detail === 'string') {
            errorMsg = data.detail;
          } else if (typeof data.detail === 'object') {
            errorMsg = JSON.stringify(data.detail);
          }
        }
        setMessage(errorMsg);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        setMessage('Upload timed out. Please try a smaller file or better connection.');
      } else {
        setMessage('Network error. Please check your connection.');
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <button onClick={() => navigate('/trading-bot')} className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2">← Back to Dashboard</button>
          <h1 className="text-3xl font-bold text-white mb-2">KYC Verification</h1>
          <p className="text-gray-400">Upload your identity documents for verification</p>
        </div>
        <div className="mb-6">{getStatusBadge()}</div>
        {user.kyc_status !== 'approved' && (
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <h2 className="text-xl font-bold text-white mb-6">Upload Documents</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-white font-semibold mb-2">Document Type</label>
                <select value={kycData.documentType} onChange={e => setKycData({ ...kycData, documentType: e.target.value })} className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500" required>
                  <option value="">Select Document Type</option>
                  <option value="aadhar">Aadhar Card</option>
                  <option value="pan">PAN Card</option>
                  <option value="passport">Passport</option>
                  <option value="driving_license">Driving License</option>
                </select>
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Document Number</label>
                <input type="text" value={kycData.documentNumber} onChange={e => setKycData({ ...kycData, documentNumber: e.target.value })} placeholder="Enter document number" className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500" required />
              </div>
              <div>
                <label className="block text-white font-semibold mb-2">Upload Document (Image or PDF)</label>
                <input type="file" onChange={handleFileChange} accept="image/*,.pdf" className="w-full px-4 py-3 bg-gray-700 text-white rounded-lg border border-gray-600 focus:outline-none focus:border-blue-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:cursor-pointer hover:file:bg-blue-700" required />
                {kycData.file && (
                  <p className="text-green-400 mt-2 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" /> File selected: {kycData.file.name} ({(kycData.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <button type="submit" disabled={uploading} className={`w-full py-3 rounded-lg font-semibold text-white transition-colors ${uploading ? 'bg-gray-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}>{uploading ? 'Uploading...' : 'Upload KYC Document'}</button>
              {message && (
                <div className={`p-4 rounded-lg font-semibold ${message.includes('success') || message.includes('✅') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {message}
                </div>
              )}
            </form>
          </div>
        )}
        {user.kyc_status === 'approved' && (
          <div className="bg-green-900/20 border-2 border-green-500 rounded-lg p-8 text-center">
            <CheckCircle className="w-20 h-20 text-green-400 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">KYC Already Approved!</h2>
            <p className="text-gray-300 text-lg">Your account is fully verified and ready to trade.</p>
            <button onClick={() => navigate('/trading-bot')} className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold">Go to Dashboard</button>
          </div>
        )}
        <div className="mt-8 bg-blue-900/20 border border-blue-500 rounded-lg p-6">
          <h3 className="text-white font-bold mb-3">📋 Document Requirements:</h3>
          <ul className="text-gray-300 space-y-2">
            <li>• Document must be clear and readable</li>
            <li>• Accepted formats: JPG, PNG, PDF</li>
            <li>• Maximum file size: 5MB</li>
            <li>• Document should not be expired</li>
            <li>• All details must be visible</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
