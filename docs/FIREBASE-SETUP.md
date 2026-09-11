# Firebase foundation

Khata remains local-first. Dexie is the operational local database; Firebase is introduced as the cloud identity and persistence boundary for later sync and sharing work.

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

## Foundation scope

This phase only establishes:

- Firebase App initialization
- Firebase Authentication client
- Google provider configuration
- Cloud Firestore client

It does not add sign-in UI, local/cloud synchronization, Firestore data writes, sharing, or permissions yet.

## Google Authentication

Enable the Google sign-in provider in Firebase Authentication before testing the authentication phase. The application currently exposes a service boundary in `lib/firebase/auth.ts`; UI integration belongs to the next phase.

Never commit real Firebase configuration values that are meant to stay environment-specific. The web API key is not treated as a secret, but Firebase authorization is enforced by Authentication and Firestore security rules in later phases.
