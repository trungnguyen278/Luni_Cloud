/* ============================================================
   api/types.ts — TypeScript shapes mirroring the FastAPI responses.
   Extended per milestone as endpoints get wired.
   ============================================================ */

/* ---- auth ---- */
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar_url?: string | null;
  is_active: boolean;
  created_at: string;
  last_login?: string | null;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface RefreshResponse {
  access_token: string;
  token_type: string;
}

/* ---- devices ---- */
export interface Device {
  id: string; // MAC
  owner_id: string;
  name: string;
  model: string;
  fw_version?: string | null;
  hw_version?: string | null;
  location?: string | null;
  timezone: string;
  latitude?: number | null;
  longitude?: number | null;
  city?: string | null;
  config: Record<string, unknown>;
  is_online: boolean;
  last_seen?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceStatus {
  device_id: string;
  is_online: boolean;
  last_state?: Record<string, unknown> | null;
  last_seen?: string | null;
}

/* ---- interactions ---- */
export interface Interaction {
  id: number;
  device_id: string;
  user_id?: string | null;
  direction: string;
  source: string;
  input_text?: string | null;
  output_text?: string | null;
  emotion?: string | null;
  audio_secs?: number | null;
  latency_ms?: number | null;
  created_at: string;
}

export interface InteractResult {
  input: string;
  output: string;
  emotion: string;
  latency_ms: number;
  interaction_id: number;
}

/* ---- stats ---- */
export interface DeviceStats {
  daily_interactions: number[];
  uptime_today: string;
  audio_minutes: string;
  warnings: number;
  battery?: (number | null)[];
  emotions?: { emotion: string; count: number }[];
}

/* ---- ota ---- */
export interface OtaCheck {
  available: boolean;
  firmware_id?: string;
  version?: string;
  model?: string;
  sha256?: string;
  size?: number;
  changelog?: string;
  channel?: string;
  created_at?: string;
}

/* ---- firmware (admin) ---- */
export interface FirmwareBuild {
  id: string;
  version: string;
  model: string;
  channel: 'stable' | 'beta';
  size: number;
  sha256: string;
  changelog: string;
  is_active: boolean;
  storage_url?: string;
  installed: number;
  created_at: string;
}

/* ---- admin users ---- */
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  device_count: number;
  created_at: string;
  last_login?: string | null;
}

/* ---- logs ---- */
export interface DeviceLog {
  id: number;
  device_id: string;
  source: string;
  level: string;
  tag: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  created_at: string;
}

export interface ServerLog {
  id: number;
  level: string;
  module: string;
  message: string;
  metadata?: Record<string, unknown> | null;
  request_id?: string | null;
  user_id?: string | null;
  device_id?: string | null;
  created_at: string;
}

/* ---- admin analytics ---- */
export interface AdminOverviewData {
  devices_total: number;
  devices_online: number;
  users: number;
  interactions_today: number;
  errors_24h: number;
}

export interface EmotionStat {
  emotion: string;
  count: number;
}

export interface AiUsageService {
  id: string;
  label: string;
  icon: string;
  c: string;
  cost: number;
  share: number;
}

export interface AiUsageDevice {
  id: string;
  name: string;
  owner: string;
  conv: number;
  cost: number;
}

export interface AiUsage {
  currency: string;
  estimated: boolean;
  unit_price: number;
  total: number;
  budget: number;
  projected: number;
  tokens_est: number;
  conversations: number;
  per_conversation: number;
  daily: number[];
  daily_conv: number[];
  services: AiUsageService[];
  devices: AiUsageDevice[];
}

export interface RolloutResult {
  eligible: number;
  targeted: number;
  sent: number;
  version: string;
  channel: string;
}
