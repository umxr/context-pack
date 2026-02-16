import { getDbClient } from "./client";
import type { User } from "../auth/types";

export async function findUserByUsername(
  username: string
): Promise<User | null> {
  const client = getDbClient();
  const results = await client.query(
    "SELECT * FROM users WHERE username = $1",
    [username]
  );
  return (results[0] as User) ?? null;
}

export async function findUserById(id: string): Promise<User | null> {
  const client = getDbClient();
  const results = await client.query("SELECT * FROM users WHERE id = $1", [id]);
  return (results[0] as User) ?? null;
}
