import { PGlite } from "@electric-sql/pglite";

export async function initDb(db: PGlite) {
  await db.query(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT,
      content JSONB,
      preview TEXT,
      "timestamp" TIMESTAMP,
      "isGenerating" BOOLEAN DEFAULT FALSE
    );
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS generation_data (
      id TEXT PRIMARY KEY,
      note_id TEXT NOT NULL,
      generation_type TEXT NOT NULL,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);
} 