import { create } from 'zustand';
import { JSONContent } from 'novel';

interface NoteContentState {
  currentNoteContent: JSONContent;
  setCurrentNoteContent: (content: JSONContent) => void;
}

export const useNoteContentStore = create<NoteContentState>((set) => ({
  currentNoteContent: {
    type: 'doc',
    content: []
  },
  setCurrentNoteContent: (content) => set({ currentNoteContent: content }),
}));
