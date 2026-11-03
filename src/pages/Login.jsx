import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CalendarDays, Clock, Eye, EyeOff, Receipt, UtensilsCrossed } from 'lucide-react';
import { apiRequest } from '../api';
import { useAuth } from '../auth';
import { useToast } from '../components/feedback';
import { Brand, ErrorAlert, SlowServerHint, Spinner } from '../components/ui';
import { useDocumentTitle, useSlowFlag } from '../hooks';

const HIGHLIGHTS = [
  { icon: Receipt, title: 'Pedidos e contas', text: 'Abra pedidos por mesa, lance itens e feche a conta em poucos cliques.' },
  { icon: CalendarDays, title: 'Reservas organizadas', text: 'Veja as próximas reservas e evite conflitos de horário.' },
  { icon: UtensilsCrossed, title: 'Cardápio sempre em dia', text: 'Preços, descontos e disponibilidade refletem na hora no cardápio público.' },
];

export default function Login() {
  const { login, sessionExpired } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', senha: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const slow = useSlowFlag(submitting, 5000);
  const isRegister = mode === 'register';
  useDocumentTitle(isRegister ? 'Criar acesso' : 'Entrar');

  function switchMode(nextMode) {
    setMode(nextMode);
    setError(null);
  }

  async function submit(event) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    const credentials = { email: form.email.trim(), senha: form.senha };
    try {
      if (isRegister) {
        await apiRequest('/usuarios', { method: 'POST', body: credentials, auth: false });
        setMode('login');
      }
      const response = await apiRequest('/login', { method: 'POST', body: credentials, auth: false });
      if (!response?.token) throw new Error('A API não retornou um token de acesso.');
      login(response.token);
      if (isRegister) toast.success('Acesso criado!', 'Bem-vindo ao painel do restaurante.');
      navigate(location.state?.from ?? '/admin/dashboard', { replace: true });
    } catch (requestError) {
      setError(requestError);
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <aside className="login-showcase" aria-hidden="true">
        <Brand subtitle="Painel de gestão" variant="light" />
        <div className="showcase-copy">
          <p className="eyebrow">Gestão do restaurante</p>
          <h2>Tudo o que acontece no salão, em um só lugar.</h2>
          <ul className="showcase-list">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <li key={title}>
                <span><Icon size={18} /></span>
                <div><strong>{title}</strong><p>{text}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <p className="showcase-foot"><Clock size={14} /> Sessões expiram após 1 hora por segurança.</p>
      </aside>

      <main className="login-main">
        <div className="login-card">
          <div className="login-card-brand"><Brand subtitle="Painel de gestão" /></div>
          <h1>{isRegister ? 'Crie seu acesso' : 'Bem-vindo de volta'}</h1>
          <p className="page-description">
            {isRegister ? 'Cadastre um e-mail e uma senha para acessar o painel.' : 'Entre com seu e-mail e senha para gerenciar o restaurante.'}
          </p>

          <div className="segmented" role="group" aria-label="Tipo de acesso">
            <button type="button" aria-pressed={!isRegister} className={!isRegister ? 'is-active' : ''} onClick={() => switchMode('login')}>
              Entrar
            </button>
            <button type="button" aria-pressed={isRegister} className={isRegister ? 'is-active' : ''} onClick={() => switchMode('register')}>
              Criar acesso
            </button>
          </div>

          {sessionExpired && !error && (
            <div className="alert is-info" role="status">
              <Clock size={18} aria-hidden="true" />
              <div><strong>Sua sessão expirou.</strong><p>Entre novamente para continuar de onde parou.</p></div>
            </div>
          )}

          <form className="login-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="login-email">E-mail</label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="username"
                placeholder="voce@restaurante.com"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="login-senha">Senha</label>
              <div className="password-field">
                <input
                  id="login-senha"
                  type={showPassword ? 'text' : 'password'}
                  required
                  minLength={isRegister ? 6 : undefined}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  aria-describedby={isRegister ? 'login-senha-hint' : undefined}
                  value={form.senha}
                  onChange={(event) => setForm({ ...form, senha: event.target.value })}
                />
                <button
                  type="button"
                  className="icon-button"
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  aria-pressed={showPassword}
                  onClick={() => setShowPassword((value) => !value)}
                >
                  {showPassword ? <EyeOff size={17} aria-hidden="true" /> : <Eye size={17} aria-hidden="true" />}
                </button>
              </div>
              {isRegister && <p id="login-senha-hint" className="field-hint">Mínimo de 6 caracteres.</p>}
            </div>

            <ErrorAlert error={error} />

            <button className="button primary large" type="submit" disabled={submitting}>
              {submitting && <Spinner size={17} />}
              {submitting ? (isRegister ? 'Criando acesso…' : 'Entrando…') : isRegister ? 'Criar acesso e entrar' : 'Entrar no painel'}
            </button>
            {slow && <SlowServerHint />}
          </form>

          <Link to="/" className="back-link"><ArrowLeft size={15} aria-hidden="true" /> Ver o cardápio público</Link>
        </div>
      </main>
    </div>
  );
}
