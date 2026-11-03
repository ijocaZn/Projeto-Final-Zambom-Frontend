import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import { Modal } from './ui';

/* ---------------------------------------------------------------- Toasts */

const ToastContext = createContext(null);
const TOAST_ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const regionRef = useRef(null);

  const dismiss = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const push = useCallback((toast) => {
    toastCounter += 1;
    const id = toastCounter;
    setToasts((current) => [...current.slice(-3), { ...toast, id }]);
    setTimeout(() => dismiss(id), toast.tone === 'error' ? 8000 : 4500);
  }, [dismiss]);

  const api = useMemo(() => ({
    success: (title, message) => push({ tone: 'success', title, message }),
    info: (title, message) => push({ tone: 'info', title, message }),
    error: (error, title) => {
      const isText = typeof error === 'string';
      push({
        tone: 'error',
        title: title ?? (isText ? error : error?.message ?? 'Algo deu errado.'),
        message: title && !isText ? error?.message : undefined,
        details: isText ? [] : error?.details ?? [],
      });
    },
  }), [push]);

  // A região usa a Popover API para ficar acima de diálogos modais (ambos vivem na "top layer").
  useEffect(() => {
    const region = regionRef.current;
    if (!region || typeof region.showPopover !== 'function') return;
    const isOpen = region.matches(':popover-open');
    if (toasts.length > 0) {
      if (isOpen) region.hidePopover();
      region.showPopover();
    } else if (isOpen) {
      region.hidePopover();
    }
  }, [toasts]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div ref={regionRef} className="toast-region" popover="manual" aria-live="polite">
        {toasts.map((toast) => {
          const Icon = TOAST_ICONS[toast.tone];
          return (
            <div key={toast.id} className={`toast tone-${toast.tone}`} role={toast.tone === 'error' ? 'alert' : 'status'}>
              <Icon size={19} aria-hidden="true" className="toast-icon" />
              <div className="toast-content">
                <strong>{toast.title}</strong>
                {toast.message && <p>{toast.message}</p>}
                {toast.details?.length > 0 && (
                  <ul>{toast.details.map((detail) => <li key={detail}>{detail}</li>)}</ul>
                )}
              </div>
              <button type="button" className="toast-close" aria-label="Fechar notificação" onClick={() => dismiss(toast.id)}>
                <X size={15} aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de <ToastProvider>.');
  return context;
}

/* ------------------------------------------------- Confirmação / entrada */

const ConfirmContext = createContext(null);

/**
 * `confirm({ title, message, confirmLabel, tone })` resolve `true`/`false`.
 * Com `input: { label, type, ... }` resolve o valor digitado ou `null` se cancelado.
 */
export function ConfirmProvider({ children }) {
  const [request, setRequest] = useState(null);

  const confirm = useCallback(
    (options) => new Promise((resolve) => setRequest({ ...options, resolve })),
    [],
  );

  const finish = (value) => {
    request.resolve(value);
    setRequest(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {request && <ConfirmDialog {...request} onFinish={finish} />}
    </ConfirmContext.Provider>
  );
}

function ConfirmDialog({ title, message, confirmLabel = 'Confirmar', cancelLabel = 'Voltar', tone = 'primary', input, onFinish }) {
  const [value, setValue] = useState(input?.defaultValue ?? '');
  const cancelValue = input ? null : false;

  return (
    <Modal title={title} size="sm" onClose={() => onFinish(cancelValue)}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onFinish(input ? value : true);
        }}
      >
        {message && <p className="confirm-message">{message}</p>}
        {input && (
          <div className="field">
            <label htmlFor="confirm-input">{input.label}</label>
            <div className={input.suffix ? 'input-affix' : undefined}>
              <input
                id="confirm-input"
                type={input.type ?? 'text'}
                min={input.min}
                max={input.max}
                step={input.step}
                required
                value={value}
                onChange={(event) => setValue(event.target.value)}
                data-autofocus
              />
              {input.suffix && <span>{input.suffix}</span>}
            </div>
            {input.hint && <p className="field-hint">{input.hint}</p>}
          </div>
        )}
        <div className="modal-actions">
          <button type="button" className="button ghost" onClick={() => onFinish(cancelValue)} data-autofocus={input ? undefined : true}>
            {cancelLabel}
          </button>
          <button type="submit" className={`button ${tone === 'danger' ? 'danger' : 'primary'}`}>
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm precisa estar dentro de <ConfirmProvider>.');
  return context;
}
