import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './pages/Profile';
import KYCUpload from './pages/KYCUpload';
import APIKeysManagement from './pages/APIKeysManagement';
import AdminKYC from './pages/AdminKYC';
import TradingBot from './pages/TradingBot';
import ProtectedRoute from './components/ProtectedRoute';

// ✅ Your Google Client ID
const GOOGLE_CLIENT_ID = "123918068153-lp753gducn2ogetdjsbpdc27sp5cludt.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <ThemeProvider>
        <Router>
          <div className="App">
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              {/* ✅ Explicit Trading Bot Route */}
              <Route
                path="/trading-bot"
                element={
                  <ProtectedRoute>
                    <TradingBot />
                  </ProtectedRoute>
                }
              />

              {/* Default Redirect to Trading Bot */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Navigate to="/trading-bot" replace />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/kyc-upload"
                element={
                  <ProtectedRoute>
                    <KYCUpload />
                  </ProtectedRoute>
                }
              />
              
              <Route
                path="/api-keys"
                element={
                  <ProtectedRoute>
                    <APIKeysManagement />
                  </ProtectedRoute>
                }
              />
              
              {/* ✅ ADMIN KYC ROUTE */}
              <Route
                path="/admin/kyc"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminKYC />
                  </ProtectedRoute>
                }
              />
              
              {/* Catch-all: Send unknown paths to Login */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;