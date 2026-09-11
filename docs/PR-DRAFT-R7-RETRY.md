# R7 retry-delay follow-up

Implemented directly in the feature branch:

- `getRetryDelayMs(NaN)` now falls back to the base 1s delay.
- Negative attempts continue to clamp to 0.
- Added regression coverage for both NaN and negative attempts.
- Added the clock-skew release-gate note for the future Firestore sync adapter.

This file is temporary PR context and should be removed if it is not useful to the project documentation.
