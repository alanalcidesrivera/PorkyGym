import { Navigate, Outlet } from 'react-router-dom';

export const ProtectedRoute = () => {
  const token = localStorage.getItem('access_token');

  // Si no hay token de acceso, lo redirige al login
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};