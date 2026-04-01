import { verifyMessageSignature, verifyMessageSignatureRsv } from "@stacks/encryption";
import { getAddressFromPublicKey } from "@stacks/transactions";
import { db } from "../db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import {
  generateUserToken,
  type UserTokenPayload,
} from "../middleware/auth";

function normalizeHexInput(value: string) {
  const trimmed = value.trim();
  return trimmed.startsWith("0x") || trimmed.startsWith("0X") ? trimmed.slice(2) : trimmed;
}

function inferStacksNetwork(address: string): "mainnet" | "testnet" {
  const normalizedAddress = address.trim().toUpperCase();

  if (normalizedAddress.startsWith("SP") || normalizedAddress.startsWith("SM")) {
    return "mainnet";
  }

  if (normalizedAddress.startsWith("ST") || normalizedAddress.startsWith("SN")) {
    return "testnet";
  }

  throw new Error("Invalid wallet address");
}

function isValidWalletSignature(message: string, publicKey: string, signature: string) {
  try {
    if (verifyMessageSignatureRsv({ message, publicKey, signature })) {
      return true;
    }
  } catch {}

  try {
    if (verifyMessageSignature({ message, publicKey, signature })) {
      return true;
    }
  } catch {}

  return false;
}

export const authService = {
  async verifyWalletAndLogin(data: {
    stxAddress: string;
    publicKey: string;
    signature: string;
    message: string;
    role: "client" | "freelancer";
  }) {
    const { stxAddress, publicKey, signature, message, role } = data;
    const normalizedStxAddress = stxAddress.trim().toUpperCase();
    const normalizedPublicKey = normalizeHexInput(publicKey);
    const normalizedSignature = normalizeHexInput(signature);

    // Verify the Stacks signed message
    const isValid = isValidWalletSignature(message, normalizedPublicKey, normalizedSignature);

    if (!isValid) {
      throw new Error("Invalid wallet signature");
    }

    const derivedAddress = getAddressFromPublicKey(normalizedPublicKey, inferStacksNetwork(normalizedStxAddress));
    if (derivedAddress.toUpperCase() !== normalizedStxAddress) {
      throw new Error("Wallet address does not match public key");
    }

    // Check if user exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.stxAddress, normalizedStxAddress));

    let user;

    if (existingUser) {
      // Existing user — role is permanent, always use stored role
      user = existingUser;
    } else {
      // New user — create with chosen role
      const result = await db
        .insert(users)
        .values({
          stxAddress: normalizedStxAddress,
          role,
        });
      const [newUser] = await db.select().from(users).where(eq(users.id, result[0].insertId));
      user = newUser;
    }

    // Generate JWT
    const tokenPayload: UserTokenPayload = {
      id: user.id,
      stxAddress: user.stxAddress,
      role: user.role,
    };

    const token = generateUserToken(tokenPayload);

    return { user, token };
  },

  async getUserById(id: number) {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || null;
  },

  async getUserByAddress(stxAddress: string) {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.stxAddress, stxAddress));
    return user || null;
  },
};
