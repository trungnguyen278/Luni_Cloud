/* ============================================================
   flags.ts — single source of truth for which sections run on demo
   (mock) data because the backend endpoint does not exist yet.
   Default ON (mock) for the missing-endpoint areas; set the env var
   to "0" to force the (currently absent) real path once it lands.
   ============================================================ */

export const FLAGS = {
  /** admin fleet table + overview online/total (no GET /admin/devices yet) */
  MOCK_ADMIN_FLEET: process.env.NEXT_PUBLIC_MOCK_ADMIN_FLEET !== '0',
  /** emotion distribution aggregation (no endpoint yet) */
  MOCK_EMOTION_DIST: process.env.NEXT_PUBLIC_MOCK_EMOTION_DIST !== '0',
  /** AI cost dashboard (no cost endpoints at all) */
  MOCK_COST: process.env.NEXT_PUBLIC_MOCK_COST !== '0',
  /** staged OTA rollout / adoption (no POST /admin/ota/rollout yet) */
  MOCK_OTA_ROLLOUT: process.env.NEXT_PUBLIC_MOCK_OTA_ROLLOUT !== '0',
  /** show the external Luni-date dev scrubber + demo login quick-fills */
  LUNI_DEV: process.env.NEXT_PUBLIC_LUNI_DEV === '1',
};
