import type { ObjectId } from "mongodb";
import type { PassportExtraction, I20Extraction, W2Extraction, TravelHistoryExtraction } from "@/extraction/prompts";

/** Placeholder until visa extraction exists. */
export type VisaExtraction = {
  visa_type?: string;
  visa_number?: string;
  issue_date?: string;
  expiration_date?: string;
  [key: string]: unknown;
};

/** Placeholder until I-94 extraction exists. */
export type I94Extraction = {
  admission_number?: string;
  arrival_departure_record?: string;
  [key: string]: unknown;
};

/** Placeholder until EAD extraction exists. */
export type EadExtraction = {
  card_number?: string;
  category?: string;
  expiration_date?: string;
  [key: string]: unknown;
};

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

export type StoredDocumentVisa = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "visa";
  data: VisaExtraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocumentI94 = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "i94";
  data: I94Extraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocumentEAD = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "ead";
  data: EadExtraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocumentTravelHistory = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "travel-history";
  data: TravelHistoryExtraction;
  originalFilename?: string;
  createdAt: Date;
};

export type StoredDocument =
  | StoredDocumentPassport
  | StoredDocumentI20
  | StoredDocumentW2
  | StoredDocumentDuration
  | StoredDocumentVisa
  | StoredDocumentI94
  | StoredDocumentEAD
  | StoredDocumentTravelHistory;
