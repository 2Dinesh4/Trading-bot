import api from './api';

export const apiKeysService = {
  // Create new API key
  createKey: async (userId, keyData) => {
    try {
      const response = await api.post(`/api/keys/?user_id=${userId}`, keyData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Get user API keys
  getUserKeys: async (userId) => {
    try {
      const response = await api.get(`/api/keys/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Update API key
  updateKey: async (keyId, updateData) => {
    try {
      const response = await api.put(`/api/keys/${keyId}`, updateData);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  },

  // Delete API key
  deleteKey: async (keyId) => {
    try {
      const response = await api.delete(`/api/keys/${keyId}`);
      return response.data;
    } catch (error) {
      throw error.response?.data || error;
    }
  }
};
