// Single-flight guard for mutations triggered by taps.
//
// React state (`saving`) only disables the button *after* a re-render, so
// two rapid taps can both pass the check and fire the mutation twice.
// This ref-style guard closes that race: the second run is dropped until
// the first settles (success or failure both release it via finally).
export function createMutationGuard() {
  let busy = false;
  return {
    get isBusy(): boolean {
      return busy;
    },
    run<R>(fn: () => Promise<R>): Promise<R | null> {
      if (busy) return Promise.resolve(null);
      busy = true;
      return fn().finally(() => {
        busy = false;
      });
    },
  };
}
