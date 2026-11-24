import * as crypto from "node:crypto";
import dotenv from "dotenv";

dotenv.config();

export const NODE_ENV = process.env.NODE_ENV || "development";
export const PUBLIC_URL = process.env.PUBLIC_URL || "http://localhost:3000";
export const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
export const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString("hex");
export const PRIVATE_KEY_JWK = process.env.PRIVATE_KEY_JWK;
export const DATABASE_URL = process.env.DATABASE_URL;
