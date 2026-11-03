const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export function getCredentials() {
  const token = sessionStorage.getItem('auth_token');
  return token ? { token } : null;
}

export function saveToken(token) {
  sessionStorage.setItem('auth_token', token);
}

export function clearCredentials() {
  sessionStorage.removeItem('auth_token');
}

export async function apiRequest(path, options = {}) {
  const credentials = getCredentials();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (credentials) headers.Authorization = `Bearer ${credentials.token}`;

  const response = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await response.text();
  let body = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    const message = typeof body === 'string' ? body : body?.message;
    throw new Error(message || `A API respondeu com o status ${response.status}.`);
  }
  return body;
}

export { API_URL };
