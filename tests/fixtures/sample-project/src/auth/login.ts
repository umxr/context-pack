import { hashPassword } from "../utils/hash";
import { findUserByUsername } from "../db/queries";
import type { User, AuthResult } from "./types";

export async function login(
  username: string,
  password: string
): Promise<AuthResult> {
  const user = await findUserByUsername(username);
  if (!user) {
    return { success: false, error: "User not found" };
  }

  const hashedInput = hashPassword(password);
  if (hashedInput !== user.passwordHash) {
    return { success: false, error: "Invalid password" };
  }

  return { success: true, user };
}
