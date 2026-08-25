import assert from "node:assert/strict"
import {
  getAnalyticsCutoff,
  normalizeAnalyticsRpcRow,
  summarizeAnalyticsRows,
} from "../lib/analytics.ts"

const rows = Array.from({ length: 1_505 }, (_, index) => ({
  id: index + 1,
  session_id: `session-${index % 301}`,
  active_tab: index % 3 === 0 ? "overview" : "calendar",
  duration_seconds: index % 3 === 0 ? 30 : 60,
}))
rows.push({
  id: 1_506,
  session_id: "admin-session",
  active_tab: "admin",
  duration_seconds: 3_600,
})

const summary = summarizeAnalyticsRows(rows)
assert.equal(summary.totalPageViews, 1_505)
assert.equal(summary.uniqueSessions, 301)
assert.equal(summary.tabBreakdown.reduce((sum, tab) => sum + tab.views, 0), 1_505)
assert.equal(summary.tabBreakdown.some((tab) => tab.tab === "admin"), false)
assert.equal(summary.totalActiveSeconds, 75_240)
assert.equal(summary.viewsPerSession, 5)

const rpcSummary = normalizeAnalyticsRpcRow({
  total_page_views: "1505",
  unique_sessions: "301",
  avg_duration_seconds: 50,
  total_active_seconds: "75240",
  tab_breakdown: [
    { tab: "calendar", views: 1_003, uniqueSessions: 301, totalTime: 60_180, avgDurationSeconds: 60 },
    { tab: "overview", views: 502, uniqueSessions: 301, totalTime: 15_060, avgDurationSeconds: 30 },
  ],
})
assert.equal(rpcSummary.totalPageViews, 1_505)
assert.equal(rpcSummary.tabBreakdown[0].tab, "calendar")

const fixedNow = new Date("2026-08-25T12:00:00.000Z")
assert.equal(getAnalyticsCutoff("24h", fixedNow).toISOString(), "2026-08-24T12:00:00.000Z")
assert.equal(getAnalyticsCutoff("7d", fixedNow).toISOString(), "2026-08-18T12:00:00.000Z")
assert.equal(getAnalyticsCutoff("30d", fixedNow).toISOString(), "2026-07-26T12:00:00.000Z")

console.log("Analytics aggregation tests passed")
