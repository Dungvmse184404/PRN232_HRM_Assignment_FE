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

const api = axios.create({ baseURL: '/api' });

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
    const res = await api.post<ApiResponse<UserDto>>('/identity/auth/register', payload);
    return res.data.data!;
  },
  async login(email: string, password: string) {
    const res = await api.post<ApiResponse<AuthResponse>>('/identity/auth/login', { email, password });
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
    const res = await api.get<ApiResponse<PagedResult<UserDto>>>('/identity/users', { params });
    return res.data.data!;
  },
  async lock(id: string) {
    await api.post(`/identity/users/${id}/lock`);
  },
  async unlock(id: string) {
    await api.post(`/identity/users/${id}/unlock`);
  },
  async remove(id: string) {
    await api.delete(`/identity/users/${id}`);
  },
  async assignRoles(id: string, roles: RoleName[]) {
    const res = await api.put<ApiResponse<UserDto>>(`/identity/users/${id}/roles`, { roles });
    return res.data.data!;
  },
};

// ---- Horse service (FR-06..08) ----
export type HorseGender = 'Male' | 'Female' | 'Gelding';
export type HorseStatus = 'Active' | 'Retired';
export const HORSE_GENDERS: HorseGender[] = ['Male', 'Female', 'Gelding'];

export interface HorseDocumentDto {
  id: string;
  docType: string;
  fileUrl: string;
  uploadedAtUtc: string;
}

export interface HorseDto {
  id: string;
  ownerUserId: string;
  name: string;
  gender: number;
  genderName: HorseGender;
  dateOfBirth: string | null;
  breed: string | null;
  color: string | null;
  weightKg: number | null;
  heightCm: number | null;
  status: HorseStatus;
  isActive: boolean;
  createdAtUtc: string;
  updatedAtUtc: string | null;
  documents: HorseDocumentDto[];
}

export interface HorsePayload {
  name: string;
  gender: HorseGender;
  dateOfBirth?: string | null;
  breed?: string | null;
  color?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
}

export interface GetHorsesParams {
  search?: string;
  status?: HorseStatus;
  includeInactive?: boolean;
  all?: boolean;
  pageNumber?: number;
  pageSize?: number;
}

export const horsesApi = {
  async list(params: GetHorsesParams) {
    const res = await api.get<ApiResponse<PagedResult<HorseDto>>>('/horse/horses', { params });
    return res.data.data!;
  },
  async get(id: string) {
    const res = await api.get<ApiResponse<HorseDto>>(`/horse/horses/${id}`);
    return res.data.data!;
  },
  async create(payload: HorsePayload) {
    const res = await api.post<ApiResponse<HorseDto>>('/horse/horses', payload);
    return res.data.data!;
  },
  async update(id: string, payload: HorsePayload) {
    const res = await api.put<ApiResponse<HorseDto>>(`/horse/horses/${id}`, payload);
    return res.data.data!;
  },
  async changeStatus(id: string, status: HorseStatus) {
    const res = await api.patch<ApiResponse<HorseDto>>(`/horse/horses/${id}/status`, { status });
    return res.data.data!;
  },
  async remove(id: string) {
    await api.delete(`/horse/horses/${id}`);
  },
  async addDocument(id: string, docType: string, fileUrl: string) {
    const res = await api.post<ApiResponse<HorseDocumentDto>>(`/horse/horses/${id}/documents`, { docType, fileUrl });
    return res.data.data!;
  },
  async removeDocument(id: string, documentId: string) {
    await api.delete(`/horse/horses/${id}/documents/${documentId}`);
  },
};

// ---- Racing service (FR-23..28) ----
// Enums mirrored from HRM.Assignment.Racing.Domain.Enums (stored as short, serialised as string via JsonStringEnumConverter)
export type RaceStatus = 'Scheduled' | 'RegistrationOpen' | 'RegistrationClosed' | 'Ongoing' | 'Finished' | 'Cancelled';
export type EntryStatus = 'Registered' | 'PendingApproval' | 'Approved' | 'Confirmed' | 'Rejected' | 'Withdrawn';
export type InspectionResult = 'Eligible' | 'Ineligible';
export type ViolationSeverity = 'Minor' | 'Major' | 'Disqualify';
export type ResultStatus = 'Pending' | 'RefereeConfirmed' | 'Published';
export type AssignmentStatus = 'Assigned' | 'Completed' | 'Cancelled';

// DTOs — exactly mirror Application.Common.Models records
export interface RaceRoundDto {
  id: string;
  raceId: string;
  roundNumber: number;
  name: string | null;
  scheduledTime: string | null;
  status: number;
  statusName: string;
}

