import { cookies } from "next/headers";
import { ObjectId } from "mongodb";
import { verifyToken, COOKIE_NAME } from "@/lib/jwt";
import { getDocumentsCollection, ensureDocumentsIndexes, getUserCollection } from "@/lib/mongodb";
import type {
  StoredDocumentPassport,
  StoredDocumentI20,
  StoredDocumentW2,
  StoredDocumentDuration,
  StoredDocumentVisa,
  StoredDocumentI94,
  StoredDocumentEAD,
} from "@/lib/types/document";
import type { FormDocuments } from "./types";
import { sanitizeW2 } from "@/extraction/prompts/forms/w2";

/**
 * Normalizes any SSN string to canonical XXX-XX-XXXX format.
 * Returns null if the input doesn't resolve to exactly 9 digits
 * (e.g. a redacted "XXX-XX-1234" from a W-2 scan).
 */
function normalizeSsn(raw: string | undefined | null): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.length !== 9) return null;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Authenticates the user and fetches all relevant documents from MongoDB.
 * Returns null (with status info) when auth fails.
 */
export async function fetchFormDocuments(): Promise<
  | { ok: true; docs: FormDocuments }
  | { ok: false; status: number; error: string }
> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { ok: false, status: 401, error: "Unauthorized" };

  const payload = await verifyToken(token);
  if (!payload) return { ok: false, status: 401, error: "Unauthorized" };

  await ensureDocumentsIndexes();
  const coll = await getDocumentsCollection();
  const userId = new ObjectId(payload.sub);

  const usersColl = await getUserCollection();
  const [passport, i20, w2, duration, visa, i94, ead, user] = await Promise.all([
    coll.findOne({ userId, documentType: "passport" }) as Promise<StoredDocumentPassport | null>,
    coll.findOne({ userId, documentType: "i20" }) as Promise<StoredDocumentI20 | null>,
    coll.findOne({ userId, documentType: "w2" }) as Promise<StoredDocumentW2 | null>,
    coll.findOne({ userId, documentType: "duration" }) as Promise<StoredDocumentDuration | null>,
    coll.findOne({ userId, documentType: "visa" }) as Promise<StoredDocumentVisa | null>,
    coll.findOne({ userId, documentType: "i94" }) as Promise<StoredDocumentI94 | null>,
    coll.findOne({ userId, documentType: "ead" }) as Promise<StoredDocumentEAD | null>,
    usersColl.findOne({ _id: userId }),
  ]);

  return {
    ok: true,
    docs: {
      passport: passport?.data ?? null,
      i20: i20?.data ?? null,
      w2: w2?.data ? sanitizeW2(w2.data) : null,
      duration: duration?.data.entries ?? null,
      visa: visa?.data ?? null,
      i94: i94?.data ?? null,
      ead: ead?.data ?? null,
      // Prefer the SSN the user explicitly entered in the SSN dialog (already in
      // XXX-XX-XXXX format). Fall back to the SSN extracted from their W-2 if
      // the dialog was skipped or cancelled — only accepted when it resolves to
      // a full 9 digits (rejects redacted values like "XXX-XX-1234").
      ssn: user?.ssn ?? normalizeSsn(w2?.data?.employee?.ssn) ?? null,
    },
  };
}
