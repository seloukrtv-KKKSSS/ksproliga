# KS Games: Night League

The KS Games section (`/?section=games`) contains two Canvas arcade games. The football manager is a separate, currently unmounted feature and is not changed by this release.

## Gameplay

- **Neon Run**: two airborne jumps, timed slide/fast fall, barriers and drones, six-ball Turbo charge, six seconds of protection and double distance points. Ball chains within six seconds build a multiplier up to 3×.
- **Snake Arena**: two queued turns, paired side gates at row 9, gold spawned after every fourth regular ball, eight-second gold timer, pickup combos, progressively faster movement, and a full-board victory.
- **Daily challenge**: a seed derived from UTC date, game, and rules version. Arena and daily records have separate local storage keys; daily scores never enter the historical global leaderboard. All starts on the same day share an initial scenario; snake food positions subsequently depend on the occupied cells.
- Three cosmetic kit palettes, scoped keyboard controls, pointer/swipe controls, in-field pause, native fullscreen and a focus fallback, result copying, and local records.

## Architecture and performance

`lib/games/arcade-engine.ts` is a pure simulation driven by fixed 1/60-second steps. `arcade-renderer.ts` caches static stadium artwork, bounds particles to 64, interpolates snake motion, and respects reduced-motion preferences. The `use-arcade` hook owns one animation loop, pauses on hidden tabs, window blur, offscreen canvas, or a long frame stall, and publishes React HUD updates at most ten times a second. Canvas backing resolution is capped at 2× device pixel ratio and a 1.5× logical display scale. There are no new runtime dependencies, external art files, or audio downloads. Game components remain dynamically loaded.

`arcade-storage.ts` tolerates unavailable storage and malformed values. Audio is unlocked by a user gesture and tolerates denied storage or audio access.

## Records

The existing `submit_game_score` RPC and `game_scores` table remain unchanged. Online saves show success only after a response containing a score ID. Failed saves can be retried; old requests cannot overwrite a newer round's UI. The leaderboard differentiates errors from an empty table and ignores responses from previously selected games. It retains historical scores and identifies players by display name, not an authenticated identity. No new anti-cheat guarantee is introduced.

## Verification

Run `pnpm test:arcade` for deterministic seeds, jump limits, hazards, timed Turbo, different rendering rates, queued turns, portal exits, tail vacancy, gold expiry, full-board completion, and combo expiry. `pnpm check` includes these tests plus the existing regression tests, lint, TypeScript, and a production build.

Browser checks: desktop and mobile widths 320/390, start and restart, keyboard jump and turning, manual pause/resume, fullscreen enter/exit, daily mode, palette selection, local records, leaderboard switching and requests. The touch controls use pointer events with touch scrolling disabled only on gameplay surfaces; the surrounding page remains scrollable. Verify actual touch devices for device-specific fullscreen and gesture behavior.
