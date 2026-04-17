import { MongoClient, ServerApiVersion } from "mongodb";
import type { UserDocument } from "@/lib/types/user";
import type { StoredDocument } from "@/lib/types/document";
import type { BankDetail } from "@/lib/types/bank-detail";

const uri = process.env.MONGODB_URI;

const options = {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
};

declare global {
  // eslint-disable-next-line no-var -- required for Next.js dev singleton
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

async function getClientPromise(): Promise<MongoClient> {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  if (global._mongoClientPromise) {
    try {
      return await global._mongoClientPromise;
    } catch {
      // Previous connection failed; discard and retry below
      global._mongoClientPromise = undefined;
    }
  }
  const client = new MongoClient(uri, options);
  global._mongoClientPromise = client.connect();
  return global._mongoClientPromise;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db("tax");
}

export async function getUserCollection() {
  const db = await getDb();
  return db.collection<UserDocument>("users");
}

export async function getDocumentsCollection() {
  const db = await getDb();
  return db.collection<StoredDocument>("documents");
}

export async function getBankDetailsCollection() {
  const db = await getDb();
  return db.collection<BankDetail>("bankDetails");
}

let indexCreated = false;
let documentsIndexCreated = false;
let bankDetailsIndexCreated = false;

export async function ensureDocumentsIndexes(): Promise<void> {
  if (documentsIndexCreated) return;
  const coll = await getDocumentsCollection();
  try {
    await coll.createIndex({ userId: 1 });
    await coll.createIndex({ userId: 1, documentType: 1 });
    await coll.createIndex({ userId: 1, documentType: 1, w2Index: 1 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("already exists") && !msg.includes("IndexOptionsConflict")) {
      throw err;
    }
  }
  documentsIndexCreated = true;
}

export async function ensureUserIndexes(): Promise<void> {
  if (indexCreated) return;
  const coll = await getUserCollection();
  try {
    await coll.createIndex({ email: 1 }, { unique: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("already exists") && !msg.includes("IndexOptionsConflict")) {
      throw err;
    }
  }
  indexCreated = true;
}

export async function ensureBankDetailsIndexes(): Promise<void> {
  if (bankDetailsIndexCreated) return;
  const coll = await getBankDetailsCollection();
  try {
    await coll.createIndex({ userId: 1 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes("already exists") && !msg.includes("IndexOptionsConflict")) {
      throw err;
    }
  }
  bankDetailsIndexCreated = true;
}
