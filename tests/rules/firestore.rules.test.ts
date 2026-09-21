// Emulator-backed Firestore rules tests. See ./README.md for why this
// suite exists, why it's excluded from the default `npm test` run, and
// how to run it (npm run test:rules). NOT executed in this sandbox — the
// Firestore emulator JAR download (storage.googleapis.com) was blocked by
// this environment's network egress allow-list. Run it somewhere with
// normal internet access before relying on it.
import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestContext,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  type Firestore,
} from "firebase/firestore";

const [emulatorHost, emulatorPortStr] = (process.env.FIRESTORE_EMULATOR_HOST ?? "127.0.0.1:8080").split(":");
const emulatorPort = Number(emulatorPortStr);

const ALICE = "alice-uid";
const BOB = "bob-uid";
const ADMIN = "REPLACE_WITH_ADMIN_UID";

let testEnv: RulesTestEnvironment;

// @firebase/rules-unit-testing's .d.ts types RulesTestContext.firestore()
// as the legacy firebase.firestore.Firestore (compat) type, but per the
// library's own documented usage it returns an instance that works
// directly with the modular firebase/firestore functions (doc, setDoc,
// etc.) at runtime. This cast bridges the stale type declaration.
function modular(context: RulesTestContext): Firestore {
  return context.firestore() as unknown as Firestore;
}

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-khata-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: emulatorHost,
      port: emulatorPort,
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Seeds data by bypassing rules entirely — used to set up fixtures that a
// real client wouldn't necessarily be able to write itself (e.g. a second
// user's private notebook, or a share already flipped active).
async function seed(fn: (db: Firestore) => Promise<void>): Promise<void> {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await fn(modular(context));
  });
}

const notebook = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "n1",
  name: "Cloth Shop",
  openingBalance: 0,
  createdAt: 1000,
  updatedAt: 1000,
  archived: false,
  color: "green",
  icon: "shop",
  pinned: false,
  ...overrides,
});

const person = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "p1",
  notebookId: "n1",
  name: "Rahim",
  createdAt: 1001,
  ...overrides,
});

const transaction = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "t1",
  notebookId: "n1",
  personId: "p1",
  type: "gave",
  amount: 100,
  occurredAt: 1002,
  createdAt: 1002,
  ...overrides,
});

const shareRoot = (overrides: Partial<Record<string, unknown>> = {}) => ({
  token: "tok1",
  ownerUid: ALICE,
  scope: "khata",
  notebookId: "n1",
  title: "Cloth Shop",
  createdAt: 1003,
  expiresAt: null,
  active: false,
  schemaVersion: 1,
  ...overrides,
});

describe("owner isolation", () => {
  it("lets Alice read and write her own notebook", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertSucceeds(setDoc(doc(alice, "users", ALICE, "notebooks", "n1"), notebook()));
    await assertSucceeds(getDoc(doc(alice, "users", ALICE, "notebooks", "n1")));
  });

  it("denies Alice reading or writing Bob's notebook", async () => {
    await seed((db) => setDoc(doc(db, "users", BOB, "notebooks", "n1"), notebook()));

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(getDoc(doc(alice, "users", BOB, "notebooks", "n1")));
    await assertFails(setDoc(doc(alice, "users", BOB, "notebooks", "n2"), notebook({ id: "n2" })));
  });

  it("denies an unauthenticated request to private data", async () => {
    await seed((db) => setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook()));

    const anon = modular(testEnv.unauthenticatedContext());
    await assertFails(getDoc(doc(anon, "users", ALICE, "notebooks", "n1")));
  });

  it("allows every declared sync subcollection for the owner", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertSucceeds(setDoc(doc(alice, "users", ALICE, "groups", "g1"), { id: "g1", name: "Shop", createdAt: 1 }));
    await assertSucceeds(setDoc(doc(alice, "users", ALICE, "people", "p1"), person()));
    await assertSucceeds(setDoc(doc(alice, "users", ALICE, "transactions", "t1"), transaction()));
    await assertSucceeds(
      setDoc(doc(alice, "users", ALICE, "_syncMutations", "m1"), { id: "m1", entity: "notebook" }),
    );
    await assertSucceeds(
      setDoc(doc(alice, "users", ALICE, "_syncTombstones", "notebook:n1"), { entity: "notebook", entityId: "n1" }),
    );
    await assertSucceeds(setDoc(doc(alice, "users", ALICE, "_syncMeta", "order"), { value: "0" }));
  });

  it("denies a subcollection that isn't in the explicit allow-list", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(setDoc(doc(alice, "users", ALICE, "somethingUnexpected", "x1"), { hello: "world" }));
  });
});

