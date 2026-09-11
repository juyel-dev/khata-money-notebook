# Firebase foundation

Khata remains local-first. Dexie is the operational local database; Firebase provides the cloud identity and persistence boundary for sync and sharing work.

## Required web environment

Create the following environment variables for local development and deployment:

```text
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

These values come from the Firebase web app configuration for the Khata Firebase project.

## Current scope

The Firebase work completed so far establishes:

- Firebase App initialization
- Firebase Authentication client
- Google provider configuration
- Cloud Firestore client
- App-wide auth state observation
- Sign in / sign out UI using the Google provider
- A minimal local account/profile presentation from the Firebase Auth user

This phase still does **not** add cloud data writes, local/cloud synchronization, sharing, or application-data security rules.

## Google Authentication

Enable the Google sign-in provider in Firebase Authentication before testing the account experience. The authentication service lives in `lib/firebase/auth.ts`, and app-wide state is exposed through `lib/firebase/AuthProvider.tsx`.

Sign-in is optional for normal local Khata use. A signed-in user is ready for the later cloud sync and sharing phases.

Never commit real Firebase configuration values that are meant to stay environment-specific. The web API key is not treated as a secret, but Firebase authorization is enforced by Authentication and Firestore security rules in later phases.
