# Sync retry and poison-mutation policy

R15.2 defines how failed local mutations are retried without allowing one permanently failing mutation to block the queue.

## Policy

- A failed push remains durable with its `attempts`, `lastError`, and `nextRetryAt`.
- Automatic sync retries only failed mutations whose backoff window has elapsed.
- Retry delay is capped exponential backoff: 1 second, 2 seconds, 4 seconds, then doubling up to 5 minutes.
- After 8 automatic attempts, a mutation is treated as a poison mutation and is excluded from automatic retry. It remains durable in the queue for diagnosis and explicit manual recovery.
- Queue processing continues after a mutation fails. Later pending/retryable mutations are still attempted in the same sync pass.
- A push error is still surfaced after the queue and pull phases finish, so the UI can report an error without unnecessarily blocking unrelated work.
- The Settings "Sync now" action is an explicit recovery action and may retry failed mutations immediately, including poison mutations.

## Recovery boundary

Automatic backoff is intentionally bypassed only by explicit user action. This prevents the normal foreground/online/interval sync triggers from hammering a permanently failing mutation while preserving a direct manual recovery path.

This policy concerns local push failures. Malformed remote journal rows follow the separate quarantine policy in `SYNC-QUARANTINE.md`.