describe("share creation", () => {
  it("lets the owner create a share only in the inactive state", async () => {
    await seed((db) => setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook()));

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertSucceeds(setDoc(doc(alice, "shares", "tok1"), shareRoot()));
  });

  it("rejects creating a share already active", async () => {
    await seed((db) => setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook()));

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(setDoc(doc(alice, "shares", "tok1"), shareRoot({ active: true })));
  });

  it("rejects a share for a notebook the caller doesn't actually own in Firestore", async () => {
    // n1 was never written to /users/alice-uid/notebooks — nothing to point at.
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(setDoc(doc(alice, "shares", "tok1"), shareRoot()));
  });

  it("rejects an individual share pointing at a person who isn't the owner's", async () => {
    await seed((db) => setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook()));
    // No person p1 written for Alice.
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(
      setDoc(doc(alice, "shares", "tok1"), shareRoot({ scope: "individual", personId: "p1" })),
    );
  });

  it("rejects creating a share for someone else's notebook", async () => {
    await seed((db) => setDoc(doc(db, "users", BOB, "notebooks", "n1"), notebook()));

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(setDoc(doc(alice, "shares", "tok1"), shareRoot({ ownerUid: ALICE })));
  });
});

describe("share activation and immutability", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook());
      await setDoc(doc(db, "shares", "tok1"), shareRoot());
    });
  });

  it("lets the owner flip active on and off", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertSucceeds(updateDoc(doc(alice, "shares", "tok1"), { active: true }));
    await assertSucceeds(updateDoc(doc(alice, "shares", "tok1"), { active: false }));
  });

  it("denies a non-owner activating someone else's share", async () => {
    const bob = modular(testEnv.authenticatedContext(BOB));
    await assertFails(updateDoc(doc(bob, "shares", "tok1"), { active: true }));
  });

  it("denies changing ownerUid, scope, notebookId, or schemaVersion on update", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(updateDoc(doc(alice, "shares", "tok1"), { ownerUid: BOB }));
    await assertFails(updateDoc(doc(alice, "shares", "tok1"), { scope: "individual" }));
    await assertFails(updateDoc(doc(alice, "shares", "tok1"), { notebookId: "n2" }));
    await assertFails(updateDoc(doc(alice, "shares", "tok1"), { schemaVersion: 2 }));
  });
});

describe("public read of share children", () => {
  async function seedActiveKhataShare(): Promise<void> {
    await seed(async (db) => {
      await setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook());
      await setDoc(doc(db, "shares", "tok1"), shareRoot({ active: true }));
      await setDoc(doc(db, "shares", "tok1", "notebooks", "n1"), notebook());
      await setDoc(doc(db, "shares", "tok1", "people", "p1"), person());
      await setDoc(doc(db, "shares", "tok1", "transactions", "t1"), transaction());
    });
  }

  it("lets an anonymous visitor read an active share's snapshot", async () => {
    await seedActiveKhataShare();
    const anon = modular(testEnv.unauthenticatedContext());
    await assertSucceeds(getDoc(doc(anon, "shares", "tok1", "notebooks", "n1")));
    await assertSucceeds(getDocs(collection(anon, "shares", "tok1", "people")));
    await assertSucceeds(getDocs(collection(anon, "shares", "tok1", "transactions")));
  });

  it("denies reading an expired share", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook());
      await setDoc(
        doc(db, "shares", "tok1"),
        shareRoot({ active: true, expiresAt: Date.now() - 1000 }),
      );
      await setDoc(doc(db, "shares", "tok1", "notebooks", "n1"), notebook());
    });

    const anon = modular(testEnv.unauthenticatedContext());
    await assertFails(getDoc(doc(anon, "shares", "tok1", "notebooks", "n1")));
  });

  it("denies reading a revoked (inactive) share", async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook());
      await setDoc(doc(db, "shares", "tok1"), shareRoot({ active: false }));
      await setDoc(doc(db, "shares", "tok1", "notebooks", "n1"), notebook());
    });

    const anon = modular(testEnv.unauthenticatedContext());
    await assertFails(getDoc(doc(anon, "shares", "tok1", "notebooks", "n1")));
  });

  it("denies reading an arbitrary undeclared share subcollection", async () => {
    await seedActiveKhataShare();
    const anon = modular(testEnv.unauthenticatedContext());
    await assertFails(getDocs(collection(anon, "shares", "tok1", "somethingElse")));
  });
});

