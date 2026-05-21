import type { ObjectId } from "mongodb";

export interface BankDetail {
  _id?: ObjectId;
  userId: ObjectId;
  bankName: string;
  accountHolderName: string;
  routingNumber: string;
  accountNumber: string;
  accountType: "checking" | "savings";
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}
