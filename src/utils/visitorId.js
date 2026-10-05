const VISITOR_ID_KEY = 'tc_visitor_id';
let memoryId;

export function getOrCreateVisitorId() {
  try {
    const stored = localStorage.getItem(VISITOR_ID_KEY);
    if (stored && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(stored)) return stored;
    memoryId ||= crypto.randomUUID();
    localStorage.setItem(VISITOR_ID_KEY, memoryId);
  } catch {
    memoryId ||= crypto.randomUUID();
  }
  return memoryId;
}
