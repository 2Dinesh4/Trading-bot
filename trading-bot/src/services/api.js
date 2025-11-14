import axios from 'axios';

// Backend URL
const API_BASE_URL = 'http://localhost:10152';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Get live price for a trading pair
export const getLivePrice = async (symbol) => {
  try {
    const response = await api.get(`/api/price/${symbol}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching price for ${symbol}:`, error);
    throw error;
  }
};

// Get account balance
export const getBalance = async () => {
  try {
    const response = await api.get('/api/balance');
    return response.data;
  } catch (error) {
    console.error('Error fetching balance:', error);
    throw error;
  }
};

// Place buy order
export const placeBuyOrder = async (symbol, quantity) => {
  try {
    const response = await api.post('/api/order/buy', {
      symbol,
      quantity
    });
    return response.data;
  } catch (error) {
    console.error('Error placing buy order:', error);
    throw error;
  }
};

// Place sell order
export const placeSellOrder = async (symbol, quantity) => {
  try {
    const response = await api.post('/api/order/sell', {
      symbol,
      quantity
    });
    return response.data;
  } catch (error) {
    console.error('Error placing sell order:', error);
    throw error;
  }
};

// Check health
export const checkHealth = async () => {
  try {
    const response = await api.get('/api/health');
    return response.data;
  } catch (error) {
    console.error('Error checking health:', error);
    throw error;
  }
};

export default api;
