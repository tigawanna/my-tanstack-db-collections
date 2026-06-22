import { createClient } from "@libsql/client";
import type { InValue } from "@libsql/client";
import type { SQLiteDriver } from "@tanstack-db-collections/event-sourced";

function toArgs(params: ReadonlyArray<unknown> | undefined): InValue[] {
  return params ? ([...params] as InValue[]) : [];
}

function wrapClient(client: ReturnType<typeof createClient>): SQLiteDriver {
  return {
    async exec(sql: string) {
      await client.executeMultiple(sql);
    },
    async query<T>(sql: string, params?: ReadonlyArray<unknown>) {
      const result = await client.execute({ sql, args: toArgs(params) });
      return result.rows as T[];
    },
    async run(sql: string, params?: ReadonlyArray<unknown>) {
      await client.execute({ sql, args: toArgs(params) });
    },
    async transaction(fn) {
      const tx = await client.transaction("write");
      const txDriver: SQLiteDriver = {
        exec: async (sql: string) => {
          await tx.executeMultiple(sql);
        },
        query: async <T>(sql: string, params?: ReadonlyArray<unknown>) => {
          const result = await tx.execute({ sql, args: toArgs(params) });
          return result.rows as T[];
        },
        run: async (sql: string, params?: ReadonlyArray<unknown>) => {
          await tx.execute({ sql, args: toArgs(params) });
        },
        transaction: async (innerFn) => innerFn(txDriver),
      };
      try {
        const result = await fn(txDriver);
        await tx.commit();
        return result;
      } catch (error) {
        await tx.rollback();
        throw error;
      }
    },
  };
}

export function createLibsqlDriver(url: string, authToken?: string): SQLiteDriver {
  return wrapClient(
    createClient({
      url,
      authToken,
    }),
  );
}
