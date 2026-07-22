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

// ---- Racing service: Races & Entries ----
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
  // Enriched server-side via gRPC (Horse/Identity) — null if not resolved (see ADR-0006).
  horseName: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
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

// ---- Jockey service (FR-16 → FR-22) ----
export type InvitationStatus = 'Pending' | 'Accepted' | 'Declined' | 'Cancelled' | 'Confirmed';
export type JockeyStatus = 'Active' | 'Suspended' | 'Retired';

export interface InvitationDto {
  id: string;
  raceId: string;
  raceName: string;
  horseId: string;
  horseName: string | null;
  jockeyId: string;
  jockeyName: string | null;
  message: string | null;
  status: number;
  statusName: InvitationStatus;
  sentAtUtc: string;
  respondedAtUtc: string | null;
  confirmedAtUtc: string | null;
}

export interface AssignedRaceForJockeyDto {
  invitationId: string;
  raceId: string;
  raceName: string;
  scheduledStart: string;
  horseId: string;
  horseName: string | null;
  horseBreed: string | null;
  horseColor: string | null;
  horseWeightKg: number | null;
  horseHeightCm: number | null;
  status: InvitationStatus;
}

export interface JockeyDto {
  userId: string;
  fullName: string;
  email: string;
  phone: string | null;
  status: number;
  statusName: JockeyStatus;
  totalRaces: number;
  createdAtUtc: string;
}

export interface GetInvitationsParams {
  horseId?: string;
  status?: InvitationStatus;
  pageNumber?: number;
  pageSize?: number;
}

export interface GetAllJockeysParams {
  search?: string;
  status?: JockeyStatus;
  pageNumber?: number;
  pageSize?: number;
}

export const jockeyApi = {
  // FR-16: Horse Owner gửi lời mời jockey
  async sendInvitation(payload: {
    raceId: string;
    horseId: string;
    jockeyId: string;
    message?: string | null;
  }): Promise<{ message: string }> {
    const res = await api.post<ApiResponse<{ message: string }>>('/racing/jockeys/invitations', payload);
    return res.data as unknown as { message: string };
  },

  // FR-17: Horse Owner xem danh sách lời mời đã gửi (theo ngựa)
  async getHorseInvitations(params: GetInvitationsParams): Promise<PagedResult<InvitationDto>> {
    const res = await api.get<ApiResponse<PagedResult<InvitationDto>>>('/racing/jockeys/invitations', { params });
    return res.data.data!;
  },

  // FR-17: Horse Owner hủy lời mời
  async cancelInvitation(id: string): Promise<void> {
    await api.delete(`/racing/jockeys/invitations/${id}`);
  },

  // FR-18: Jockey xem lời mời của mình
  async getMyInvitations(params: { status?: InvitationStatus; pageNumber?: number; pageSize?: number }): Promise<PagedResult<InvitationDto>> {
    const res = await api.get<ApiResponse<PagedResult<InvitationDto>>>('/racing/jockeys/me/invitations', { params });
    return res.data.data!;
  },

  // FR-19: Jockey Accept / Decline lời mời
  async respondInvitation(id: string, response: 'Accepted' | 'Declined'): Promise<void> {
    await api.post(`/racing/jockeys/invitations/${id}/respond`, { response });
  },

  // FR-20: Horse Owner xác nhận jockey tham gia cuộc đua
  async confirmJockey(id: string): Promise<void> {
    await api.post(`/racing/jockeys/invitations/${id}/confirm`, {});
  },

  // FR-21: Jockey xem cuộc đua được phân công
  async getMyAssignedRaces(params: { pageNumber?: number; pageSize?: number }): Promise<PagedResult<AssignedRaceForJockeyDto>> {
    const res = await api.get<ApiResponse<PagedResult<AssignedRaceForJockeyDto>>>('/racing/jockeys/me/races', { params });
    return res.data.data!;
  },

  // FR-22: Admin xem toàn bộ jockey
  async getAllJockeys(params: GetAllJockeysParams): Promise<PagedResult<JockeyDto>> {
    const res = await api.get<ApiResponse<PagedResult<JockeyDto>>>('/racing/jockeys', { params });
    return res.data.data!;
  },

  // FR-22: Admin cập nhật trạng thái jockey
  async updateJockeyStatus(id: string, status: JockeyStatus): Promise<void> {
    await api.put(`/racing/jockeys/${id}/status`, { status });
  },
};

export default api;

// ---- Racing service types & API ----
export interface TournamentDto {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  status: number;
  statusName: string;
  totalPrizePool: number | null;
  createdBy: string;
  createdAtUtc: string;
  updatedAtUtc: string | null;
}

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
  // Enriched server-side via gRPC (Horse/Identity) — null if not resolved (see ADR-0006).
  horseName: string | null;
  ownerEmail: string | null;
  ownerFullName: string | null;
}

