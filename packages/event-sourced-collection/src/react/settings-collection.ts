export type SettingsRow = {
  syncEnabled?: boolean;
};

export type SettingsCollectionLike = {
  get: (id: string) => SettingsRow | undefined;
  subscribeChanges: (listener: () => void) => { unsubscribe: () => void };
};

export type DbWithSettings = {
  collections: {
    settings: SettingsCollectionLike;
  };
};
