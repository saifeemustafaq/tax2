import { MongoClient, ServerApiVersion } from "mongodb";
import type { UserDocument } from "@/lib/types/user";
import type { StoredDocument } from "@/lib/types/document";

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
  var _mongoClient: MongoClient | undefined;
}

function getClient(): MongoClient {
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }
  if (global._mongoClient) {
    return global._mongoClient;
  }
  const client = new MongoClient(uri, options);
  global._mongoClient = client;
  return client;
}

export function getDb() {
  return getClient().db("tax");
}

export function getUserCollection() {
  return getDb().collection<UserDocument>("users");
}

export function getDocumentsCollection() {
  return getDb().collection<StoredDocument>("documents");
}

let indexCreated = false;
let documentsIndexCreated = false;

export async function ensureDocumentsIndexes(): Promise<void> {
  if (documentsIndexCreated) return;
  const coll = getDocumentsCollection();
  try {
    await coll.createIndex({ userId: 1 });
    await coll.createIndex({ userId: 1, documentType: 1 });
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
  const coll = getUserCollection();
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
