import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { ExternalLink, LayoutDashboard, LogOut, Menu, X } from 'lucide-react';
import { useAuth } from '../auth';
import { Brand } from '../components/ui';
import { NAV_GROUPS } from '../resources';

export default function AppShell() {
  const { email, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const closeOnEscape = (event) => event.key === 'Escape' && setMenuOpen(false);
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    navigate('/admin', { replace: true });
  }

  const initial = (email ?? 'A').charAt(0).toUpperCase();

  return (
    <div className="app-layout">
      <a className="skip-link" href="#conteudo">Pular para o conteúdo</a>

      <aside id="menu-principal" className={`sidebar ${menuOpen ? 'is-open' : ''}`} aria-label="Menu principal">
        <div className="sidebar-top">
          <Brand to="/admin/dashboard" subtitle="Painel de gestão" variant="light" />
          <button type="button" className="icon-button sidebar-close" aria-label="Fechar menu" onClick={() => setMenuOpen(false)}>
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="sidebar-nav">
          <NavLink to="/admin/dashboard" className="nav-item">
            <LayoutDashboard size={18} aria-hidden="true" /> Visão geral
          </NavLink>
          {NAV_GROUPS.map((group) => (
            <div key={group.label} className="nav-group">
              <p className="nav-heading">{group.label}</p>
              {group.items.map(({ key, label, icon: Icon }) => (
                <NavLink key={key} to={`/admin/${key}`} className="nav-item">
                  <Icon size={18} aria-hidden="true" /> {label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <a className="nav-item" href="/" target="_blank" rel="noreferrer">
            <ExternalLink size={18} aria-hidden="true" /> Ver cardápio público
          </a>
          <div className="user-card">
            <span className="avatar" aria-hidden="true">{initial}</span>
            <span className="user-info">
              <strong title={email ?? undefined}>{email ?? 'Administrador'}</strong>
              <small>Administrador</small>
            </span>
            <button type="button" className="icon-button" aria-label="Sair da conta" title="Sair da conta" onClick={handleLogout}>
              <LogOut size={18} aria-hidden="true" />
            </button>
          </div>
        </div>
      </aside>

      {menuOpen && <div className="sidebar-backdrop" aria-hidden="true" onClick={() => setMenuOpen(false)} />}

      <div className="main-area">
        <header className="mobile-topbar">
          <button
            type="button"
            className="icon-button"
            aria-label="Abrir menu"
            aria-expanded={menuOpen}
            aria-controls="menu-principal"
            onClick={() => setMenuOpen(true)}
          >
            <Menu size={20} aria-hidden="true" />
          </button>
          <Brand to="/admin/dashboard" subtitle="Painel de gestão" />
        </header>
        <main id="conteudo" className="content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
