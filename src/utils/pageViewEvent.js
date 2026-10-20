// A history entry can be visited more than once (Back/Forward). Each arrival
// gets its own event; retries of that arrival keep the same database ID.
export function createPageViewTracker(createId = () => crypto.randomUUID()) {
  let current;
  return {
    arrive(key, path) {
      if (!current || current.key !== key || current.path !== path) {
        current = { key, path, id: createId(), pending: false, recorded: false };
      }
      return current;
    },
  };
}
