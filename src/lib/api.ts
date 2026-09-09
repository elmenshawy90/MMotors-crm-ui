const API_BASE_URL = (import.meta.env as any)['VITE_API_URL'] || 'https://api.al-brisha.com/api';

// Helper function for API calls
async function apiCall(endpoint: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// Companies API
export const companiesApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/companies${queryString}`);
  },
  getById: (id: string) => apiCall(`/companies/${id}`),
  create: (data: any) => apiCall('/companies', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/companies/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/companies/${id}`, {
    method: 'DELETE',
  }),
};

// Branches API
export const branchesApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/branches${queryString}`);
  },
  getById: (id: string) => apiCall(`/branches/${id}`),
  create: (data: any) => apiCall('/branches', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/branches/${id}`, {
    method: 'DELETE',
  }),
};

// Stations API
export const stationsApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/stations${queryString}`);
  },
  getById: (id: string) => apiCall(`/stations/${id}`),
  create: (data: any) => apiCall('/stations', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/stations/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/stations/${id}`, {
    method: 'DELETE',
  }),
};

// Employees API
export const employeesApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/employees${queryString}`);
  },
  getById: (id: string) => apiCall(`/employees/${id}`),
  create: (data: any) => apiCall('/employees', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/employees/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/employees/${id}`, {
    method: 'DELETE',
  }),
};

// Warranty Packages API
export const warrantyPackagesApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/warranty-packages${queryString}`);
  },
  getById: (id: string) => apiCall(`/warranty-packages/${id}`),
  create: (data: any) => apiCall('/warranty-packages', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/warranty-packages/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/warranty-packages/${id}`, {
    method: 'DELETE',
  }),
};

// Mail Groups API
export const mailGroupsApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/mail-groups${queryString}`);
  },
  getById: (id: string) => apiCall(`/mail-groups/${id}`),
  create: (data: any) => apiCall('/mail-groups', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/mail-groups/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/mail-groups/${id}`, {
    method: 'DELETE',
  }),
};

// Definitions API
export const definitionsApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/definitions${queryString}`);
  },
  getById: (id: string) => apiCall(`/definitions/${id}`),
  create: (data: any) => apiCall('/definitions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/definitions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/definitions/${id}`, {
    method: 'DELETE',
  }),
};

// Roles API
export const rolesApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/roles${queryString}`);
  },
  getById: (id: string) => apiCall(`/roles/${id}`),
  create: (data: any) => apiCall('/roles', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/roles/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/roles/${id}`, {
    method: 'DELETE',
  }),
};

// Permissions API
export const permissionsApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/permissions${queryString}`);
  },
  getById: (id: string) => apiCall(`/permissions/${id}`),
  create: (data: any) => apiCall('/permissions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/permissions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/permissions/${id}`, {
    method: 'DELETE',
  }),
};

// Page Access API
export const pageAccessApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/page-access${queryString}`);
  },
  getById: (id: string) => apiCall(`/page-access/${id}`),
  getByRole: (roleId: string) => apiCall(`/page-access/role/${roleId}`),
  create: (data: any) => apiCall('/page-access', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/page-access/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/page-access/${id}`, {
    method: 'DELETE',
  }),
};

// Users API (using existing auth routes)
export const usersApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/auth/users${queryString}`);
  },
  getById: (id: string) => apiCall(`/auth/users/${id}`),
  create: (data: any) => apiCall('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiCall(`/auth/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiCall(`/auth/users/${id}`, {
    method: 'DELETE',
  }),
};

// Settings API
export const settingsApi = {
  getAll: (params?: Record<string, string>) => {
    const queryString = params ? `?${new URLSearchParams(params)}` : '';
    return apiCall(`/settings${queryString}`);
  },
  getByKey: (key: string) => apiCall(`/settings/key/${key}`),
  getByCategory: (category: string) => apiCall(`/settings/category/${category}`),
  create: (data: any) => apiCall('/settings', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (key: string, data: any) => apiCall(`/settings/${key}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (key: string) => apiCall(`/settings/${key}`, {
    method: 'DELETE',
  }),
  bulkUpdate: (data: any) => apiCall('/settings/bulk', {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
};
