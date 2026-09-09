import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';

const API_BASE_URL = (import.meta.env as any).VITE_API_BASE_URL || 'https://api.al-brisha.com/api';

class ApiClient {
  private client: AxiosInstance;
  private tokenRefreshPromise: Promise<string> | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            this.setToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            this.clearToken();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  private getToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('access_token');
    }
    return null;
  }

  private setToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', token);
    }
  }

  private getRefreshToken(): string | null {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('refresh_token');
    }
    return null;
  }

  private setRefreshToken(token: string): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('refresh_token', token);
    }
  }

  private clearToken(): void {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
  }

  private async refreshToken(): Promise<string> {
    if (this.tokenRefreshPromise) {
      return this.tokenRefreshPromise;
    }

    this.tokenRefreshPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post(`${API_BASE_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { token, refreshToken: newRefreshToken } = response.data.data;
        this.setToken(token);
        this.setRefreshToken(newRefreshToken);

        return token;
      } finally {
        this.tokenRefreshPromise = null;
      }
    })();

    return this.tokenRefreshPromise;
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    const { token, refreshToken, user } = response.data.data;
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    return { user, token };
  }

  async register(data: any) {
    const response = await this.client.post('/auth/register', data);
    const { token, refreshToken, user } = response.data.data;
    this.setToken(token);
    this.setRefreshToken(refreshToken);
    return { user, token };
  }

  async logout() {
    try {
      await this.client.post('/auth/logout');
    } finally {
      this.clearToken();
    }
  }

  async getProfile() {
    const response = await this.client.get('/auth/profile');
    return response.data.data;
  }

  async updateProfile(data: any) {
    const response = await this.client.put('/auth/profile', data);
    return response.data.data;
  }

  async changePassword(data: any) {
    const response = await this.client.put('/auth/change-password', data);
    return response.data;
  }

  // Settings methods
  async getSettings(filters?: any) {
    const response = await this.client.get('/settings', { params: filters });
    return response.data;
  }

  async getPublicSettings() {
    const response = await this.client.get('/settings/public');
    return response.data;
  }

  async getSettingByKey(key: string) {
    const response = await this.client.get(`/settings/${key}`);
    return response.data.data;
  }

  async updateSetting(key: string, data: any) {
    const response = await this.client.put(`/settings/${key}`, data);
    return response.data.data;
  }

  async bulkUpdateSettings(settings: any) {
    const response = await this.client.put('/settings/bulk/update', { settings });
    return response.data.data;
  }

  // Branches methods
  async getBranches(filters?: any) {
    const response = await this.client.get('/branches', { params: filters });
    return response.data;
  }

  async getBranch(id: string) {
    const response = await this.client.get(`/branches/${id}`);
    return response.data.data;
  }

  async createBranch(data: any) {
    const response = await this.client.post('/branches', data);
    return response.data.data;
  }

  async updateBranch(id: string, data: any) {
    const response = await this.client.put(`/branches/${id}`, data);
    return response.data.data;
  }

  async deleteBranch(id: string) {
    const response = await this.client.delete(`/branches/${id}`);
    return response.data;
  }

  async getBranchStats(id: string) {
    const response = await this.client.get(`/branches/${id}/stats`);
    return response.data.data;
  }

  // Companies methods
  async getCompanies(filters?: any) {
    const response = await this.client.get('/companies', { params: filters });
    return response.data;
  }

  async getCompany(id: string) {
    const response = await this.client.get(`/companies/${id}`);
    return response.data.data;
  }

  async createCompany(data: any) {
    const response = await this.client.post('/companies', data);
    return response.data.data;
  }

  async updateCompany(id: string, data: any) {
    const response = await this.client.put(`/companies/${id}`, data);
    return response.data.data;
  }

  async deleteCompany(id: string) {
    const response = await this.client.delete(`/companies/${id}`);
    return response.data;
  }

  // Vehicles methods
  async getVehicles(filters?: any) {
    const response = await this.client.get('/vehicles', { params: filters });
    return response.data;
  }

  async getVehicle(id: string) {
    const response = await this.client.get(`/vehicles/${id}`);
    return response.data.data;
  }

  async getVehicleStats(filters?: any) {
    const response = await this.client.get('/vehicles/stats', { params: filters });
    return response.data.data;
  }

  async createVehicle(data: any) {
    const response = await this.client.post('/vehicles', data);
    return response.data.data;
  }

  async updateVehicle(id: string, data: any) {
    const response = await this.client.put(`/vehicles/${id}`, data);
    return response.data.data;
  }

  async updateVehicleStatus(id: string, status: string) {
    const response = await this.client.patch(`/vehicles/${id}/status`, { status });
    return response.data.data;
  }

  async assignVehicleOwner(id: string, ownerId: string) {
    const response = await this.client.patch(`/vehicles/${id}/owner`, { owner_id: ownerId });
    return response.data.data;
  }

  async deleteVehicle(id: string) {
    const response = await this.client.delete(`/vehicles/${id}`);
    return response.data;
  }

  async getVehicleStats(filters?: any) {
    const response = await this.client.get('/vehicles/stats', { params: filters });
    return response.data.data;
  }

  async bulkDeleteVehicles(ids: string[]) {
    const response = await this.client.post('/vehicles/bulk/delete', { ids });
    return response.data;
  }

  async bulkUpdateVehicles(ids: string[], updates: any) {
    const response = await this.client.post('/vehicles/bulk/update', { ids, updates });
    return response.data;
  }

  async exportVehicles(filters?: any) {
    const response = await this.client.get('/vehicles/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response;
  }

  // Appointments methods
  async getAppointments(filters?: any) {
    const response = await this.client.get('/appointments', { params: filters });
    return response.data;
  }

  async getAppointment(id: string) {
    const response = await this.client.get(`/appointments/${id}`);
    return response.data.data;
  }

  async createAppointment(data: any) {
    const response = await this.client.post('/appointments', data);
    return response.data.data;
  }

  async updateAppointment(id: string, data: any) {
    const response = await this.client.put(`/appointments/${id}`, data);
    return response.data.data;
  }

  async deleteAppointment(id: string) {
    const response = await this.client.delete(`/appointments/${id}`);
    return response.data;
  }

  // Employees methods
  async getEmployees(filters?: any) {
    const response = await this.client.get('/employees', { params: filters });
    return response.data;
  }

  async getEmployee(id: string) {
    const response = await this.client.get(`/employees/${id}`);
    return response.data.data;
  }

  async createEmployee(data: any) {
    const response = await this.client.post('/employees', data);
    return response.data.data;
  }

  async updateEmployee(id: string, data: any) {
    const response = await this.client.put(`/employees/${id}`, data);
    return response.data.data;
  }

  async deleteEmployee(id: string) {
    const response = await this.client.delete(`/employees/${id}`);
    return response.data;
  }

  // Contacts methods
  async getContacts(filters?: any) {
    const response = await this.client.get('/contacts', { params: filters });
    return response.data;
  }

  async getContact(id: string) {
    const response = await this.client.get(`/contacts/${id}`);
    return response.data.data;
  }

  async getContactStats(filters?: any) {
    const response = await this.client.get('/contacts/stats', { params: filters });
    return response.data.data;
  }

  async getContactActivity(id: string) {
    const response = await this.client.get(`/contacts/${id}/activity`);
    return response.data.data;
  }

  async createContact(data: any) {
    const response = await this.client.post('/contacts', data);
    return response.data.data;
  }

  async updateContact(id: string, data: any) {
    const response = await this.client.put(`/contacts/${id}`, data);
    return response.data.data;
  }

  async updateContactTags(id: string, tags: string[]) {
    const response = await this.client.put(`/contacts/${id}/tags`, { tags });
    return response.data.data;
  }

  async addVehiclesToContact(id: string, vehicleIds: string[]) {
    const response = await this.client.post(`/contacts/${id}/vehicles`, { vehicle_ids: vehicleIds });
    return response.data.data;
  }

  async removeVehicleFromContact(id: string, vehicleId: string) {
    const response = await this.client.delete(`/contacts/${id}/vehicles`, { data: { vehicle_id: vehicleId } });
    return response.data.data;
  }

  async deleteContact(id: string) {
    const response = await this.client.delete(`/contacts/${id}`);
    return response.data;
  }

  async bulkDeleteContacts(ids: string[]) {
    const response = await this.client.post('/contacts/bulk/delete', { ids });
    return response.data;
  }

  async bulkUpdateContacts(ids: string[], updates: any) {
    const response = await this.client.post('/contacts/bulk/update', { ids, updates });
    return response.data;
  }

  async exportContacts(filters?: any) {
    const response = await this.client.get('/contacts/export', { 
      params: filters,
      responseType: 'blob'
    });
    return response;
  }

  // Phone Calls methods
  async getPhoneCalls(filters?: any) {
    const response = await this.client.get('/phone-calls', { params: filters });
    return response.data;
  }

  async getPhoneCall(id: string) {
    const response = await this.client.get(`/phone-calls/${id}`);
    return response.data.data;
  }

  async createPhoneCall(data: any) {
    const response = await this.client.post('/phone-calls', data);
    return response.data.data;
  }

  async updatePhoneCall(id: string, data: any) {
    const response = await this.client.put(`/phone-calls/${id}`, data);
    return response.data.data;
  }

  async deletePhoneCall(id: string) {
    const response = await this.client.delete(`/phone-calls/${id}`);
    return response.data;
  }

  // Helpdesk methods
  async getTickets(filters?: any) {
    const response = await this.client.get('/helpdesk', { params: filters });
    return response.data;
  }

  async getTicket(id: string) {
    const response = await this.client.get(`/helpdesk/${id}`);
    return response.data.data;
  }

  async createTicket(data: any) {
    const response = await this.client.post('/helpdesk', data);
    return response.data.data;
  }

  async updateTicket(id: string, data: any) {
    const response = await this.client.put(`/helpdesk/${id}`, data);
    return response.data.data;
  }

  async deleteTicket(id: string) {
    const response = await this.client.delete(`/helpdesk/${id}`);
    return response.data;
  }

  async assignTicket(id: string, assignedTo: string) {
    const response = await this.client.post(`/helpdesk/${id}/assign`, { assigned_to: assignedTo });
    return response.data.data;
  }

  // Roles methods
  async getRoles(filters?: any) {
    const response = await this.client.get('/roles', { params: filters });
    return response.data;
  }

  async getRole(id: string) {
    const response = await this.client.get(`/roles/${id}`);
    return response.data.data;
  }

  async createRole(data: any) {
    const response = await this.client.post('/roles', data);
    return response.data.data;
  }

  async updateRole(id: string, data: any) {
    const response = await this.client.put(`/roles/${id}`, data);
    return response.data.data;
  }

  async deleteRole(id: string) {
    const response = await this.client.delete(`/roles/${id}`);
    return response.data;
  }

  // Users methods
  async getUsers(filters?: any) {
    const response = await this.client.get('/users', { params: filters });
    return response.data;
  }

  async getUser(id: string) {
    const response = await this.client.get(`/users/${id}`);
    return response.data.data;
  }

  async createUser(data: any) {
    const response = await this.client.post('/users', data);
    return response.data.data;
  }

  async updateUser(id: string, data: any) {
    const response = await this.client.put(`/users/${id}`, data);
    return response.data.data;
  }

  async deleteUser(id: string) {
    const response = await this.client.delete(`/users/${id}`);
    return response.data;
  }

  // PageAccess methods
  async getPageAccess(roleId: string) {
    const response = await this.client.get(`/page-access/role/${roleId}`);
    return response.data;
  }

  async upsertPageAccess(data: { role_id: string; page: string; page_name?: string; can_view?: boolean; can_create?: boolean; can_edit?: boolean; can_delete?: boolean; can_export?: boolean }) {
    // Try to find existing by role+page, then create or update
    const response = await this.client.post('/page-access', data);
    return response.data.data;
  }

  async updatePageAccessById(id: string, data: any) {
    const response = await this.client.put(`/page-access/${id}`, data);
    return response.data.data;
  }

  // Knowledge Base methods
  async getKnowledgeTree(params?: any) {
    const response = await this.client.get('/knowledge/tree', { params });
    return response.data;
  }

  async getKnowledgeCategories(params?: any) {
    const response = await this.client.get('/knowledge/categories', { params });
    return response.data;
  }

  async getKnowledgeCategory(id: string) {
    const response = await this.client.get(`/knowledge/categories/${id}`);
    return response.data.data;
  }

  async createKnowledgeCategory(data: any) {
    const response = await this.client.post('/knowledge/categories', data);
    return response.data.data;
  }

  async updateKnowledgeCategory(id: string, data: any) {
    const response = await this.client.put(`/knowledge/categories/${id}`, data);
    return response.data.data;
  }

  async deleteKnowledgeCategory(id: string) {
    const response = await this.client.delete(`/knowledge/categories/${id}`);
    return response.data;
  }

  async getKnowledgeItems(categoryId: string, params?: any) {
    const response = await this.client.get(`/knowledge/categories/${categoryId}/items`, { params });
    return response.data;
  }

  async getKnowledgeItem(id: string) {
    const response = await this.client.get(`/knowledge/items/${id}`);
    return response.data.data;
  }

  async createKnowledgeItem(data: any) {
    const response = await this.client.post('/knowledge/items', data);
    return response.data.data;
  }

  async updateKnowledgeItem(id: string, data: any) {
    const response = await this.client.put(`/knowledge/items/${id}`, data);
    return response.data.data;
  }

  async deleteKnowledgeItem(id: string) {
    const response = await this.client.delete(`/knowledge/items/${id}`);
    return response.data;
  }

  async searchKnowledge(q: string) {
    const response = await this.client.get('/knowledge/search', { params: { q } });
    return response.data.data;
  }

  // System status
  async getSystemStatus() {
    const response = await this.client.get('/system/status');
    return response.data.data;
  }

  // Leads / Sales methods
  async uploadKnowledgeFile(file: File) {
    const form = new FormData();
    form.append('file', file);
    const response = await this.client.post('/upload/knowledge', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data.data as { url: string; filename: string; size: number; mimetype: string };
  }
  async getLeads(filters?: any) {
    const response = await this.client.get('/leads', { params: filters });
    return response.data;
  }

  async getLead(id: string) {
    const response = await this.client.get(`/leads/${id}`);
    return response.data.data;
  }

  async getLeadStats(filters?: any) {
    const response = await this.client.get('/leads/stats', { params: filters });
    return response.data.data;
  }

  async createLead(data: any) {
    const response = await this.client.post('/leads', data);
    return response.data.data;
  }

  async updateLead(id: string, data: any) {
    const response = await this.client.put(`/leads/${id}`, data);
    return response.data.data;
  }

  async updateLeadStatus(id: string, status: string, extra?: { lost_reason?: string; lost_notes?: string }) {
    const response = await this.client.patch(`/leads/${id}/status`, { status, ...extra });
    return response.data.data;
  }

  async addLeadActivity(id: string, data: { type: string; note: string; next_follow_up?: string }) {
    const response = await this.client.post(`/leads/${id}/activities`, data);
    return response.data.data;
  }

  async deleteLead(id: string) {
    const response = await this.client.delete(`/leads/${id}`);
    return response.data;
  }

  // Generic methods
  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient();
export default apiClient;