describe("share child write scope", () => {
  beforeEach(async () => {
    await seed(async (db) => {
      await setDoc(doc(db, "users", ALICE, "notebooks", "n1"), notebook());
      await setDoc(doc(db, "shares", "tok1"), shareRoot());
    });
  });

  it("rejects a share child whose notebookId doesn't match the share's notebook", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(
      setDoc(doc(alice, "shares", "tok1", "transactions", "t1"), transaction({ notebookId: "n2" })),
    );
  });

  it("rejects an individual share exposing a different person's row", async () => {
    await seed(async (db) => {
      await setDoc(
        doc(db, "shares", "tok1"),
        shareRoot({ scope: "individual", personId: "p1" }),
        { merge: true },
      );
    });

    const alice = modular(testEnv.authenticatedContext(ALICE));
    // p2's own doc id must equal the share's declared personId to be writable at all.
    await assertFails(setDoc(doc(alice, "shares", "tok1", "people", "p2"), person({ id: "p2" })));
  });

  it("rejects an individual share exposing a transaction for a different person", async () => {
    await seed(async (db) => {
      await setDoc(
        doc(db, "shares", "tok1"),
        shareRoot({ scope: "individual", personId: "p1" }),
        { merge: true },
      );
    });

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(
      setDoc(doc(alice, "shares", "tok1", "transactions", "t2"), transaction({ id: "t2", personId: "p2" })),
    );
  });

  it("denies a non-owner writing share children even for an existing token", async () => {
    const bob = modular(testEnv.authenticatedContext(BOB));
    await assertFails(setDoc(doc(bob, "shares", "tok1", "transactions", "t1"), transaction()));
  });
});

const banner = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "b1",
  imageUrl: "https://example.com/banner.png",
  destinationUrl: "https://example.com",
  order: 0,
  active: true,
  ...overrides,
});

describe("banners", () => {
  it("lets anyone (including unauthenticated) read an active banner", async () => {
    await seed((db) => setDoc(doc(db, "banners", "b1"), banner()));

    const anon = modular(testEnv.unauthenticatedContext());
    await assertSucceeds(getDoc(doc(anon, "banners", "b1")));
    await assertSucceeds(getDocs(collection(anon, "banners")));
  });

  it("denies reading an inactive banner unless you're the admin", async () => {
    await seed((db) => setDoc(doc(db, "banners", "b1"), banner({ active: false })));

    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(getDoc(doc(alice, "banners", "b1")));

    const admin = modular(testEnv.authenticatedContext(ADMIN));
    await assertSucceeds(getDoc(doc(admin, "banners", "b1")));
  });

  it("lets the admin create, update, and delete banners", async () => {
    const admin = modular(testEnv.authenticatedContext(ADMIN));
    await assertSucceeds(setDoc(doc(admin, "banners", "b1"), banner()));
    await assertSucceeds(setDoc(doc(admin, "banners", "b1"), banner({ active: false })));

    const adminDeleteCheck = modular(testEnv.authenticatedContext(ADMIN));
    await assertSucceeds(deleteDoc(doc(adminDeleteCheck, "banners", "b1")));
  });

  it("denies a non-admin writing banners even while signed in", async () => {
    const alice = modular(testEnv.authenticatedContext(ALICE));
    await assertFails(setDoc(doc(alice, "banners", "b1"), banner()));
  });

  it("denies an unauthenticated write", async () => {
    const anon = modular(testEnv.unauthenticatedContext());
    await assertFails(setDoc(doc(anon, "banners", "b1"), banner()));
  });

  it("rejects a banner write with an id that doesn't match the document id", async () => {
    const admin = modular(testEnv.authenticatedContext(ADMIN));
    await assertFails(setDoc(doc(admin, "banners", "b1"), banner({ id: "different" })));
  });

  it("rejects a banner write with extra/undeclared fields", async () => {
    const admin = modular(testEnv.authenticatedContext(ADMIN));
    await assertFails(setDoc(doc(admin, "banners", "b1"), banner({ extraField: "nope" })));
  });
});