const racingApiClient = axios.create({ baseURL: '/api/racing' });
racingApiClient.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const tournamentsApi = {
  async list(params?: { search?: string; status?: number; pageNumber?: number; pageSize?: number }) {
    const res = await racingApiClient.get<ApiResponse<PagedResult<TournamentDto>>>('/tournaments', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await racingApiClient.get<ApiResponse<TournamentDto>>(`/tournaments/${id}`);
    return res.data.data!;
  },
  async create(data: { name: string; description?: string; location?: string; startDate: string; endDate: string }) {
    const res = await racingApiClient.post<ApiResponse<TournamentDto>>('/tournaments', data);
    return res.data.data!;
  },
  async update(id: string, data: { name: string; description?: string; location?: string; startDate: string; endDate: string; totalPrizePool?: number }) {
    const res = await racingApiClient.put<ApiResponse<TournamentDto>>(`/tournaments/${id}`, data);
    return res.data.data!;
  },
};

export const racesApi = {
  async list(params?: { tournamentId?: string; search?: string; status?: number; pageNumber?: number; pageSize?: number }) {
    const res = await racingApiClient.get<ApiResponse<PagedResult<RaceDto>>>('/races', { params });
    return res.data.data!;
  },
  async getById(id: string) {
    const res = await racingApiClient.get<ApiResponse<RaceDto>>(`/races/${id}`);
    return res.data.data!;
  },
  async create(data: {
    tournamentId: string; trackId: string; name: string; scheduledStart: string;
    scheduledEnd?: string; distanceM: number; maxHorses: number;
    registrationDeadline?: string; rounds: { roundNumber: number; name?: string; scheduledTime?: string }[];
  }) {
    const res = await racingApiClient.post<ApiResponse<RaceDto>>('/races', data);
    return res.data.data!;
  },
  async update(id: string, data: {
    name: string; scheduledStart: string; scheduledEnd?: string;
    distanceM: number; maxHorses: number; registrationDeadline?: string;
  }) {
    await racingApiClient.put(`/races/${id}`, data);
  },
};

export const entriesApi = {
  async list(params?: { raceId?: string; horseId?: string; status?: number; pageNumber?: number; pageSize?: number }) {
    const res = await racingApiClient.get<ApiResponse<PagedResult<RaceEntryDto>>>('/entries', { params });
    return res.data.data!;
  },
  async register(raceId: string, horseId: string) {
    const res = await racingApiClient.post<ApiResponse<RaceEntryDto>>('/entries', { raceId, horseId });
    return res.data.data!;
  },
  async confirm(id: string) {
    await racingApiClient.post(`/entries/${id}/confirm`);
  },
  async approve(id: string) {
    await racingApiClient.post(`/entries/${id}/approve`);
  },
};

// ---- Prediction service types & API (FR-33..36) ----
export type RewardType = 'Points' | 'Voucher' | 'Cash';
export type PredictionStatus = 'Submitted' | 'Correct' | 'Wrong';
export type RewardStatus = 'Pending' | 'Notified' | 'Paid';

export interface MyPredictionDto {
  predictionId: string;
  raceId: string;
  predictedWinnerHorseId: string;
  status: PredictionStatus;
  createdAtUtc: string;
  lockedAtUtc: string | null;
  reward: PredictionRewardDto | null;
}

export interface PredictionRewardDto {
  rewardId: string;
  predictionId?: string;
  rewardType: RewardType;
  amount: number | null;
  status: RewardStatus;
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

const predictionClient = axios.create({ baseURL: '/api/predictions' });
predictionClient.interceptors.request.use((config) => {
  const token = tokenStore.access;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const predictionsApi = {
  async submit(payload: { raceId: string; predictedWinnerHorseId: string }) {
    const res = await predictionClient.post<ApiResponse<unknown>>('', payload);
    return res.data;
  },
  async getMine() {
    const res = await predictionClient.get<MyPredictionDto[]>('/me');
    return res.data;
  },
  async getMyRewards() {
    const res = await predictionClient.get<PredictionRewardDto[]>('/me/rewards');
    return res.data;
  },
  async markRewardNotified(rewardId: string) {
    const res = await predictionClient.post<ApiResponse<unknown>>(`/me/rewards/${rewardId}/mark-notified`);
    return res.data;
  },
};

export const adminPredictionsApi = {
  async createConfig(payload: {
    raceId: string; rules?: string | null; rewardType: RewardType;
    rewardValue?: number | null; predictionDeadline?: string | null;
  }) {
    const res = await predictionClient.post<ApiResponse<unknown>>('/admin/configs', payload);
    return res.data;
  },
  async getConfigs() {
    const res = await predictionClient.get<PredictionConfigDto[]>('/admin/configs');
    return res.data;
  },
  async disableConfig(configId: string) {
    await predictionClient.patch(`/admin/configs/${configId}/disable`);
  },
  async enableConfig(configId: string) {
    await predictionClient.patch(`/admin/configs/${configId}/enable`);
  },
  async getAllPredictions() {
    const res = await predictionClient.get<AdminPredictionDto[]>('/admin');
    return res.data;
  },
  async gradeRace(raceId: string, payload: { winningHorseId: string }) {
    const res = await predictionClient.post<unknown>(`/admin/races/${raceId}/grade`, payload);
    return res.data;
  },
};
