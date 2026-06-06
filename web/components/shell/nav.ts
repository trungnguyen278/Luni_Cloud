/* ============================================================
   nav.ts — sidebar nav config + page metadata. Ported from web-shell.jsx.
   ============================================================ */

export interface NavItem {
  group?: string;
  id?: string;
  label?: string;
  icon?: string;
  star?: boolean;
}

export const USER_NAV: NavItem[] = [
  { group: 'Robot' },
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'studio', label: 'Robot của tôi', icon: 'sparkle' },
  { id: 'chat', label: 'Trò chuyện', icon: 'chat' },
  { id: 'stats', label: 'Thống kê', icon: 'chart' },
  { group: 'Tài khoản' },
  { id: 'ota', label: 'Cập nhật', icon: 'download' },
  { id: 'settings', label: 'Cài đặt', icon: 'gear' },
];

export const ADMIN_NAV: NavItem[] = [
  { group: 'Vận hành' },
  { id: 'overview', label: 'Tổng quan', icon: 'grid' },
  { id: 'devices', label: 'Thiết bị', icon: 'cpu' },
  { id: 'users', label: 'Người dùng', icon: 'users' },
  { id: 'cost', label: 'Chi phí AI', icon: 'bolt' },
  { group: 'Phát hành' },
  { id: 'firmware', label: 'Firmware', icon: 'chip', star: true },
  { id: 'logs', label: 'Nhật ký', icon: 'logs' },
];

export interface PageMeta {
  t: string;
  s: string;
}

export const PAGE_META: Record<string, PageMeta> = {
  overview: { t: 'Tổng quan', s: 'Bức tranh toàn cảnh hôm nay' },
  studio: { t: 'Robot của tôi', s: 'Xem trực tiếp & điều khiển Luni' },
  chat: { t: 'Trò chuyện', s: 'Lịch sử hội thoại với Luni' },
  stats: { t: 'Thống kê', s: 'Tương tác, pin và cảm xúc theo thời gian' },
  ota: { t: 'Cập nhật firmware', s: 'OTA cho robot của bạn' },
  settings: { t: 'Cài đặt', s: 'Tài khoản, bảo mật và ứng dụng' },
  devices: { t: 'Thiết bị', s: 'Toàn bộ fleet robot Luni' },
  users: { t: 'Người dùng', s: 'Quản lý tài khoản & vai trò' },
  firmware: { t: 'Firmware (OTA)', s: 'Xuất bản — robot tự cập nhật khi đủ điều kiện' },
  logs: { t: 'Nhật ký hệ thống', s: 'Log thiết bị & máy chủ toàn fleet' },
  cost: { t: 'Chi phí AI', s: 'Chi phí mô hình AI toàn fleet — theo ngày, dịch vụ & thiết bị' },
};

/** Section ids each role may visit (derived from the nav configs). */
export const USER_SECTIONS = USER_NAV.filter((n) => n.id).map((n) => n.id as string);
export const ADMIN_SECTIONS = ADMIN_NAV.filter((n) => n.id).map((n) => n.id as string);
