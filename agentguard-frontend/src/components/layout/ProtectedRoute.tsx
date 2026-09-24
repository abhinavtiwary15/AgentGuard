import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getAuthToken } from '../../api/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const token = getAuthToken();
  const location = useLocation();

  if (!token) {
    // Redirect to /login while preserving the attempted location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};
