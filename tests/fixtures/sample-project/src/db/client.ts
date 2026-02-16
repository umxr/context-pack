export type DbClient = {
  query: (sql: string, params?: unknown[]) => Promise<unknown[]>;
  close: () => Promise<void>;
};

let client: DbClient | null = null;

export function getDbClient(): DbClient {
  if (!client) {
    throw new Error("Database not initialized. Call initDb() first.");
  }
  return client;
}

export async function initDb(connectionString: string): Promise<DbClient> {
  // Simulated database client
  client = {
    query: async (sql: string, _params?: unknown[]) => {
      console.log(`Executing: ${sql}`);
      return [];
    },
    close: async () => {
      client = null;
    },
  };
  return client;
}

export { client as dbClient };
