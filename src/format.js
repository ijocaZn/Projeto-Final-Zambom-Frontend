export const ENUM_LABELS = {
  categoria: {
    ENTRADA: 'Entrada',
    PRATO_PRINCIPAL: 'Prato principal',
    ACOMPANHAMENTO: 'Acompanhamento',
    SOBREMESA: 'Sobremesa',
    BEBIDA: 'Bebida',
  },
  metodo: {
    PIX: 'Pix',
    DINHEIRO: 'Dinheiro',
    CARTAO_CREDITO: 'Cartão de crédito',
    CARTAO_DEBITO: 'Cartão de débito',
  },
  cargo: {
    GERENTE: 'Gerente',
    GARCOM: 'Garçom',
    COZINHEIRO: 'Cozinheiro',
    CAIXA: 'Caixa',
  },
  statusMesa: { LIVRE: 'Livre', OCUPADA: 'Ocupada' },
  statusPedido: { ABERTO: 'Aberto', FECHADO: 'Fechado', CANCELADO: 'Cancelado' },
  statusReserva: { CONFIRMADA: 'Confirmada', CONCLUIDA: 'Concluída', CANCELADA: 'Cancelada' },
  statusPagamento: { PAGO: 'Pago', PENDENTE: 'Pendente', CANCELADO: 'Cancelado' },
};

export const CATEGORY_ORDER = Object.keys(ENUM_LABELS.categoria);

export const CATEGORY_PLURAL = {
  ENTRADA: 'Entradas',
  PRATO_PRINCIPAL: 'Pratos principais',
  ACOMPANHAMENTO: 'Acompanhamentos',
  SOBREMESA: 'Sobremesas',
  BEBIDA: 'Bebidas',
};

export const STATUS_TONES = {
  LIVRE: 'success',
  OCUPADA: 'warning',
  ABERTO: 'info',
  FECHADO: 'success',
  CANCELADO: 'neutral',
  CONFIRMADA: 'success',
  CONCLUIDA: 'info',
  CANCELADA: 'neutral',
  PAGO: 'success',
  PENDENTE: 'warning',
};

export function capitalize(text) {
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

/** "PRATO_PRINCIPAL" -> "Prato principal" (fallback para valores sem rótulo). */
export function humanize(value) {
  return capitalize(String(value).toLowerCase().replace(/_/g, ' '));
}

export function enumLabel(group, value) {
  if (value == null || value === '') return '—';
  return ENUM_LABELS[group]?.[value] ?? humanize(value);
}

export function enumOptions(group) {
  return Object.entries(ENUM_LABELS[group] ?? {}).map(([value, label]) => ({ value, label }));
}

/** Remove acentos e caixa para buscas ("cardapio" encontra "Cardápio"). */
export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

const currencyFormat = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function formatCurrency(value) {
  if (value == null || value === '' || Number.isNaN(Number(value))) return '—';
  return currencyFormat.format(Number(value));
}

/**
 * Interpreta LocalDate/LocalDateTime da API como horário local.
 * (`new Date("2026-11-03")` seria tratado como UTC e mostraria o dia anterior no Brasil.)
 */
export function parseLocalDateTime(value) {
  if (!value) return null;
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  const [, year, month, day, hour = '0', minute = '0', second = '0'] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute), Number(second));
}

const dateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});
const shortDateTimeFormat = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const dateFormat = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const timeFormat = new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit' });

export function formatDateTime(value) {
  const date = parseLocalDateTime(value);
  return date ? dateTimeFormat.format(date) : '—';
}

export function formatShortDateTime(value) {
  const date = parseLocalDateTime(value);
  return date ? shortDateTimeFormat.format(date).replace('.', '') : '—';
}

export function formatDate(value) {
  const date = parseLocalDateTime(value);
  return date ? dateFormat.format(date) : '—';
}

export function formatTime(value) {
  const date = parseLocalDateTime(value);
  return date ? timeFormat.format(date) : '—';
}

export function formatToday() {
  const text = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  return capitalize(text);
}

export function formatCpf(value) {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return value || '—';
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

export function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

/** Valor aceito por <input type="datetime-local"> (yyyy-MM-ddTHH:mm). */
export function toDateTimeInput(value) {
  return value ? String(value).slice(0, 16) : '';
}

export function nowDateTimeInput() {
  const now = new Date();
  const pad = (number) => String(number).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

export function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}
