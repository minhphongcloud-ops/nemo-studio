/**
 * API helper — HTTP requests to backend server.
 */
const BASE = '/api';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Request failed');
  }
  return res.json();
}

export const api = {
  // Accounts
  getAccounts: () => request('GET', '/accounts'),
  addAccount: (data) => request('POST', '/accounts', data),
  updateAccount: (id, data) => request('PUT', `/accounts/${id}`, data),
  deleteAccount: (id) => request('DELETE', `/accounts/${id}`),
  selectAccount: (id) => request('POST', `/accounts/${id}/select`),

  // Rules
  getRules: () => request('GET', '/rules'),
  addRule: (data) => request('POST', '/rules', data),
  updateRule: (id, data) => request('PUT', `/rules/${id}`, data),
  deleteRule: (id) => request('DELETE', `/rules/${id}`),
  reorderRules: (ids) => request('POST', '/rules/reorder', { ids }),

  // Dances
  getDances: () => request('GET', '/dances'),
  addDance: (data) => request('POST', '/dances', data),
  updateDance: (id, data) => request('PUT', `/dances/${id}`, data),
  deleteDance: (id) => request('DELETE', `/dances/${id}`),

  // Settings
  getSettings: () => request('GET', '/settings'),
  updateSettings: (data) => request('PUT', '/settings', data),

  // Engine
  getEngineState: () => request('GET', '/engine/state'),
};
