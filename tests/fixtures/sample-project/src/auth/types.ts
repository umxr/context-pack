export type User = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
};

export type Session = {
  id: string;
  userId: string;
  expiresAt: Date;
  createdAt: Date;
};

export type AuthResult =
  | { success: true; user: User }
  | { success: false; error: string };
