import { neon } from "@neondatabase/serverless";

let schemaReady: Promise<void> | undefined;

export async function getSql() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured");
  }

  const sql = neon(connectionString);
  schemaReady ??= (async () => {
    await sql`
      CREATE TABLE IF NOT EXISTS item_reports (
        id BIGSERIAL PRIMARY KEY,
        reference TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        report_type TEXT NOT NULL CHECK (report_type IN ('lost', 'found')),
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        location TEXT NOT NULL,
        incident_date DATE NOT NULL,
        image_data TEXT,
        image_alt_text TEXT,
        private_verification_detail TEXT,
        reporter_contact TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`
      CREATE TABLE IF NOT EXISTS item_claims (
        id BIGSERIAL PRIMARY KEY,
        item_id BIGINT NOT NULL REFERENCES item_reports(id) ON DELETE CASCADE,
        claimant_name TEXT NOT NULL,
        claimant_contact TEXT NOT NULL,
        ownership_details TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`CREATE INDEX IF NOT EXISTS item_reports_search_idx ON item_reports (report_type, category, incident_date DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS item_reports_created_idx ON item_reports (created_at DESC)`;
  })();

  await schemaReady;
  return sql;
}
