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

// ---- Racing service: Results / standings / performance (FR-29..32) ----
export interface RaceResultItemDto {
  rank: number;
  horseId: string;
  jockeyId: string | null;
  finishTimeMs: number | null;
  points: number;
  prizeAmount: number | null;
}

export interface RaceResultsSummaryDto {
  raceId: string;
  tournamentId: string | null;
  resultStatus: number;
  resultStatusName: string;
  isOfficial: boolean;
  publishedAtUtc: string | null;
  results: RaceResultItemDto[];
}

export interface TournamentStandingRowDto {
  rank: number;
  horseId: string;
  totalPoints: number;
  wins: number;
  top3Count: number;
  totalPrize: number;
}

export interface RaceLiveStatusDto {
  raceId: string;
  raceStatus: number;
  raceStatusName: string;
  hasUnofficialResults: boolean;
  violationCount: number;
  hasRaceReport: boolean;
}

export interface HorseResultsDto {
  horseId: string;
  totalRaces: number;
  wins: number;
  top3Count: number;
  totalPoints: number;
  totalPrize: number;
  results: RaceResultItemDto[];
}

export interface JockeyPerformanceDto {
  jockeyId: string;
  totalRaces: number;
  wins: number;
  top3Count: number;
  totalPoints: number;
  averageRank: number;
  winRate: number;
  totalPrize: number;
}

export interface PublishRaceResultsPayload {
  note?: string | null;
  prizes: {
    rank: number;
    amount: number;
  }[];
}

export const racingResultsApi = {
  async getRaceResults(raceId: string) {
    const res = await api.get<ApiResponse<RaceResultsSummaryDto>>(`/racing/races/${raceId}/results`);
    return res.data.data!;
  },
  async getTournamentStandings(tournamentId: string) {
    const res = await api.get<ApiResponse<TournamentStandingRowDto[]>>(`/racing/tournaments/${tournamentId}/standings`);
    return res.data.data!;
  },
  async getRaceLiveStatus(raceId: string) {
    const res = await api.get<ApiResponse<RaceLiveStatusDto>>(`/racing/races/${raceId}/live-status`);
    return res.data.data!;
  },
  async publishRaceResults(raceId: string, payload: PublishRaceResultsPayload) {
    const res = await api.post<ApiResponse<null>>(`/results/${raceId}/publish`, payload);
    return res.data;
  },
};

export const ownerResultsApi = {
  async getHorseResults(horseId: string) {
    const res = await api.get<ApiResponse<HorseResultsDto>>(`/owners/me/horses/${horseId}/results`);
    return res.data.data!;
  },
};

export const jockeyPerformanceApi = {
  async getMyPerformance() {
    const res = await api.get<ApiResponse<JockeyPerformanceDto>>('/racing/jockeys/me/performance');
    return res.data.data!;
  },
};

// ---- Prediction service (FR-33..36) ----
export type RewardType = 'Points' | 'Voucher' | 'Cash';
export type PredictionStatus = 'Submitted' | 'Correct' | 'Wrong';
export type RewardStatus = 'Pending' | 'Notified' | 'Paid';

export interface PredictionRewardDto {
  rewardId: string;
  predictionId: string;
  rewardType: RewardType;
  amount: number | null;
  status: RewardStatus;
  createdAtUtc: string;
}

export interface MyPredictionDto {
  predictionId: string;
  raceId: string;
  predictedWinnerHorseId: string;
  status: PredictionStatus;
  createdAtUtc: string;
  lockedAtUtc: string | null;
  reward: {
    rewardId: string;
    rewardType: RewardType;
    amount: number | null;
    status: RewardStatus;
    createdAtUtc: string;
  } | null;
}

export interface PredictionConfigDto {
  configId: string;
  raceId: string;
  rules: string | null;
  rewardType: RewardType;
  rewardValue: number | null;
  predictionDeadline: string | null;
  isActive: boolean;
  createdBy: string;
  createdAtUtc: string;
}

export interface AdminPredictionDto {
  predictionId: string;
  raceId: string;
  spectatorUserId: string;
  predictedWinnerHorseId: string;
  status: PredictionStatus;
  createdAtUtc: string;
  lockedAtUtc: string | null;
}

export interface SubmitPredictionPayload {
  raceId: string;
  predictedWinnerHorseId: string;
}

export interface CreatePredictionConfigPayload {
  raceId: string;
  rules?: string | null;
  rewardType: RewardType;
  rewardValue?: number | null;
  predictionDeadline?: string | null;
}

export interface GradeRacePredictionsPayload {
  winningHorseId: string;
}

export const predictionsApi = {
  async submit(payload: SubmitPredictionPayload) {
    const res = await api.post('/predictions', payload);
    return res.data;
  },
  async getMine() {
    const res = await api.get<MyPredictionDto[]>('/predictions/me');
    return res.data;
  },
  async getMyRewards() {
    const res = await api.get<PredictionRewardDto[]>('/predictions/me/rewards');
    return res.data;
  },
  async markRewardNotified(rewardId: string) {
    const res = await api.post(`/predictions/me/rewards/${rewardId}/mark-notified`);
    return res.data;
  },
};

export const adminPredictionsApi = {
  async createConfig(payload: CreatePredictionConfigPayload) {
    const res = await api.post<PredictionConfigDto>('/predictions/admin/configs', payload);
    return res.data;
  },
  async getConfigs() {
    const res = await api.get<PredictionConfigDto[]>('/predictions/admin/configs');
    return res.data;
  },
  async disableConfig(configId: string) {
    const res = await api.patch(`/predictions/admin/configs/${configId}/disable`);
    return res.data;
  },
  async enableConfig(configId: string) {
    const res = await api.patch(`/predictions/admin/configs/${configId}/enable`);
    return res.data;
  },
  async getAllPredictions() {
    const res = await api.get<AdminPredictionDto[]>('/predictions/admin');
    return res.data;
  },
  async gradeRace(raceId: string, payload: GradeRacePredictionsPayload) {
    const res = await api.post(`/predictions/admin/races/${raceId}/grade`, payload);
    return res.data;
  },
};

export default api;
