import pg from "pg"

const { Client } = pg

export function createDatabaseClient() {
  const connectionString = process.env.DATABASE_URL?.trim()

  if (!connectionString) {
    throw new Error("DATABASE_URL is required. Copy .env.example and provide a rotated database connection string.")
  }

  return new Client({
    connectionString,
    ssl:
      process.env.DATABASE_SSL === "disable"
        ? false
        : { rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false" },
    connectionTimeoutMillis: 10_000,
    query_timeout: 30_000,
    statement_timeout: 30_000,
    application_name: "ksliga-maintenance-script",
  })
}
