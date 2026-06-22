import axios, { AxiosError, type AxiosRequestConfig } from 'axios';

// ---- Shared response shapes (mirror the backend BuildingBlocks.Contracts) ----
export interface ApiResponse<T> {
  success: boolean;
  message: string | null;
  data: T | null;
  errors: string[];
}

export interface AuthResponse {
  userId: string;
  email: string;
  fullName: string;
  roles: string[];
  accessToken: string;
  accessTokenExpiresAtUtc: string;
  refreshToken: string;
}

export interface UserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  roles: number;
  roleNames: string[];
  status: string;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

export interface PagedResult<T> {
  items: T[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export type SelfServiceRole = 'HorseOwner' | 'Jockey' | 'Spectator';
export const ALL_ROLES = ['Admin', 'HorseOwner', 'Jockey', 'Spectator', 'RaceReferee'] as const;
export type RoleName = (typeof ALL_ROLES)[number];

// ---- Token storage ----
const ACCESS_KEY = 'hrm.accessToken';
const REFRESH_KEY = 'hrm.refreshToken';

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh: string) {
    localStorage.setItem(ACCESS_KEY, access);
    localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

const api = axios.create({ baseURL: '/api/identity' });

api.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// On a 401, try a single refresh-token rotation, then replay the request.
let refreshing: Promise<string | null> | null = null;

async function doRefresh(): Promise<string | null> {
  const refresh = tokenStore.refresh;
  if (!refresh) return null;
  try {
    const res = await axios.post<ApiResponse<AuthResponse>>('/api/identity/auth/refresh', {
      refreshToken: refresh,
    });
    const data = res.data.data!;
    tokenStore.set(data.accessToken, data.refreshToken);
    return data.accessToken;
  } catch {
    tokenStore.clear();
    return null;
  }
}

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;
    const isAuthCall = original?.url?.includes('/auth/');
    if (error.response?.status === 401 && original && !original._retried && !isAuthCall) {
      original._retried = true;
      refreshing ??= doRefresh();
      const newToken = await refreshing;
      refreshing = null;
      if (newToken) {
        original.headers = { ...original.headers, Authorization: `Bearer ${newToken}` };
        return api(original);
      }
    }
    return Promise.reject(error);
  },
);

/** Pulls a human-readable message out of an Axios error / ApiResponse. */
export function errorMessage(err: unknown, fallback = 'Đã xảy ra lỗi.'): string {
  if (axios.isAxiosError(err)) {
    const body = err.response?.data as ApiResponse<unknown> | undefined;
    if (body?.message) {
      return body.errors?.length && body.errors[0] !== body.message
        ? `${body.message} (${body.errors.join(', ')})`
        : body.message;
    }
    return err.message;
  }
  return fallback;
}

// ---- Typed API calls ----
export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  roles: SelfServiceRole[];
}

export const authApi = {
  async register(payload: RegisterPayload) {
    const res = await api.post<ApiResponse<UserDto>>('/auth/register', payload);
    return res.data.data!;
  },
  async login(email: string, password: string) {
    const res = await api.post<ApiResponse<AuthResponse>>('/auth/login', { email, password });
    return res.data.data!;
  },
};

export interface GetUsersParams {
  search?: string;
  role?: RoleName;
  includeInactive?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export const usersApi = {
  async list(params: GetUsersParams) {
    const res = await api.get<ApiResponse<PagedResult<UserDto>>>('/users', { params });
    return res.data.data!;
  },
  async lock(id: string) {
    await api.post(`/users/${id}/lock`);
  },
  async unlock(id: string) {
    await api.post(`/users/${id}/unlock`);
  },
  async remove(id: string) {
    await api.delete(`/users/${id}`);
  },
  async assignRoles(id: string, roles: RoleName[]) {
    const res = await api.put<ApiResponse<UserDto>>(`/users/${id}/roles`, { roles });
    return res.data.data!;
  },
};

export default api;
