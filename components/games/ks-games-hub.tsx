"use client"

import { useCallback, useEffect, useState } from "react"
import dynamic from "next/dynamic"
import {
  ArrowUpRight,
  Check,
  ChevronRight,
  Gamepad2,
  Pencil,
  Trophy,
  UserRound,
  Zap,
} from "lucide-react"
import { retroAudio } from "@/lib/retro-audio"
import { readArcadeValue, writeArcadeValue } from "@/lib/games/arcade-storage"
import type { Team } from "@/lib/supabase"
import type { GameKind } from "@/lib/games/arcade-engine"
import "./arcade.css"

function GameLoading() {
  return (
    <div className="arcade-loading" role="status">
      <Gamepad2 />
      <span>Готуємо поле…</span>
    </div>
  )
}
const KsDinoRunner = dynamic(
  () => import("./ks-dino-runner").then((m) => m.KsDinoRunner),
  { loading: GameLoading, ssr: false },
)
const KsSnakeGame = dynamic(
  () => import("./ks-snake-game").then((m) => m.KsSnakeGame),
  { loading: GameLoading, ssr: false },
)
const KsLeaderboard = dynamic(
  () => import("./ks-leaderboard").then((m) => m.KsLeaderboard),
  { loading: GameLoading, ssr: false },
)

