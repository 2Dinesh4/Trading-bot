import React, { useState } from 'react';
import { kycService } from '../services/kycService';
import { authService } from '../services/authService';

const KYCUploadForm = ({ onUploadSuccess }) => {
  const [formData, setFormData] = useState({
    documentType: 'aadhar',
    documentNumber: '',
    file: null
  });
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = authService.getCurrentUser();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        return;
      }
      setFormData({ ...formData, file });
      setError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.file) {
      setError('Please select a file to upload');
      return;
    }

    if (!formData.documentNumber) {
      setError('Please enter document number');
      return;
    }

    setUploading(true);

    try {
      await kycService.uploadDocument(
        user.id,
        formData.documentType,
        formData.documentNumber,
        formData.file
      );

      setSuccess('Document uploaded successfully! ✅');
      setFormData({
        documentType: 'aadhar',
        documentNumber: '',
        file: null
      });

      // Reset file input
      document.getElementById('fileInput').value = '';

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (error) {
      setError(error.detail || 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-4">Upload KYC Documents</h2>

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

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Type
          </label>
          <select
            value={formData.documentType}
            onChange={(e) => setFormData({ ...formData, documentType: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="aadhar">Aadhar Card</option>
            <option value="pan">PAN Card</option>
            <option value="passport">Passport</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Document Number
          </label>
          <input
            type="text"
            value={formData.documentNumber}
            onChange={(e) => setFormData({ ...formData, documentNumber: e.target.value })}
            placeholder="Enter document number"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Document (Max 5MB)
          </label>
          <input
            id="fileInput"
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          />
          <p className="text-sm text-gray-500 mt-1">
            Supported formats: JPG, PNG, PDF
          </p>
        </div>

        <button
          type="submit"
          disabled={uploading}
          className={`w-full py-2 px-4 rounded-md font-semibold ${
            uploading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {uploading ? 'Uploading...' : 'Upload Document'}
        </button>
      </form>
    </div>
  );
};

export default KYCUploadForm;
