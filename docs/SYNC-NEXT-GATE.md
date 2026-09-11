# Next sync-adapter gate

Before production multi-device Firestore sync is enabled:

1. Define and implement an explicit clock-skew policy. `changedAt` is client wall-clock time and must not be treated as a reliable causal clock across devices.
2. Ensure a slow-clock device cannot silently lose a legitimate newer mutation just because its `changedAt` is smaller.
3. Add tests for skewed-device ordering and document the chosen behavior.
4. Regenerate `package-lock.json` with npm so the lockfile includes the existing Firebase dependency and `npm ci` succeeds.
