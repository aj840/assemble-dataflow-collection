const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000') + '/api';

const req = async (url, opts = {}) => {
  try {
    const res = await fetch(`${API}${url}`, {
      headers: { 'Content-Type': 'application/json', ...opts.headers },
      ...opts,
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });

    let data;
    const contentType = res.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      data = await res.json();
    } else {
      // If not JSON, it might be an error page or raw text
      const text = await res.text();
      if (!res.ok) throw new Error(text || `Server error: ${res.status}`);
      return text;
    }

    if (!res.ok) {
      throw new Error(data?.message || `Request failed with status ${res.status}`);
    }
    return data;
  } catch (err) {
    // Specifically handle 'Failed to fetch' which usually means the server is down
    if (err.name === 'TypeError' && err.message === 'Failed to fetch') {
      console.error('Network Error: Could not connect to API at', API);
      throw new Error(`Network Error: Could not connect to API. Please check your internet connection or API server status. (Trying to reach: ${API})`);
    }
    throw err;
  }
};

export const api = {
  login: (body) => req('/auth/login', { method: 'POST', body }),
  getConfig: () => req('/admin/config'),
  updateConfig: (body) => req('/admin/config', { method: 'POST', body }),
  getMOs: (params = {}) => req('/mos?' + new URLSearchParams(params).toString()),
  createMO: (body) => req('/mos', { method: 'POST', body }),
  updateMO: (id, body) => req(`/mos/${id}`, { method: 'PUT', body }),
  deleteMO: (id) => req(`/mos/${id}`, { method: 'DELETE' }),
  parseSKU: (body) => req('/mos/parse-sku', { method: 'POST', body }),
  getStats: (params = {}) => req('/stats?' + new URLSearchParams(params).toString()),
  getReport: (params = {}) => req('/stats/report?' + new URLSearchParams(params).toString()),
  getUsers: () => req('/admin/users'),
  createUser: (body) => req('/admin/users', { method: 'POST', body }),
  updateUser: (id, body) => req(`/admin/users/${id}`, { method: 'PUT', body }),
  deleteUser: (id) => req(`/admin/users/${id}`, { method: 'DELETE' }),
  getComponents: () => req('/admin/components'),
  manageComponent: (body) => req('/admin/components/manage', { method: 'POST', body }),
  getAudit: (params = {}) => req('/admin/audit?' + new URLSearchParams(params).toString()),
  deleteAuditLogs: (params) => req('/admin/audit?' + new URLSearchParams(params).toString(), { method: 'DELETE' }),
  getScrap: (params = {}) => req('/scrap?' + new URLSearchParams(params).toString()),
  createScrap: (body) => req('/scrap', { method: 'POST', body }),
  updateScrap: (id, body) => req(`/scrap/${id}`, { method: 'PUT', body }),
  deleteScrap: (id) => req(`/scrap/${id}`, { method: 'DELETE' }),
  exportScrapUrl: (params = {}) => `${API}/scrap/export?${new URLSearchParams(params).toString()}`,
  getReturns: (params = {}) => req('/returns?' + new URLSearchParams(params).toString()),
  createReturn: (body) => req('/returns', { method: 'POST', body }),
  deleteReturn: (id) => req(`/returns/${id}`, { method: 'DELETE' }),
  replenishReturn: (id, body) => req(`/returns/${id}/replenish`, { method: 'PUT', body }),
  bulkDbAction: (body) => req('/admin/db/action', { method: 'POST', body }),
  getTrash: () => req('/admin/trash'),
  bulkTrashAction: (body) => req('/admin/trash/action', { method: 'POST', body }),
  wipeAll: (body) => req('/admin/wipe-all', { method: 'POST', body }),
  getRework: (params = {}) => req('/rework?' + new URLSearchParams(params).toString()),
  createRework: (body) => req('/rework', { method: 'POST', body }),
  updateRework: (id, body) => req(`/rework/${id}`, { method: 'PUT', body }),
  deleteRework: (id) => req(`/rework/${id}`, { method: 'DELETE' }),
  exportReworkUrl: (params = {}) => `${API}/rework/export?${new URLSearchParams(params).toString()}`,
};
