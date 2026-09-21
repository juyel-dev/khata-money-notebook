import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  setDoc,
  where,
  type Firestore,
} from "firebase/firestore";
import { v4 as uuid } from "uuid";
import type { Banner } from "@/lib/banners";

const BANNERS_COLLECTION = "banners";

// Public — anyone, no auth required. Only ever reads active==true (the
// firestore.rules read rule only allows an anonymous caller to see docs
// matching that filter; an unfiltered query would be rejected).
export async function fetchActiveBanners(firestore: Firestore): Promise<Banner[]> {
  const snapshot = await getDocs(
    query(collection(firestore, BANNERS_COLLECTION), where("active", "==", true), orderBy("order")),
  );
  return snapshot.docs.map((d) => d.data() as Banner);
}

// Admin-only (enforced by firestore.rules, not by this function) — every
// banner regardless of active state, for the /admin management UI.
export async function listAllBanners(firestore: Firestore): Promise<Banner[]> {
  const snapshot = await getDocs(query(collection(firestore, BANNERS_COLLECTION), orderBy("order")));
  return snapshot.docs.map((d) => d.data() as Banner);
}

export async function saveBanner(firestore: Firestore, banner: Banner): Promise<void> {
  await setDoc(doc(firestore, BANNERS_COLLECTION, banner.id), banner);
}

export async function createBanner(
  firestore: Firestore,
  input: Omit<Banner, "id">,
): Promise<Banner> {
  const banner: Banner = { ...input, id: uuid() };
  await saveBanner(firestore, banner);
  return banner;
}

export async function deleteBanner(firestore: Firestore, id: string): Promise<void> {
  await deleteDoc(doc(firestore, BANNERS_COLLECTION, id));
}
