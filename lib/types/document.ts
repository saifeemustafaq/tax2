import type { ObjectId } from "mongodb";
import type { PassportExtraction, W2Extraction } from "@/extraction/prompts";

export type StoredDocumentPassport = {
  _id?: ObjectId;
  userId: ObjectId;
  documentType: "passport";
  data: PassportExtraction;
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

export type StoredDocument = StoredDocumentPassport | StoredDocumentW2;
