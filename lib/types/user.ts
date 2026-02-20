import type { ObjectId } from "mongodb";

export interface UserDocument {
  _id?: ObjectId;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber: string;
  address: string;
  hashedPassword: string;
  createdAt?: Date;
}

export interface RegisterInput {
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  contactNumber: string;
  address: string;
  password: string;
}

export interface ApiUser {
  id: string;
  email: string;
  firstName: string;
  middleName?: string;
  lastName: string;
}
