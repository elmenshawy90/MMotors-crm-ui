import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '@/lib/api-client';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;        // ENUM: super_admin | admin | manager | staff | viewer
  role_id?: string;    // UUID FK to roles table
  status: string;
  avatar?: string;
  branch_id?: string;
  permissions: string[]; // permission IDs from role
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: any) => Promise<void>;
  updateProfile: (data: any) => Promise<void>;
  changePassword: (data: any) => Promise<void>;
  isAuthenticated: boolean;
  hasRole: (roles: string[]) => boolean;
  can: (permissionId: string) => boolean;
  canAny: (permissionIds: string[]) => boolean;
  canAll: (permissionIds: string[]) => boolean;
  isSuperAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// ─── Role enum → fallback permission set ─────────────────────────────────────
// Used when the user's role has no DB-stored permissions yet
const ROLE_PERMISSION_DEFAULTS: Record<string, string[]> = {
  super_admin: ['*'], // wildcard — all
  admin:       ['*'],
  manager:     [
    'p5','p14','p15','p16','p17','p18','p19','p20','p21','p22','p23',
    'p24','p25','p26','p27','p28','p29','p30','p31','p32',
    'p33','p35','p38','p43','p44','p45','p46'
  ],
  staff:       ['p5','p14','p15','p16','p19','p20','p21','p24','p25','p26','p28','p29'],
  viewer:      ['p1','p5','p14','p19','p24','p28','p38','p43','p48'],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function fetchUserPermissions(user: any): Promise<string[]> {
  // If the user has a role_id, fetch the role's permissions from DB
  if (user.role_id) {
    try {
      const role = await apiClient.getRole(user.role_id);
      if (Array.isArray(role?.permissions) && role.permissions.length > 0) {
        return role.permissions as string[];
      }
    } catch {
      // fall through to default
    }
  }
  // Fall back to defaults based on ENUM role string
  return ROLE_PERMISSION_DEFAULTS[user.role] ?? [];
}

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        // لا يوجد token — لا نحتاج طلب شبكة
        return;
      }
      const profile = await apiClient.getProfile();
      const permissions = await fetchUserPermissions(profile);
      setUser({ ...profile, permissions });
    } catch (error: any) {
      // نمسح الـ tokens فقط عند 401 (token منتهي/غير صالح)
      // أخطاء الشبكة (CORS, 5xx, timeout) لا تستوجب تسجيل الخروج
      const status = error?.response?.status;
      if (status === 401 || status === 403) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      }
      // في حالة خطأ الشبكة نُبقي الـ user logged out بهدوء
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const { user: userData } = await apiClient.login(email, password);
    const permissions = await fetchUserPermissions(userData);
    setUser({ ...userData, permissions });
  };

  const logout = async () => {
    try {
      await apiClient.logout();
    } finally {
      setUser(null);
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    }
  };

  const register = async (data: any) => {
    const { user: userData } = await apiClient.register(data);
    const permissions = await fetchUserPermissions(userData);
    setUser({ ...userData, permissions });
  };

  const updateProfile = async (data: any) => {
    const updatedUser = await apiClient.updateProfile(data);
    setUser((prev) => prev ? { ...prev, ...updatedUser } : prev);
  };

  const changePassword = async (data: any) => {
    await apiClient.changePassword(data);
  };

  const hasRole = (roles: string[]): boolean =>
    user ? roles.includes(user.role) : false;

  const isSuperAdmin = user?.role === 'super_admin';

  // Wildcard check: super_admin / admin with '*' can do everything
  const can = (permissionId: string): boolean => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    const perms = user.permissions || [];
    if (perms.includes('*')) return true;
    return perms.includes(permissionId);
  };

  const canAny = (permissionIds: string[]): boolean =>
    permissionIds.some((p) => can(p));

  const canAll = (permissionIds: string[]): boolean =>
    permissionIds.every((p) => can(p));

  return (
    <AuthContext.Provider value={{
      user, loading, login, logout, register, updateProfile, changePassword,
      isAuthenticated: !!user, hasRole, can, canAny, canAll, isSuperAdmin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
