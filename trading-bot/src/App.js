import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { GoogleOAuthProvider } from '@react-oauth/google';

import Login from './components/Login';
import Signup from './components/Signup';
import Profile from './pages/Profile';
import KYCUpload from './pages/KYCUpload';
import APIKeysManagement from './pages/APIKeysManagement';
import AdminDashboard from './pages/AdminDashboard';
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
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <TradingBot />
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
              
              <Route
                path="/admin"
                element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </div>
        </Router>
      </ThemeProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
