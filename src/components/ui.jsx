import React, { useEffect, useId, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CircleAlert, Inbox, LoaderCircle, RefreshCw, X } from 'lucide-react';
import { STATUS_TONES, enumLabel } from '../format';

export function Spinner({ size = 18, className = '' }) {
  return <LoaderCircle className={`spin ${className}`} size={size} aria-hidden="true" />;
}

export function SlowServerHint() {
  return (
    <p className="slow-hint" role="status">
      O servidor gratuito pode levar até um minuto para iniciar na primeira visita. Obrigado pela paciência!
    </p>
  );
}

export function LoadingState({ label = 'Carregando…', slow = false }) {
  return (
    <div className="state-block" aria-busy="true">
      <Spinner size={26} className="state-spinner" />
      <span>{label}</span>
      {slow && <SlowServerHint />}
    </div>
  );
}

export function EmptyState({ icon: Icon = Inbox, title, children, action }) {
  return (
    <div className="state-block">
      <span className="state-icon"><Icon size={22} aria-hidden="true" /></span>
      <strong>{title}</strong>
      {children && <span>{children}</span>}
      {action}
    </div>
  );
}

export function ErrorState({ title = 'Não foi possível carregar os dados', error, onRetry }) {
  return (
    <div className="state-block is-error" role="alert">
      <span className="state-icon"><CircleAlert size={22} aria-hidden="true" /></span>
      <strong>{title}</strong>
      {error?.message && <span>{error.message}</span>}
      {onRetry && (
        <button type="button" className="button secondary small" onClick={onRetry}>
          <RefreshCw size={15} aria-hidden="true" /> Tentar novamente
        </button>
      )}
    </div>
  );
}

export function ErrorAlert({ error, title }) {
  if (!error) return null;
  return (
    <div className="alert is-error" role="alert">
      <CircleAlert size={18} aria-hidden="true" />
      <div>
        <strong>{title ?? error.message}</strong>
        {title && <p>{error.message}</p>}
        {error.details?.length > 0 && (
          <ul>{error.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
        )}
      </div>
    </div>
  );
}

export function Badge({ tone = 'neutral', children }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

export function StatusBadge({ value, group }) {
  return <Badge tone={STATUS_TONES[value] ?? 'neutral'}>{enumLabel(group, value)}</Badge>;
}

export function IconButton({ label, icon: Icon, tone, busy = false, disabled = false, disabledReason, onClick }) {
  const isDisabled = disabled || busy;
  const title = disabled && disabledReason ? disabledReason : label;
  return (
    <button
      type="button"
      className={`icon-button ${tone ? `tone-${tone}` : ''}`}
      aria-label={label}
      title={title}
      disabled={isDisabled}
      onClick={onClick}
    >
      {busy ? <Spinner size={17} /> : <Icon size={17} aria-hidden="true" />}
    </button>
  );
}

export function Brand({ to = '/', subtitle = 'Cardápio digital', variant = 'dark' }) {
  return (
    <Link to={to} className={`brand brand-${variant}`}>
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32">
          <rect width="32" height="32" rx="9" fill="#F2A93B" />
          <circle cx="16" cy="16" r="8" fill="none" stroke="#16241D" strokeWidth="2.4" />
          <circle cx="16" cy="16" r="3" fill="#16241D" />
        </svg>
      </span>
      <span className="brand-text">
        <strong>Comanda</strong>
        <small>{subtitle}</small>
      </span>
    </Link>
  );
}

export function PageHeader({ icon: Icon, eyebrow, title, description, actions }) {
  return (
    <header className="page-header">
      <div className="page-header-main">
        {Icon && <span className="page-icon"><Icon size={22} aria-hidden="true" /></span>}
        <div>
          {eyebrow && <p className="eyebrow">{eyebrow}</p>}
          <h1>{title}</h1>
          {description && <p className="page-description">{description}</p>}
        </div>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

/**
 * Janela modal baseada em <dialog>: foco preso, Esc fecha e o restante da página fica inerte.
 * O foco inicial vai para o elemento com `data-autofocus` ou para o primeiro campo.
 */
export function Modal({ title, description, size = 'md', onClose, children }) {
  const ref = useRef(null);
  const pressStartedOnBackdrop = useRef(false);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog.open) dialog.showModal();
    const target = dialog.querySelector('[data-autofocus]') ?? dialog.querySelector('.modal-body :is(input, select, textarea)');
    target?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={`modal modal-${size}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        // O navegador pode fechar o diálogo por conta própria (ex.: Esc repetido); mantém o estado em sincronia.
        if (!ref.current?.open) onClose();
      }}
      onMouseDown={(event) => {
        pressStartedOnBackdrop.current = event.target === ref.current;
      }}
      onClick={(event) => {
        if (event.target === ref.current && pressStartedOnBackdrop.current) onClose();
      }}
    >
      <div className="modal-panel">
        <header className="modal-header">
          <div>
            <h2 id={titleId}>{title}</h2>
            {description && <p>{description}</p>}
          </div>
          <button type="button" className="icon-button" aria-label="Fechar" onClick={onClose}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
      </div>
    </dialog>
  );
}
