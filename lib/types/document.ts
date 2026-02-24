import type { ObjectId } from "mongodb";
import type { PassportExtraction, I20Extraction, W2Extraction } from "@/extraction/prompts";

export type StoredDocumentPassport = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "passport";
  data: PassportExtraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocumentI20 = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "i20";
  data: I20Extraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocumentW2 = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "w2";
  data: W2Extraction;
  originalFilename?: string;
  createdAt: Date;
};

export type DurationEntry = {
  year: number;
  arrival: string;
  departure: string;
};

export type StoredDocumentDuration = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "duration";
  data: { entries: DurationEntry[] };
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocument =
  | StoredDocumentPassport
  | StoredDocumentI20
  | StoredDocumentW2
  | StoredDocumentDuration;
