/* ============================================================
   web-data.jsx — seed data shaped to the real Luni Cloud API.
   (Prototype data only; field names mirror the FastAPI responses.)
   ============================================================ */

/* fleet — GET /admin/devices (proposed) */
const FLEET = [
  { id: 'A4CF12FF01A2', name: 'Luni #0142', owner: 'Nguyễn Mai', email: 'mai.nguyen@gmail.com', city: 'Hà Nội', model: 'Luni-C5', fw: '2.1.0', online: true, battery: 84, charging: false, rssi: -42, emotion: 'happy', status: 'ok', lastSeen: '2 phút trước' },
  { id: 'A4CF12FF02B7', name: 'Luni #0098', owner: 'Trần Hùng', email: 'hung.tran@gmail.com', city: 'Hồ Chí Minh', model: 'Luni-C5', fw: '2.0.4', online: true, battery: 12, charging: false, rssi: -71, emotion: 'sleepy', status: 'warn', issue: 'Pin yếu · heap thấp dần', lastSeen: '1 phút trước' },
  { id: 'A4CF12FF03C4', name: 'Luni #0205', owner: 'Lê Trang', email: 'trang.le@gmail.com', city: 'Đà Nẵng', model: 'Luni-C5', fw: '2.1.0', online: false, battery: 0, charging: false, rssi: -99, emotion: 'idle', status: 'offline', issue: 'Mất kết nối 3 ngày', lastSeen: '3 ngày trước' },
  { id: 'A4CF12FF04D1', name: 'Luni #0311', owner: 'Phạm Đức', email: 'duc.pham@gmail.com', city: 'Hải Phòng', model: 'Luni-C3', fw: '1.9.8', online: true, battery: 64, charging: true, rssi: -55, emotion: 'curious', status: 'error', issue: 'Crash loop · NVS lỗi (0x0a)', lastSeen: 'vừa xong' },
  { id: 'A4CF12FF05E8', name: 'Luni #0420', owner: 'Võ Linh', email: 'linh.vo@gmail.com', city: 'Cần Thơ', model: 'Luni-C5', fw: '2.1.0', online: true, battery: 78, charging: false, rssi: -48, emotion: 'calm', status: 'updating', issue: 'Đang nạp OTA 62% → 2.2.0', lastSeen: 'vừa xong' },
  { id: 'A4CF12FF06F5', name: 'Luni #0507', owner: '— chưa gán', email: '—', city: 'Kho Bắc Ninh', model: 'Luni-C5', fw: '2.1.0', online: true, battery: 91, charging: false, rssi: -39, emotion: 'neutral', status: 'provision', issue: 'Chưa cấp phép · cần gán user', lastSeen: 'vừa xong' },
  { id: 'A4CF12FF07A9', name: 'Luni #0533', owner: 'Đỗ Quân', email: 'quan.do@gmail.com', city: 'Huế', model: 'Luni-C5', fw: '2.1.0', online: true, battery: 56, charging: false, rssi: -61, emotion: 'happy', status: 'ok', lastSeen: '8 phút trước' },
  { id: 'A4CF12FF08B3', name: 'Luni #0560', owner: 'Bùi Hà', email: 'ha.bui@gmail.com', city: 'Nha Trang', model: 'Luni-C5', fw: '2.0.4', online: false, battery: 23, charging: false, rssi: -88, emotion: 'idle', status: 'offline', lastSeen: '5 giờ trước' },
];

const FLEET_STATUS = {
  ok:        { c: '#7BE88E', label: 'Tốt', icon: 'check' },
  warn:      { c: '#FF9D5B', label: 'Cảnh báo', icon: 'alert' },
  error:     { c: '#FF5B6E', label: 'Lỗi', icon: 'alert' },
  offline:   { c: '#5C6680', label: 'Ngoại tuyến', icon: 'power' },
  updating:  { c: '#76B8FF', label: 'Đang cập nhật', icon: 'download' },
  provision: { c: '#B48CFF', label: 'Chưa cấp phép', icon: 'key' },
};

