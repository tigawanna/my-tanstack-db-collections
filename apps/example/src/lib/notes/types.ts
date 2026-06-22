export type NoteStatus = "draft" | "active" | "archived";

export type Note = {
  id: string;
  title: string;
  description: string;
  pinned: boolean;
  starred: boolean;
  status: NoteStatus;
  updatedAt: number;
};

export const NOTE_STATUSES: NoteStatus[] = ["draft", "active", "archived"];

export function createEmptyNote(id: string): Note {
  return {
    id,
    title: "",
    description: "",
    pinned: false,
    starred: false,
    status: "draft",
    updatedAt: Date.now(),
  };
}
