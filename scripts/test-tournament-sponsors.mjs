import assert from "node:assert/strict"
import { readFile } from "node:fs/promises"
import { registerHooks } from "node:module"
import { PGlite } from "@electric-sql/pglite"

// Exercise the real save function and Supabase HTTP serialization against an
// isolated PostgreSQL instance with the production GENERATED ALWAYS identity.
const db = new PGlite()
const previousFetch = globalThis.fetch
const previousUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const previousKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const moduleUrl = new URL("../lib/tournaments.ts", import.meta.url).href
const hooks = registerHooks({ resolve(specifier, context, nextResolve) {
  return nextResolve(context.parentURL === moduleUrl && specifier === "./supabase" ? "./supabase.ts" : specifier, context)
} })
const requests = []
const columns = new Set(["id", "championship_id", "name", "logo_url", "website_url", "placements", "sort_order", "is_active"])
try {
  await db.exec("create table public.championships(id integer primary key); insert into public.championships values(7),(8)")
  const migration = await readFile(new URL("../supabase/migrations/20261117180900_tournament_sponsors_and_cup.sql", import.meta.url), "utf8")
  await db.exec(migration.slice(migration.indexOf("create table public.tournament_sponsors"), migration.indexOf("create index tournament_sponsors_championship_idx")))
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://sponsor-regression.supabase.co"
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-only-public-key-for-isolated-regression"
  globalThis.fetch = async (input, init) => {
    const url = new URL(String(input))
    assert.equal(url.origin, "https://sponsor-regression.supabase.co", "No live service may be contacted")
    assert.equal(url.pathname, "/rest/v1/tournament_sponsors")
    const values = JSON.parse(init.body)
    const entries = Object.entries(values)
    for (const [key] of entries) assert.ok(columns.has(key), `Unexpected column: ${key}`)
    requests.push({ method: init.method, values, filters: url.searchParams })
    const params = entries.map(([, value]) => value)
    try {
      let sql
      if (init.method === "POST") {
        sql = `insert into public.tournament_sponsors(${entries.map(([key]) => `"${key}"`).join(",")}) values(${entries.map((_, index) => `$${index + 1}`).join(",")}) returning id`
      } else {
        assert.equal(init.method, "PATCH")
        assert.match(url.searchParams.get("id"), /^eq\.\d+$/)
        assert.match(url.searchParams.get("championship_id"), /^eq\.\d+$/)
        params.push(Number(url.searchParams.get("id").slice(3)), Number(url.searchParams.get("championship_id").slice(3)))
        sql = `update public.tournament_sponsors set ${entries.map(([key], index) => `"${key}"=$${index + 1}`).join(",")} where id=$${params.length - 1} and championship_id=$${params.length} returning id`
      }
      const { rows } = await db.query(sql, params)
      return new Response(JSON.stringify(rows[0] || null), { status: 200, headers: { "content-type": "application/json" } })
    } catch (error) {
      return new Response(JSON.stringify({ message: error.message, code: error.code }), { status: 400, headers: { "content-type": "application/json" } })
    }
  }
  const { saveTournamentSponsor } = await import(moduleUrl)
  const initial = { championship_id: 7, name: "Partner", logo_url: "https://example.com/logo.png", website_url: null, placements: ["cup", "posters"], sort_order: 1, is_active: true }
  await saveTournamentSponsor(initial)
  await saveTournamentSponsor({ ...initial, championship_id: 8, name: "Other tournament" })
  const original = (await db.query("select * from public.tournament_sponsors where championship_id=7")).rows[0]
  await saveTournamentSponsor({ ...original, name: "Edited partner", logo_url: "https://example.com/new-logo.png", website_url: "https://example.com", placements: [], is_active: false, sort_order: 4 })
  const edited = (await db.query("select * from public.tournament_sponsors where id=$1", [original.id])).rows[0]
  assert.equal(edited.id, original.id)
  assert.equal(edited.championship_id, 7)
  assert.equal(edited.name, "Edited partner")
  assert.equal(edited.logo_url, "https://example.com/new-logo.png")
  assert.equal(edited.website_url, "https://example.com")
  assert.deepEqual(edited.placements, [])
  assert.equal(edited.is_active, false)
  assert.equal(edited.sort_order, 4)
  assert.equal((await db.query("select name from public.tournament_sponsors where championship_id=8")).rows[0].name, "Other tournament")
  assert.equal(Object.hasOwn(requests[2].values, "id"), false)
  assert.equal(Object.hasOwn(requests[2].values, "championship_id"), false)
  assert.equal(requests[2].filters.get("championship_id"), "eq.7")
  await saveTournamentSponsor({ ...edited, placements: ["overview", "table", "posters"], is_active: true })
  assert.deepEqual((await db.query("select placements from public.tournament_sponsors where id=$1", [original.id])).rows[0].placements, ["overview", "table", "posters"])
  console.log("Sponsor create/edit regression passed: real identity column, immutable IDs, tournament filters, logo and page updates")
} catch (error) { console.error(error.message); process.exitCode = 1 }
finally {
  hooks.deregister()
  globalThis.fetch = previousFetch
  if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_URL; else process.env.NEXT_PUBLIC_SUPABASE_URL = previousUrl
  if (previousKey === undefined) delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = previousKey
  await db.close()
}
