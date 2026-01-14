import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Login } from './pages/Login';
import { Register } from './pages/Register';

import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { GiveTakePage } from './pages/GiveTakePage';
import { ErrorBoundary } from './components/ErrorBoundary';

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div>Loading...</div>;
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
          <Route
            path="/give-take"
            element={
              <PrivateRoute>
                <ErrorBoundary>
                  <Layout>
                    <GiveTakePage />
                  </Layout>
                </ErrorBoundary>
              </PrivateRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
