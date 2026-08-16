import type { PersistedCollectionPersistence } from "../core/types";

export type NodePlatformDeps = {
  createNodeSQLitePersistence: (options: { database: never }) => PersistedCollectionPersistence;
};

export type NodePlatformConfig = {
  database: unknown;
};

export type NodePlatformResult = {
  persistence: PersistedCollectionPersistence;
};

export function createNodePlatform(
  deps: NodePlatformDeps,
  config: NodePlatformConfig,
): NodePlatformResult {
  return {
    persistence: deps.createNodeSQLitePersistence({
      database: config.database as never,
    }),
  };
}
