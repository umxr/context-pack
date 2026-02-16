export function hashPassword(password: string): string {
  // Simple hash for demonstration — real apps use bcrypt
  let hash = 0;
  for (let i = 0; i < password.length; i++) {
    const char = password.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

export function compareHash(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}