/* users — GET /admin/users */
const USERS = [
  { id: 'usr_8842a1', name: 'Nguyễn Mai', email: 'mai.nguyen@gmail.com', role: 'user', is_active: true, device_count: 2, created_at: '12/01/2026', last_login: 'Hôm nay 09:14' },
  { id: 'usr_7731b9', name: 'Trần Hùng', email: 'hung.tran@gmail.com', role: 'user', is_active: true, device_count: 1, created_at: '03/02/2026', last_login: 'Hôm qua 21:40' },
  { id: 'usr_5510c2', name: 'Lê Trang', email: 'trang.le@gmail.com', role: 'user', is_active: true, device_count: 1, created_at: '28/02/2026', last_login: '3 ngày trước' },
  { id: 'usr_9921d4', name: 'Phạm Đức', email: 'duc.pham@gmail.com', role: 'user', is_active: false, device_count: 1, created_at: '15/03/2026', last_login: '12 ngày trước' },
  { id: 'usr_3304e7', name: 'Võ Linh', email: 'linh.vo@gmail.com', role: 'user', is_active: true, device_count: 1, created_at: '02/04/2026', last_login: 'Hôm nay 07:55' },
  { id: 'usr_admin1', name: 'Quản trị Luni', email: 'admin@luni.vn', role: 'admin', is_active: true, device_count: 1, created_at: '01/01/2026', last_login: 'Hôm nay 10:02' },
  { id: 'usr_6650f1', name: 'Đỗ Quân', email: 'quan.do@gmail.com', role: 'user', is_active: true, device_count: 1, created_at: '19/04/2026', last_login: 'Hôm nay 08:30' },
  { id: 'usr_ops002', name: 'Kỹ thuật viên', email: 'service@luni.vn', role: 'admin', is_active: true, device_count: 0, created_at: '08/01/2026', last_login: 'Hôm qua 16:20' },
];

/* firmware — GET /admin/firmware */
const FIRMWARE = [
  { id: 'fw_2200', version: '2.2.0', model: 'Luni-C5', channel: 'beta', size: 1_320_448, sha256: 'a3f1c9e8b7d6452f1029384756abcdef0011223344556677', changelog: 'Thêm cảnh thời tiết mới, vá rò rỉ heap khi WS reconnect, cải thiện đồng bộ trăng.', is_active: true, installed: 3, created_at: '28/05/2026' },
  { id: 'fw_2100', version: '2.1.0', model: 'Luni-C5', channel: 'stable', size: 1_283_072, sha256: 'ff20a11b9c8d7e6f5a4b3c2d1e0f9988776655443322110a', changelog: 'Phát hành ổn định: engine cảm xúc 9 tông, OTA an toàn 2 phân vùng.', is_active: true, installed: 41, created_at: '14/05/2026' },
  { id: 'fw_2040', version: '2.0.4', model: 'Luni-C5', channel: 'stable', size: 1_241_600, sha256: '7c6b5a4938271605f4e3d2c1b0a99887766554433221100ff', changelog: 'Vá lỗi brownout khi pin yếu, tinh chỉnh độ sáng màn hình.', is_active: true, installed: 12, created_at: '21/04/2026' },
  { id: 'fw_1980', version: '1.9.8', model: 'Luni-C3', channel: 'stable', size: 1_098_752, sha256: '0099aabbccddeeff112233445566778899aabbccddeeff00', changelog: 'Bản LTS cho phần cứng C3 đời đầu.', is_active: false, installed: 6, created_at: '02/03/2026' },
];

const CHANNEL = { stable: { c: '#7BE88E', label: 'stable' }, beta: { c: '#FFD166', label: 'beta' } };

