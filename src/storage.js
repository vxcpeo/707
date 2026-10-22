const SAVED_KEY = "probiuna.saved.v1";
// Read compatibility only: existing browser collections survive the rebrand.
// Legacy release keys are read-only migration inputs; Probiuna is the only key we write.
const LEGACY_SAVED_KEYS = [
  "sourcivell.saved.v1",
  "folisprig.saved.v1",
  "evidrindle.saved.v1",
  "tessivra.saved.v1",
  "velnori.saved.v1",
  "siglorer.saved.v1",
];

export function readSavedProjects(projects, onPersistenceError = () => {}) {
  const current = localStorage.getItem(SAVED_KEY);
  const raw =
    current === null
      ? (LEGACY_SAVED_KEYS.map((key) => localStorage.getItem(key)).find(
          (value) => value !== null,
        ) ?? null)
      : current;
  const value = JSON.parse(raw ?? "[]");
  const ids = Array.isArray(value)
    ? value.filter((id) => projects.some((project) => project.id === id))
    : [];
  if (current === null && raw !== null) {
    try {
      writeSavedProjects(ids);
    } catch (error) {
      // Keep readable legacy entries usable when storage writes are blocked.
      onPersistenceError(error);
    }
  }
  return ids;
}

export function writeSavedProjects(ids) {
  // An explicit [] is authoritative, so old bookmarks cannot reappear.
  localStorage.setItem(SAVED_KEY, JSON.stringify(ids));
  for (const key of LEGACY_SAVED_KEYS) localStorage.removeItem(key);
}
