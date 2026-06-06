/* ============================================================
   types.ts — shared domain shapes used by the console UI.
   These mirror the FastAPI responses where one exists; for the
   admin fleet / cost (no endpoint yet) they back the demo data.
   ============================================================ */

/** Minimal device shape the studio components (RobotStage/AppMirror) render. */
export interface StudioDevice {
  id: string;
  name: string;
  model: string;
  online: boolean;
  battery: number;
  charging?: boolean;
  fw: string;
  rssi: number;
  emotion?: string;
  scene?: string;
}

/** A user's own device — GET /devices. */
export interface MyDevice extends StudioDevice {
  location: string;
  city: string;
  volume: number;
  brightness: number;
  autoOta: boolean;
}

/** Fleet device — GET /admin/devices (proposed; demo data for now). */
export interface FleetDevice {
  id: string;
  name: string;
  owner: string;
  email: string;
  city: string;
  model: string;
  fw: string;
  online: boolean;
  battery: number;
  charging: boolean;
  rssi: number;
  emotion: string;
  status: FleetStatus;
  issue?: string;
  lastSeen: string;
}

export type FleetStatus = 'ok' | 'warn' | 'error' | 'offline' | 'updating' | 'provision';

export interface StatusMeta {
  c: string;
  label: string;
  icon: string;
}

/** User row — GET /admin/users. */
export interface UserRow {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  device_count: number;
  created_at: string;
  last_login: string;
}

/** Firmware build — GET /admin/firmware. */
export interface FirmwareRow {
  id: string;
  version: string;
  model: string;
  channel: 'stable' | 'beta';
  size: number;
  sha256: string;
  changelog: string;
  is_active: boolean;
  installed: number;
  created_at: string;
}

export interface ChannelMeta {
  c: string;
  label: string;
}

export interface LogLevelMeta {
  c: string;
  label: string;
}

export interface LogRow {
  t: string;
  dev: string;
  lv: string;
  tag: string;
  msg: string;
}

export interface EmotionDistRow {
  label: string;
  v: number;
  c: string;
}

export interface ActivityRow {
  t: string;
  icon: string;
  c: string;
  text: string;
}
