const DEFAULT_API_URL = 'https://projeto-final-zambom.onrender.com';

export const API_URL = (import.meta.env.VITE_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');

const TOKEN_KEY = 'auth_token';

/** Disparado quando a API recusa o token salvo (expirado ou inválido). */
export const SESSION_EXPIRED_EVENT = 'auth:session-expired';

export function getToken() {
  try {
    return window.sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function saveToken(token) {
  try {
    window.sessionStorage.setItem(TOKEN_KEY, token);
  } catch {
    // Armazenamento indisponível (ex.: modo privado): a sessão vale só enquanto a aba estiver aberta.
  }
}

export function clearToken() {
  try {
    window.sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // Nada a limpar.
  }
}

/** Lê o payload do JWT (sem validar a assinatura, que é papel da API). */
export function decodeToken(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    const payload = JSON.parse(new TextDecoder().decode(bytes));
    return {
      email: typeof payload.sub === 'string' ? payload.sub : null,
      expiresAt: typeof payload.exp === 'number' ? payload.exp * 1000 : null,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const session = decodeToken(token);
  return !session || (session.expiresAt != null && session.expiresAt <= Date.now());
}

export class ApiError extends Error {
  constructor(message, { status = 0, details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

const STATUS_MESSAGES = {
  400: 'Os dados enviados são inválidos.',
  401: 'E-mail ou senha incorretos.',
  403: 'Você não tem permissão para realizar esta ação.',
  404: 'Registro não encontrado.',
  409: 'A operação conflita com dados existentes.',
  500: 'O servidor encontrou um erro. Tente novamente em instantes.',
  502: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  503: 'O servidor está indisponível no momento. Tente novamente em instantes.',
  504: 'O servidor demorou para responder. Tente novamente em instantes.',
};

function parseBody(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function errorFromResponse(status, body) {
  const details = Array.isArray(body?.errors)
    ? body.errors.map((detail) => String(detail).replace(/^[\w.[\]]+:\s*/, ''))
    : [];
  const plainText = typeof body === 'string' && !body.trimStart().startsWith('<') ? body.trim() : '';
  const message = plainText || body?.message || STATUS_MESSAGES[status] || `A API respondeu com o status ${status}.`;
  return new ApiError(message, { status, details });
}

/**
 * Faz uma chamada à API.
 * - `body` é serializado como JSON automaticamente.
 * - `auth: false` não envia o token (usado nas páginas públicas e no login).
 */
export async function apiRequest(path, { method = 'GET', body, auth = true, signal } = {}) {
  const token = auth ? getToken() : null;
  const headers = { Accept: 'application/json' };
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;

  let response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new ApiError('Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.');
  }

  const data = parseBody(await response.text());

  if (response.status === 401 && token) {
    clearToken();
    window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
    throw new ApiError('Sua sessão expirou. Entre novamente para continuar.', { status: 401 });
  }

  if (!response.ok) throw errorFromResponse(response.status, data);
  return data;
}
