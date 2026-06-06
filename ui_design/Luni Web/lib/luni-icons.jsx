/* ============================================================
   Icon — compact stroke icon set (1.7 weight, rounded).
   <Icon name="wifi" size={20} color="..." />
   ============================================================ */
const LUNI_ICON_PATHS = {
  // nav / chrome
  back:    '<path d="M15 19l-7-7 7-7"/>',
  chevron: '<path d="M9 6l6 6-6 6"/>',
  chevronDown: '<path d="M6 9l6 6 6-6"/>',
  close:   '<path d="M6 6l12 12M18 6L6 18"/>',
  plus:    '<path d="M12 5v14M5 12h14"/>',
  check:   '<path d="M4 12l5 5L20 6"/>',
  more:    '<circle cx="5" cy="12" r="1.4"/><circle cx="12" cy="12" r="1.4"/><circle cx="19" cy="12" r="1.4"/>',
  search:  '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>',
  refresh: '<path d="M3 12a9 9 0 0115.5-6.2M21 12a9 9 0 01-15.5 6.2"/><path d="M18 3v4h-4M6 21v-4h4"/>',
  // connectivity
  bluetooth: '<path d="M7 7l10 10-5 4V3l5 4L7 17"/>',
  wifi:    '<path d="M2.5 9a16 16 0 0119 0M5.5 12.5a11 11 0 0113 0M8.5 16a6 6 0 017 0"/><circle cx="12" cy="19.5" r="1.1" fill="currentColor" stroke="none"/>',
  signal:  '<path d="M4 20v-3M9 20v-7M14 20v-11M19 20V4"/>',
  power:   '<path d="M12 4v8"/><path d="M7 6.5a8 8 0 1010 0"/>',
  // device
  battery: '<rect x="2" y="7" width="17" height="10" rx="2.5"/><path d="M22 10v4"/>',
  bolt:    '<path d="M13 3L5 13h5l-1 8 8-10h-5l1-8z" fill="currentColor" stroke="none"/>',
  cpu:     '<rect x="6" y="6" width="12" height="12" rx="2.5"/><path d="M9.5 2.5v2M14.5 2.5v2M9.5 19.5v2M14.5 19.5v2M2.5 9.5h2M2.5 14.5h2M19.5 9.5h2M19.5 14.5h2"/>',
  chip:    '<rect x="5" y="5" width="14" height="14" rx="3"/><rect x="9" y="9" width="6" height="6" rx="1.5"/>',
  location:'<path d="M12 21s7-5.6 7-11a7 7 0 10-14 0c0 5.4 7 11 7 11z"/><circle cx="12" cy="10" r="2.5"/>',
  clock:   '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
  // tabs
  grid:    '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  sliders: '<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2.3"/><circle cx="8" cy="16" r="2.3"/>',
  chat:    '<path d="M4 5.5h16a1.5 1.5 0 011.5 1.5v8a1.5 1.5 0 01-1.5 1.5H9l-4.5 3.5V17H4A1.5 1.5 0 012.5 15V7A1.5 1.5 0 014 5.5z"/>',
  logs:    '<rect x="3.5" y="3.5" width="17" height="17" rx="2.5"/><path d="M7 9l2.5 2.5L7 14M12 14.5h5"/>',
  chart:   '<path d="M3 3v18h18"/><path d="M7 14l3-4 3 3 4-7"/>',
  download:'<path d="M12 3v12M7 11l5 5 5-5"/><path d="M5 20h14"/>',
  gear:    '<circle cx="12" cy="12" r="3.2"/><path d="M12 2.5l1.3 2.5 2.8-.5.6 2.8 2.5 1.3-1.2 2.6 1.2 2.6-2.5 1.3-.6 2.8-2.8-.5L12 21.5l-1.3-2.5-2.8.5-.6-2.8-2.5-1.3 1.2-2.6L4 9.7l2.5-1.3.6-2.8 2.8.5z"/>',
  // misc
  mail:    '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 7l8.5 6 8.5-6"/>',
  lock:    '<rect x="4.5" y="10" width="15" height="10.5" rx="2.5"/><path d="M8 10V7a4 4 0 018 0v3"/>',
  eye:     '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff:  '<path d="M3 3l18 18M10 5.7A8.7 8.7 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 01-3 3.6M6.5 7.6A16 16 0 002.5 12S6 18.5 12 18.5a8.6 8.6 0 003.4-.7"/>',
  user:    '<circle cx="12" cy="8.5" r="4"/><path d="M4.5 20a7.5 7.5 0 0115 0"/>',
  users:   '<circle cx="9" cy="8.5" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0113 0"/><path d="M16 5.2a3.5 3.5 0 010 6.6M17 14.5a6.5 6.5 0 014.5 5.5"/>',
  share:   '<circle cx="6" cy="12" r="2.5"/><circle cx="17" cy="6" r="2.5"/><circle cx="17" cy="18" r="2.5"/><path d="M8.3 10.8l6.4-3.6M8.3 13.2l6.4 3.6"/>',
  send:    '<path d="M4 12l16-7-7 16-2.5-6.5L4 12z"/>',
  mic:     '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21"/>',
  volume:  '<path d="M4 9.5v5h3.5L12 19V5L7.5 9.5H4z"/><path d="M16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>',
  sun:     '<circle cx="12" cy="12" r="4"/><path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M5 5l1.8 1.8M17.2 17.2L19 19M19 5l-1.8 1.8M6.8 17.2L5 19"/>',
  shield:  '<path d="M12 3l7.5 3v6c0 5-3.5 8-7.5 9.5C8 19 4.5 16 4.5 12V6L12 3z"/>',
  trash:   '<path d="M4 7h16M9 7V4.5h6V7M6 7l1 13h10l1-13"/>',
  edit:    '<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/>',
  copy:    '<rect x="8" y="8" width="12" height="12" rx="2.5"/><path d="M16 8V5a2 2 0 00-2-2H6a2 2 0 00-2 2v8a2 2 0 002 2h2"/>',
  alert:   '<path d="M12 3L1.5 21h21L12 3z"/><path d="M12 10v5M12 18h.01"/>',
  info:    '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
  sparkle: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3z"/>',
  moon:    '<path d="M20 14.5A8 8 0 119.5 4 6.5 6.5 0 0020 14.5z"/>',
  home:    '<path d="M4 11l8-7 8 7"/><path d="M6 9.5V20h12V9.5"/>',
  heart:   '<path d="M12 20s-7-4.6-9.3-9C1 8 2.5 4.5 6 4.5c2 0 3.2 1.2 4 2.3.8-1.1 2-2.3 4-2.3 3.5 0 5 3.5 3.3 6.5C19 15.4 12 20 12 20z"/>',
  play:    '<path d="M7 4.5v15l13-7.5L7 4.5z" fill="currentColor" stroke="none"/>',
  globe:   '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14.5 0 17M12 3.5c-2.5 2.5-2.5 14.5 0 17"/>',
  key:     '<circle cx="8" cy="8" r="4"/><path d="M11 11l8 8M16 16l2-2M18.5 18.5l1.5-1.5"/>',
  link:    '<path d="M9 15l6-6M10 7l1.5-1.5a4 4 0 015.5 5.5L15.5 12M14 17l-1.5 1.5a4 4 0 01-5.5-5.5L8.5 12"/>',
  wave:    '<path d="M2 12c2 0 2-4 4-4s2 8 4 8 2-12 4-12 2 8 4 8 2-4 4-4"/>',
  qr:      '<rect x="3.5" y="3.5" width="6" height="6" rx="1"/><rect x="14.5" y="3.5" width="6" height="6" rx="1"/><rect x="3.5" y="14.5" width="6" height="6" rx="1"/><path d="M14.5 14.5h3v3M20.5 17.5v3h-3M17.5 20.5h0"/>',
  speaker: '<rect x="6" y="3" width="12" height="18" rx="3"/><circle cx="12" cy="14" r="3.5"/><circle cx="12" cy="7" r="1.2"/>',
  flag:    '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
};

function Icon({ name, size = 20, color = 'currentColor', strokeWidth = 1.7, style }) {
  const p = LUNI_ICON_PATHS[name] || '';
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      style={{ flex: 'none', display: 'block', ...style }}
      dangerouslySetInnerHTML={{ __html: p }}
    />
  );
}

Object.assign(window, { Icon, LUNI_ICON_PATHS });
