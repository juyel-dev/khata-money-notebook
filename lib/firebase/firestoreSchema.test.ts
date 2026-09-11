import { describe, expect, it } from "vitest";

import {
  groupDocPath,
  notebookDocPath,
  personDocPath,
  transactionDocPath,
  userCollectionPath,
  userDocPath,
} from "./firestoreSchema";

describe("Firestore document paths", () => {
  const uid = "user-123";

  it("keeps every cloud collection under the owning user", () => {
    expect(userDocPath(uid)).toBe("users/user-123");
    expect(userCollectionPath(uid, "notebooks")).toBe("users/user-123/notebooks");
    expect(userCollectionPath(uid, "groups")).toBe("users/user-123/groups");
    expect(userCollectionPath(uid, "people")).toBe("users/user-123/people");
    expect(userCollectionPath(uid, "transactions")).toBe("users/user-123/transactions");
  });

  it("preserves stable local entity IDs in cloud paths", () => {
    expect(notebookDocPath(uid, "notebook-1")).toBe("users/user-123/notebooks/notebook-1");
    expect(groupDocPath(uid, "group-1")).toBe("users/user-123/groups/group-1");
    expect(personDocPath(uid, "person-1")).toBe("users/user-123/people/person-1");
    expect(transactionDocPath(uid, "transaction-1")).toBe(
      "users/user-123/transactions/transaction-1",
    );
  });
});
