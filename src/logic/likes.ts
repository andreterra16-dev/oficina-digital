// Per-viewer like state, persisted to `localStorage` — keyed by `Project.id`.

const STORAGE_KEY = 'oficina-likes';

/** Type guard: is `value` a plain `{ [projectId]: boolean }` record? */
function isLikesRecord(value: unknown): value is Record<string, boolean> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

/** Reads the persisted like map. Returns `{}` on first visit or on any parse/storage failure. */
export function loadLikes(): Record<string, boolean> {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    return isLikesRecord(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

/** Persists the like map. Silently no-ops if storage is unavailable (private mode, quota, etc). */
export function saveLikes(likes: Readonly<Record<string, boolean>>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(likes));
  } catch {
    // Best-effort only — a failed save just means likes won't survive a reload.
  }
}
