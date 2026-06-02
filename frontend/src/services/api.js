// In production (Railway), VITE_API_URL is not needed — the frontend is served
// by the same Express server, so we use relative paths (/api/...).
// In development, Vite's proxy (vite.config.js) forwards /api → localhost:5000.
// If VITE_API_URL is explicitly set, it takes priority (useful for pointing at a
// separate backend server).
const API = (import.meta.env.VITE_API_URL || '') + '/api';

const req = async (url, opts = {}) => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); // 20s timeout
  try {
    const res = await fetch(`${API}${url}`, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Server error: ${res.status}`);
      return text;
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server took too long to respond. Please try again.');
    }
    // 'Failed to fetch' means the server is unreachable (network down, server crashed, wrong URL, etc.)
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      console.error('Network Error: Could not connect to API at', API);
      throw new Error('Network Error: Could not reach the server. Please check your internet connection.');
    }
    throw err;
  }
};

const sanitizeParams = (p) => {
  if (!p) return {};
  const params = { ...p };
  // Pass startDate and endDate directly.
  // The backend's parseDateBoundary handles length-10 (date only) by auto-padding local midnights,
  // and parses length-16 (datetime-local) locally matching ISO.
  return params;
};

export const api = {
  login: (body) => req('/auth/login', { method: 'POST', body }),
  getConfig: () => req('/admin/config'),
  updateConfig: (body) => req('/admin/config', { method: 'POST', body }),
  getMOs: (params = {}) => req('/mos?' + new URLSearchParams(sanitizeParams(params)).toString()),
  createMO: (body) => req('/mos', { method: 'POST', body }),
  updateMO: (id, body) => req(`/mos/${id}`, { method: 'PUT', body }),
  deleteMO: (id) => req(`/mos/${id}`, { method: 'DELETE' }),
  parseSKU: (body) => req('/mos/parse-sku', { method: 'POST', body }),
  getStats: (params = {}) => req('/stats?' + new URLSearchParams(sanitizeParams(params)).toString()),
  getReport: (params = {}) => req('/stats/report?' + new URLSearchParams(sanitizeParams(params)).toString()),
  getUsers: () => req('/admin/users'),
  createUser: (body) => req('/admin/users', { method: 'POST', body }),
  updateUser: (id, body) => req(`/admin/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => req(`/admin/users/${id}`, { method: 'DELETE' }),
  getComponents: () => req('/admin/components'),
  manageComponent: (body) => req('/admin/components/manage', { method: 'POST', body }),
  getAudit: (params = {}) => req('/admin/audit?' + new URLSearchParams(sanitizeParams(params)).toString()),
  deleteAuditLogs: (params) => req('/admin/audit?' + new URLSearchParams(sanitizeParams(params)).toString(), { method: 'DELETE' }),
  getScrap: (params = {}) => req('/scrap?' + new URLSearchParams(sanitizeParams(params)).toString()),
  createScrap: (body) => req('/scrap', { method: 'POST', body }),
  updateScrap: (id, body) => req(`/scrap/${id}`, { method: 'PUT', body }),
  deleteScrap: (id) => req(`/scrap/${id}`, { method: 'DELETE' }),
  exportScrapUrl: (params = {}) => `${API}/scrap/export?${new URLSearchParams(sanitizeParams(params)).toString()}`,
  getReturns: (params = {}) => req('/returns?' + new URLSearchParams(sanitizeParams(params)).toString()),
  createReturn: (body) => req('/returns', { method: 'POST', body }),
  deleteReturn: (id) => req(`/returns/${id}`, { method: 'DELETE' }),
  replenishReturn: (id, body) => req(`/returns/${id}/replenish`, { method: 'PUT', body }),
  bulkDbAction: (body) => req('/admin/db/action', { method: 'POST', body }),
  getTrash: () => req('/admin/trash'),
  bulkTrashAction: (body) => req('/admin/trash/action', { method: 'POST', body }),
  wipeAll: (body) => req('/admin/wipe-all', { method: 'POST', body }),
  getRework: (params = {}) => req('/rework?' + new URLSearchParams(sanitizeParams(params)).toString()),
  createRework: (body) => req('/rework', { method: 'POST', body }),
  updateRework: (id, body) => req(`/rework/${id}`, { method: 'PUT', body }),
  deleteRework: (id) => req(`/rework/${id}`, { method: 'DELETE' }),
  exportReworkUrl: (params = {}) => `${API}/rework/export?${new URLSearchParams(sanitizeParams(params)).toString()}`,
  getRnd: (params = {}) => req('/rnd/entries?' + new URLSearchParams(sanitizeParams(params)).toString()),
  createRndEntry: (body) => req('/rnd/entries', { method: 'POST', body }),
  updateRndEntry: (id, body) => req(`/rnd/entries/${id}`, { method: 'PUT', body }),
  deleteRndEntry: (id, body) => req(`/rnd/entries/${id}`, { method: 'DELETE', body }),
  getRndProducts: () => req('/rnd/products'),
  createRndProduct: (body) => req('/rnd/products', { method: 'POST', body }),
  updateRndProduct: (id, body) => req(`/rnd/products/${id}`, { method: 'PUT', body }),
  deleteRndProduct: (id) => req(`/rnd/products/${id}`, { method: 'DELETE' }),
  exportRndUrl: (params = {}) => `${API}/rnd/export?${new URLSearchParams(sanitizeParams(params)).toString()}`,
  exportWipUrl: (params = {}) => `${API}/stats/wip-excel?${new URLSearchParams(sanitizeParams(params)).toString()}`,
  exportBackupUrl: () => `${API}/admin/backup`,
};
