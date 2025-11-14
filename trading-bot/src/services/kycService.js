import api from './api';

export const kycService = {
  // Upload KYC document
  uploadDocument: async (userId, documentType, documentNumber, file) => {
    try {
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('document_type', documentType);
      formData.append('document_number', documentNumber);
      formData.append('file', file);

      const response = await api.post('/api/kyc/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get KYC status
  getStatus: async (userId) => {
    try {
      const response = await api.get(`/api/kyc/status/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user documents
  getDocuments: async (userId) => {
    try {
      const response = await api.get(`/api/kyc/documents/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};
