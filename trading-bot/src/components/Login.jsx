import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { authService } from '../services/authService';
import { TrendingUp } from 'lucide-react';

const Login = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await authService.login(formData);
      console.log('Login successful:', response);
      navigate('/');
    } catch (err) {
      console.error('Login error:', err);
      setError(err.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    console.log('Google login successful:', credentialResponse);
    
    try {
      const token = credentialResponse.credential;
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      
      const userData = JSON.parse(jsonPayload);
      
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({
        id: 1,
        email: userData.email,
        name: userData.name,
        kyc_status: 'pending',
        is_admin: false
      }));
      
      navigate('/');
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google login failed. Please try again.');
    }
  };

  const handleGoogleError = () => {
    setError('Google login failed. Please try again.');
  };

  return (
    <div className="min-h-screen flex bg-[#0a1929]">
      {/* Left Side - Login Form */}
      <div className="w-1/2 flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#0a1929] p-12">
        <div className="w-full max-w-md">
          {/* Logo and Title */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-500 rounded-full mb-4">
              <TrendingUp size={40} className="text-white" />
            </div>
            <h1 className="text-4xl font-bold text-white mb-2">
              SmartTrade Bot
            </h1>
            <p className="text-blue-300 text-lg">
              Multi-Exchange Trading Automation
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Live Binance + Upstox Integration
            </p>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500 text-red-300 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="flex items-center text-white text-sm font-medium mb-2">
                <span className="mr-2">📧</span> Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            <div>
              <label className="flex items-center text-white text-sm font-medium mb-2">
                <span className="mr-2">🔒</span> Password
              </label>
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-4 py-3 bg-[#1a2332] border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                loading
                  ? 'bg-gray-600 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <span>➜</span>
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 border-t border-gray-600"></div>
            <span className="px-4 text-gray-400 text-sm">Or continue with</span>
            <div className="flex-1 border-t border-gray-600"></div>
          </div>

          {/* Google Login */}
          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              theme="filled_blue"
              size="large"
              width="384"
            />
          </div>

          {/* Sign Up Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-400">
              Don't have an account?{' '}
              <Link to="/signup" className="text-blue-400 hover:text-blue-300 font-semibold">
                Sign Up
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Live Market Data */}
      <div className="w-1/2 bg-[#0d1b2a] p-8 overflow-y-auto">
        {/* Upstox NSE Section */}
        <div className="mb-8">
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2">
            <span>🇮🇳</span> UPSTOX NSE
          </div>
          <div className="bg-[#1a2332] p-4 rounded-b-lg grid grid-cols-2 gap-3">
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">✅ RELIANCE</div>
                <div className="text-green-400 font-bold">+2.5%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">🔻 TCS</div>
                <div className="text-red-400 font-bold">-1.2%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">✅ INFY</div>
                <div className="text-green-400 font-bold">+3.1%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">📊 SBIN</div>
                <div className="text-gray-400 font-bold">0%</div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Market Activity */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white text-xl font-bold">Live Market Activity</h3>
            <span className="bg-red-600 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
              LIVE
            </span>
          </div>
          
          {/* Candlestick Chart Placeholder */}
          <div className="bg-[#1a2332] p-6 rounded-lg h-64 flex items-end justify-around gap-2">
            {[60, 45, 70, 55, 80, 50, 65, 40, 75, 60, 85, 70, 55, 65, 50].map((height, i) => (
              <div key={i} className="flex flex-col items-center justify-end" style={{height: '100%'}}>
                <div 
                  className={`w-3 rounded ${i % 3 === 0 ? 'bg-red-500' : i % 2 === 0 ? 'bg-green-500' : 'bg-gray-600'}`}
                  style={{height: `${height}%`}}
                ></div>
              </div>
            ))}
          </div>
        </div>

        {/* Binance US Market Section */}
        <div>
          <div className="bg-blue-600 text-white px-4 py-2 rounded-t-lg font-semibold flex items-center gap-2">
            <span>🌎</span> BINANCE US MARKET
          </div>
          <div className="bg-[#1a2332] p-4 rounded-b-lg grid grid-cols-2 gap-3">
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">✅ AAPL</div>
                <div className="text-green-400 font-bold">+1.8%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">✅ GOOGL</div>
                <div className="text-green-400 font-bold">+2.3%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">🔻 MSFT</div>
                <div className="text-red-400 font-bold">-0.5%</div>
              </div>
            </div>
            <div className="bg-[#0d1b2a] p-3 rounded flex items-center justify-between">
              <div>
                <div className="text-gray-400 text-xs">✅ TSLA</div>
                <div className="text-green-400 font-bold">+3.2%</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
