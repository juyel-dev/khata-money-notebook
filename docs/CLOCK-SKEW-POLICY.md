# Clock-skew policy for sync

R5 version ordering currently uses wall-clock `changedAt` as the primary ordering field, with `deviceId` and logical `sequence` as deterministic tie-breakers.

The actual Firestore sync adapter must not assume that a larger wall-clock timestamp always means a causally newer edit across devices. Device clocks can be slow or fast relative to one another.

Until the transport layer has an authoritative server timestamp or another causal mechanism, incoming mutations must not be discarded solely because their client `changedAt` is older. The adapter should preserve the mutation/version metadata and apply an explicit clock-skew policy during merge so a slow-clock device cannot silently lose a legitimate newer write.

This document is a release gate for the first production sync adapter: the chosen policy must be implemented in code and covered by tests before enabling multi-device sync.