export interface RaceDto {
  id: string;
  tournamentId: string;
  tournamentName: string;
  trackId: string;
  trackName: string;
  name: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  distanceM: number;
  maxHorses: number;
  entryCount: number;
  registrationDeadline: string | null;
  status: number;
  statusName: string;
  createdAtUtc: string;
  rounds: RaceRoundDto[];
}

export interface RaceEntryDto {
  id: string;
  raceId: string;
  raceName: string;
  horseId: string;
  ownerUserId: string;
  jockeyId: string | null;
  laneNo: number | null;
  status: number;
  statusName: string;
  isActive: boolean;
  registeredAtUtc: string;
  confirmedAtUtc: string | null;
}

export interface AssignedRaceEntryDto {
  raceEntryId: string;
  horseId: string;
  horseName: string | null;
  jockeyId: string | null;
  jockeyName: string | null;
  inspectionResult: number | null;
  inspectionNote: string | null;
}

export interface AssignedRaceDto {
  id: string;
  raceId: string;
  refereeUserId: string;
  raceName: string;
  scheduledStart: string;
  status: AssignmentStatus;
  assignedAtUtc: string;
  entries: AssignedRaceEntryDto[];
}

export interface HorseInspectionDto {
  id: string;
  raceEntryId: string;
  refereeUserId: string;
  result: number;
  resultName: string;
  note: string | null;
  inspectedAtUtc: string;
}

export interface ViolationDto {
  id: string;
  raceId: string;
  raceEntryId: string | null;
  jockeyId: string | null;
  type: string;
  severity: number;
  severityName: string;
  penalty: string | null;
  note: string | null;
  recordedBy: string;
  recordedAtUtc: string;
}

export interface RaceResultDto {
  id: string;
  raceId: string;
  raceEntryId: string;
  horseId: string;
  jockeyId: string | null;
  finishPosition: number | null;
  finishTimeMs: number | null;
  status: number;
  statusName: string;
  confirmedBy: string | null;
  confirmedAtUtc: string | null;
}

export interface RaceReportDto {
  id: string;
  raceId: string;
  refereeUserId: string;
  summary: string | null;
  createdAtUtc: string;
}

export interface GetRacesParams {
  tournamentId?: string;
  search?: string;
  status?: RaceStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetEntriesParams {
  raceId?: string;
  horseId?: string;
  status?: EntryStatus;
  pageNumber?: number;
  pageSize?: number;
}

export const racingApi = {
  // FR-25: List races (public)
  async listRaces(params: GetRacesParams) {
    const res = await api.get<ApiResponse<PagedResult<RaceDto>>>('/racing/races', { params });
    return res.data.data!;
  },
  // FR-25: Get race by id (public)
  async getRace(id: string) {
    const res = await api.get<ApiResponse<RaceDto>>(`/racing/races/${id}`);
    return res.data.data!;
  },
  // FR-24: List race entries (any authenticated user)
  async listEntries(params: GetEntriesParams) {
    const res = await api.get<ApiResponse<PagedResult<RaceEntryDto>>>('/racing/entries', { params });
    return res.data.data!;
  },
  // FR-23: Get races assigned to current referee
  async getAssignedRaces(): Promise<AssignedRaceDto[]> {
    const res = await api.get<AssignedRaceDto[]>('/officiating/races/assigned');
    return res.data;
  },
  // FR-23: Assign a referee to a race (Admin only)
  async assignReferee(raceId: string, refereeUserId: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>(`/officiating/races/${raceId}/referees`, { refereeUserId });
    return res.data;
  },
  // FR-24: Record a horse inspection (Admin, RaceReferee)
  async createInspection(raceEntryId: string, result: InspectionResult, note?: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/officiating/inspections', { raceEntryId, result, note });
    return res.data;
  },
  // FR-26: Record a violation (Admin, RaceReferee)
  async recordViolation(payload: {
    raceId: string;
    raceEntryId?: string | null;
    jockeyId?: string | null;
    type: string;
    severity: ViolationSeverity;
    penalty?: string | null;
    note?: string | null;
  }): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/officiating/violations', payload);
    return res.data;
  },
  // FR-27: Confirm a race result (Admin, RaceReferee)
  async confirmResult(resultId: string): Promise<{ message: string }> {
    const res = await api.put<{ message: string }>(`/results/${resultId}/confirm`, {});
    return res.data;
  },
  // FR-28: Create race report (Admin, RaceReferee)
  async createReport(raceId: string, summary?: string): Promise<{ message: string }> {
    const res = await api.post<{ message: string }>('/results/reports', { raceId, summary });
    return res.data;
  },
};

export default api;