export function KsGamesHub({ teams }: { teams: Team[] }) {
  const [active, setActive] = useState<GameKind | "leaderboard">("dino")
  const [rankingGame, setRankingGame] = useState<GameKind>("dino")
  const [playerName, setPlayerName] = useState("")
  const [draft, setDraft] = useState("")
  const [editing, setEditing] = useState(false)
  const [muted, setMuted] = useState(false)
  const [lastScoreId, setLastScoreId] = useState<number>()
  useEffect(() => {
    const timer = window.setTimeout(() => {
      const name = readArcadeValue("ks_player_name")
      setPlayerName(name)
      setDraft(name)
      setMuted(retroAudio.isMuted)
    }, 0)
    return () => clearTimeout(timer)
  }, [])
  const saveName = useCallback((name: string) => {
    const clean = name.trim().slice(0, 25)
    if (!clean) return
    setPlayerName(clean)
    setDraft(clean)
    setEditing(false)
    writeArcadeValue("ks_player_name", clean)
  }, [])
  const toggleMute = useCallback(() => setMuted(retroAudio.toggleMute()), [])
  const viewLeaderboard = () => {
    if (active !== "leaderboard") setRankingGame(active)
    setActive("leaderboard")
  }
  const props = {
    playerName,
    onPlayerNameChange: saveName,
    onScoreSubmitted: setLastScoreId,
    onViewLeaderboard: viewLeaderboard,
    muted,
    onToggleMute: toggleMute,
  }

  return (
    <div className="ks-games-scope arcade-hub">
      <header className="arcade-hero">
        <div className="arcade-hero-copy">
          <div className="arcade-brand-line">
            <span className="arcade-brand">
              <Gamepad2 /> KS GAMES
            </span>
            <span className="arcade-season">NIGHT LEAGUE / VOL. 02</span>
          </div>
          <h2>
            Після свистка.
            <br />
            <em>Гра триває.</em>
          </h2>
          <p>
            Твій клуб. Твій ритм. Твій рекорд.
            <br />
            Футбольні аркади з характером KS LIGA.
          </p>
          <div className="arcade-hero-tags">
            <span>
              <i /> Дві гри — одна арена
            </span>
            <span>
              ПК + смартфон <ArrowUpRight />
            </span>
          </div>
        </div>
        <div className="arcade-hero-art" aria-hidden="true">
          <svg viewBox="0 0 420 300" fill="none">
            <defs>
              <linearGradient id="ks-orbit" x1="70" y1="0" x2="330" y2="290">
                <stop stopColor="#c8ff5f" />
                <stop offset="1" stopColor="#558c88" />
              </linearGradient>
              <radialGradient id="ks-ball">
                <stop stopColor="#e7ffbb" />
                <stop offset="1" stopColor="#a7dd58" />
              </radialGradient>
            </defs>
            <ellipse cx="224" cy="227" rx="121" ry="38" fill="#070f1880" />
            <g transform="translate(30 36) rotate(-17 190 110)">
              <rect
                x="28"
                y="45"
                width="326"
                height="177"
                rx="35"
                stroke="url(#ks-orbit)"
                strokeWidth="1.2"
              />
              <rect
                x="45"
                y="60"
                width="292"
                height="145"
                rx="26"
                stroke="#b6e5b229"
              />
              <path
                d="M191 61v144M46 92h46v78H46m290-78h-46v78h46"
                stroke="#b6e5b241"
              />
              <ellipse cx="191" cy="132" rx="35" ry="32" stroke="#b6e5b241" />
            </g>
            <g transform="translate(135 61) rotate(16 75 75)">
              <circle cx="75" cy="75" r="72" fill="url(#ks-ball)" />
              <path d="m76 40 31 22-12 37H56L45 62Z" fill="#19382e" />
              <path
                d="m24 25 11 22L6 74M113 15l-6 30 37 16M128 124l-26-6-14 27M19 117l29-8 15 36M76 40 70 4M107 62l35-1M95 99l8 19M56 99l-9 11M45 62l-10-15"
                stroke="#335838"
                strokeWidth="2"
              />
              <path
                d="M37 18a63 63 0 0 1 59-7"
                stroke="#ffffff80"
                strokeWidth="5"
                strokeLinecap="round"
              />
            </g>
            <path
              d="m76 71 8-20 9 20-9-6Zm252 136 6-14 6 14-6-4Z"
              fill="#c8ff5f"
            />
            <circle cx="335" cy="62" r="5" fill="#6de6ff" />
            <circle cx="102" cy="231" r="3" fill="#c8ff5f" />
          </svg>
          <span className="arcade-art-caption">LESS SCROLL. MORE PLAY.</span>
        </div>
      </header>
      <div className="arcade-lobby-bar">
        <div className="arcade-profile">
          <span className="arcade-avatar">
            <UserRound />
          </span>
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                saveName(draft)
              }}
            >
              <input
                aria-label="Ім’я гравця"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={25}
                placeholder="Твій нікнейм"
                autoFocus
                required
              />
              <button
                type="submit"
                className="arcade-icon-button"
                aria-label="Зберегти ім’я"
              >
                <Check />
              </button>
              <button
                type="button"
                className="arcade-text-button"
                onClick={() => setEditing(false)}
              >
                Скасувати
              </button>
            </form>
          ) : (
            <>
              <div>
                <span>ТВІЙ ПРОФІЛЬ</span>
                <strong>{playerName || "Вільний гравець"}</strong>
              </div>
              <button
                type="button"
                className="arcade-icon-button"
                aria-label="Змінити ім’я"
                onClick={() => {
                  setDraft(playerName)
                  setEditing(true)
                }}
              >
                <Pencil />
              </button>
            </>
          )}
        </div>
        <span className="arcade-lobby-caption">
          {teams.length > 0 ? "Спільнота KS LIGA" : "Арена відкрита для всіх"}
          <i />
        </span>
      </div>
      <nav className="arcade-game-picker" aria-label="Обрати гру">
        <button
          type="button"
          className={`arcade-game-card ${active === "dino" ? "is-active" : ""}`}
          aria-pressed={active === "dino"}
          onClick={() => setActive("dino")}
        >
          <span className="arcade-card-icon arcade-icon-run">
            <Zap />
          </span>
          <span>
            <small>01 / ШВИДКІСТЬ</small>
            <strong>Neon Run</strong>
            <em>Подвійний стрибок · Turbo</em>
          </span>
          <ChevronRight />
        </button>
        <button
          type="button"
          className={`arcade-game-card ${active === "snake" ? "is-active" : ""}`}
          aria-pressed={active === "snake"}
          onClick={() => setActive("snake")}
        >
          <span className="arcade-card-icon arcade-icon-snake">
            <svg viewBox="0 0 32 32" fill="none" aria-hidden="true">
              <path
                d="M8 8h13a5 5 0 0 1 0 10H11a4 4 0 0 0 0 8h12"
                stroke="currentColor"
                strokeWidth="6"
                strokeLinecap="round"
              />
              <circle cx="7" cy="7" r="1" fill="#0c2224" />
            </svg>
          </span>
          <span>
            <small>02 / ТАКТИКА</small>
            <strong>Snake Arena</strong>
            <em>Портали · Золоті м’ячі</em>
          </span>
          <ChevronRight />
        </button>
        <button
          type="button"
          className={`arcade-game-card arcade-ranking-card ${active === "leaderboard" ? "is-active" : ""}`}
          aria-pressed={active === "leaderboard"}
          onClick={viewLeaderboard}
        >
          <span className="arcade-card-icon arcade-icon-trophy">
            <Trophy />
          </span>
          <span>
            <small>ЗМАГАННЯ</small>
            <strong>Зал слави</strong>
            <em>Найкращі на полі</em>
          </span>
          <ChevronRight />
        </button>
      </nav>
      <div className="arcade-active-game" key={active}>
        {active === "dino" && <KsDinoRunner {...props} />}
        {active === "snake" && <KsSnakeGame {...props} />}
        {active === "leaderboard" && (
          <KsLeaderboard
            initialGameType={rankingGame}
            currentPlayerName={playerName}
            lastSubmittedScoreId={lastScoreId}
          />
        )}
      </div>
      <div className="arcade-bottom-line">
        <span>KS GAMES © KS LIGA</span>
        <span>
          <Zap /> Ще один раунд?
        </span>
      </div>
    </div>
  )
}
