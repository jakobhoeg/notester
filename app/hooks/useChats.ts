import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { useDbLoading } from "@/app/pglite-wrapper";
import { UIMessage } from "ai";
import { BuiltInAIUIMessage } from "@built-in-ai/core";

export interface Chat {
  id: string;
  note_id: string;
  messages: BuiltInAIUIMessage[];
  created_at: string;
  updated_at: string;
}

export const useChats = () => {
  const { db, isDbReady } = useDbLoading();
  const queryClient = useQueryClient();

  const useChatQuery = (noteId: string) => {
    return useQuery<Chat | null>({
      queryKey: ["chat", noteId],
      queryFn: async () => {
        if (!db || !isDbReady || !noteId) return null;

        const result = await db.query<{
          id: string;
          note_id: string;
          messages: BuiltInAIUIMessage[];
          created_at: string;
          updated_at: string;
        }>(
          `SELECT id, note_id, messages, created_at, updated_at 
           FROM chats 
           WHERE note_id = $1 
           LIMIT 1`,
          [noteId]
        );

        const chat = result.rows[0];
        if (!chat) return null;

        return {
          ...chat,
          messages: typeof chat.messages === 'string'
            ? JSON.parse(chat.messages)
            : chat.messages
        };
      },
      enabled: !!db && !!noteId && isDbReady,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
      staleTime: 0,
    });
  };

  // Get chat synchronously (for use in callbacks)
  const getChat = useCallback(
    async (noteId: string): Promise<Chat | null> => {
      if (!db || !isDbReady || !noteId) return null;

      const result = await db.query<{
        id: string;
        note_id: string;
        messages: BuiltInAIUIMessage[];
        created_at: string;
        updated_at: string;
      }>(
        `SELECT id, note_id, messages, created_at, updated_at 
         FROM chats 
         WHERE note_id = $1 
         LIMIT 1`,
        [noteId]
      );

      const chat = result.rows[0];
      if (!chat) return null;

      return {
        ...chat,
        messages: typeof chat.messages === 'string'
          ? JSON.parse(chat.messages)
          : chat.messages
      };
    },
    [db, isDbReady]
  );

  const saveChatMutation = useMutation<void, Error, { noteId: string; messages: BuiltInAIUIMessage[] }>({
    mutationFn: async ({ noteId, messages }) => {
      if (!db || !isDbReady) throw new Error("Database not initialized");

      const existingChat = await getChat(noteId);

      if (existingChat) {
        await db.query(
          `UPDATE chats 
           SET messages = $1, updated_at = $2 
           WHERE note_id = $3`,
          [messages, new Date().toISOString(), noteId]
        );
      } else {
        const chatId = uuidv4();
        await db.query(
          `INSERT INTO chats (id, note_id, messages, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5)`,
          [
            chatId,
            noteId,
            messages,
            new Date().toISOString(),
            new Date().toISOString()
          ]
        );
      }
    },
    onSuccess: (_, { noteId }) => {
      queryClient.invalidateQueries({ queryKey: ["chat", noteId] });
    },
  });

  const clearChatMutation = useMutation<void, Error, string>({
    mutationFn: async (noteId: string) => {
      if (!db || !isDbReady) throw new Error("Database not initialized");

      await db.query(
        `UPDATE chats 
         SET messages = $1, updated_at = $2 
         WHERE note_id = $3`,
        ['[]', new Date().toISOString(), noteId]
      );
    },
    onSuccess: (_, noteId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", noteId] });
    },
  });

  const deleteChatMutation = useMutation<void, Error, string>({
    mutationFn: async (noteId: string) => {
      if (!db || !isDbReady) throw new Error("Database not initialized");
      await db.query(`DELETE FROM chats WHERE note_id = $1`, [noteId]);
    },
    onSuccess: (_, noteId) => {
      queryClient.invalidateQueries({ queryKey: ["chat", noteId] });
    },
  });

  return {
    useChatQuery,
    getChat,
    saveChat: saveChatMutation.mutateAsync,
    clearChat: clearChatMutation.mutateAsync,
    deleteChat: deleteChatMutation.mutateAsync,
    isSaving: saveChatMutation.isPending,
  };
};

