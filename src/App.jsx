import React from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { RequireAuth, useAuth } from './auth';
import AppShell from './layout/AppShell';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import PublicMenu from './pages/PublicMenu';
import ResourcePage from './pages/ResourcePage';

function LoginRoute() {
  const { token } = useAuth();
  return token ? <Navigate to="/admin/dashboard" replace /> : <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<PublicMenu />} />
      <Route path="/cardapios" element={<PublicMenu section="cardapio" />} />
      <Route path="/produtos" element={<PublicMenu section="cardapio" />} />
      <Route path="/mesas" element={<PublicMenu section="mesas" />} />

      <Route path="/admin" element={<LoginRoute />} />
      <Route element={<RequireAuth><AppShell /></RequireAuth>}>
        <Route path="/admin/dashboard" element={<Dashboard />} />
        <Route path="/admin/:resource" element={<ResourcePage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