/* server + device logs — GET /admin/logs/* */
const LOG_LV = {
  info:     { c: '#5BE9FF', label: 'INFO' },
  warn:     { c: '#FFD166', label: 'WARN' },
  error:    { c: '#FF5B6E', label: 'ERROR' },
  critical: { c: '#FF5B6E', label: 'CRIT' },
  debug:    { c: '#8592AB', label: 'DEBUG' },
};
const LOGS = [
  { t: '10:42:18', dev: 'Luni #0311', lv: 'critical', tag: 'nvs', msg: 'NVS init failed (0x0a) — entering crash loop, reboot count 7' },
  { t: '10:41:55', dev: 'server', lv: 'error', tag: 'ws', msg: 'device A4CF12FF03C4 socket closed unexpectedly (code 1006)' },
  { t: '10:40:12', dev: 'Luni #0420', lv: 'info', tag: 'ota', msg: 'OTA download 62% — chunk 188/303, sha256 streaming ok' },
  { t: '10:38:47', dev: 'Luni #0098', lv: 'warn', tag: 'power', msg: 'battery 12% below threshold — requesting low-power scene' },
  { t: '10:37:30', dev: 'server', lv: 'info', tag: 'auth', msg: 'admin@luni.vn refreshed token (jti rotated)' },
  { t: '10:36:09', dev: 'Luni #0098', lv: 'warn', tag: 'heap', msg: 'free_heap 18840 B trending down over 6h window' },
  { t: '10:34:51', dev: 'Luni #0142', lv: 'info', tag: 'emotion', msg: 'SET_EMOTION happy applied (source: app usr_8842a1)' },
  { t: '10:33:22', dev: 'server', lv: 'info', tag: 'weather', msg: 'weather cache refreshed for 6 cities (redis ttl 1800s)' },
  { t: '10:31:40', dev: 'Luni #0205', lv: 'error', tag: 'net', msg: 'no heartbeat for 72h — marked offline' },
  { t: '10:29:14', dev: 'server', lv: 'info', tag: 'ota', msg: 'firmware v2.2.0 (beta) uploaded by admin@luni.vn — 1.26 MB' },
];

/* overview stats */
const STAT_7D = [128, 156, 142, 198, 174, 220, 261];
const STAT_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
const EMOTION_DIST = [
  { label: 'Vui vẻ', v: 38, c: '#FFD166' },
  { label: 'Bình thường', v: 24, c: '#5BE9FF' },
  { label: 'Thư giãn', v: 16, c: '#76B8FF' },
  { label: 'Tò mò', v: 12, c: '#FF9D5B' },
  { label: 'Buồn ngủ', v: 10, c: '#B48CFF' },
];

/* user's own devices — GET /devices */
const MY_DEVICES = [
  { id: 'A4CF12FF01A2', name: 'Luni Phòng khách', location: 'Phòng khách', city: 'Hà Nội', model: 'Luni-C5', fw: '2.1.0', online: true, battery: 84, charging: false, rssi: -42, emotion: 'happy', scene: 'weather', volume: 62, brightness: 92, autoOta: false },
  { id: 'A4CF12FF09C1', name: 'Luni Bàn làm việc', location: 'Góc làm việc', city: 'Hà Nội', model: 'Luni-C5', fw: '2.0.4', online: false, battery: 31, charging: true, rssi: -67, emotion: 'sleepy', scene: 'sleep', volume: 45, brightness: 70, autoOta: true },
];

const USER_7D = [6, 11, 8, 14, 9, 17, 13];
const USER_BATTERY = [92, 88, 80, 71, 64, 84, 84];

/* recent activity (user overview) */
const ACTIVITY = [
  { t: '09:14', icon: 'chat', c: '#5BE9FF', text: 'Bạn hỏi Luni về thời tiết Hà Nội' },
  { t: '08:50', icon: 'sparkle', c: '#FFD166', text: 'Luni chuyển sang biểu cảm "Vui vẻ"' },
  { t: '08:30', icon: 'bolt', c: '#7BE88E', text: 'Luni Phòng khách sạc đầy 84%' },
  { t: 'Hôm qua', icon: 'download', c: '#76B8FF', text: 'Đã cài firmware v2.1.0' },
];

/* the OTA rollout demo targets */
function fmtSize(b) { return (b / 1048576).toFixed(2) + ' MB'; }

Object.assign(window, {
  FLEET, FLEET_STATUS, USERS, FIRMWARE, CHANNEL, LOG_LV, LOGS,
  STAT_7D, STAT_LABELS, EMOTION_DIST, MY_DEVICES, USER_7D, USER_BATTERY, ACTIVITY, fmtSize,
});
