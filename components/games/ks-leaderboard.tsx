"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Crown, Medal, RefreshCw, Trophy, WifiOff } from "lucide-react"
import { getGameLeaderboard } from "@/lib/database"
import type { GameScore } from "@/lib/supabase"
import { LocalDateTime } from "@/components/local-time"
import type { GameKind } from "@/lib/games/arcade-engine"

interface KsLeaderboardProps {
  initialGameType?: GameKind
  currentPlayerName?: string
  lastSubmittedScoreId?: number
}
export function KsLeaderboard({
  initialGameType = "dino",
  currentPlayerName = "",
  lastSubmittedScoreId,
}: KsLeaderboardProps) {
  const [game, setGame] = useState<GameKind>(initialGameType)
  const [scores, setScores] = useState<GameScore[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const request = useRef(0)
  const invalidate = useCallback(() => {
    request.current++
  }, [])
  const load = useCallback(async (kind: GameKind) => {
    const id = ++request.current
    setLoading(true)
    setError(false)
    try {
      const data = await getGameLeaderboard(kind, 10)
      if (id === request.current) setScores(data)
    } catch {
      if (id === request.current) setError(true)
    } finally {
      if (id === request.current) setLoading(false)
    }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => void load(game), 0)
    return () => {
      clearTimeout(timer)
      invalidate()
    }
  }, [game, lastSubmittedScoreId, load, invalidate])
  const choose = (next: GameKind) => {
    if (next !== game) {
      request.current++
      setScores([])
      setLoading(true)
      setGame(next)
    }
  }
  const top = scores.slice(0, 3)
  const podium = top.length === 3 ? [top[1], top[0], top[2]] : top

  return (
    <section className="arcade-leaderboard" aria-label="Зал слави">
      <span className="arcade-eyebrow">
        THE LEAGUE OF EXTRAORDINARY PLAYERS
      </span>
      <h3>Впиши своє ім’я.</h3>
      <p>Десять найкращих результатів спільноти. Наступний може бути твоїм.</p>
      <div className="arcade-ranking-toolbar">
        <div
          className="arcade-mode-switch"
          role="group"
          aria-label="Гра в рейтингу"
        >
          <button
            type="button"
            aria-pressed={game === "dino"}
            onClick={() => choose("dino")}
          >
            Neon Run
          </button>
          <button
            type="button"
            aria-pressed={game === "snake"}
            onClick={() => choose("snake")}
          >
            Snake Arena
          </button>
        </div>
        <button
          type="button"
          className="arcade-icon-button"
          disabled={loading}
          onClick={() => void load(game)}
          aria-label="Оновити рейтинг"
        >
          <RefreshCw className={loading ? "arcade-spin" : ""} />
        </button>
      </div>
      {loading ? (
        <div className="arcade-ranking-empty" role="status">
          <RefreshCw className="arcade-spin" />
          <p>Завантажуємо рекорди…</p>
        </div>
      ) : error ? (
        <div className="arcade-ranking-empty" role="alert">
          <WifiOff />
          <strong>Рейтинг тимчасово недоступний</strong>
          <p>Перевір підключення та спробуй ще раз.</p>
          <button
            type="button"
            className="arcade-secondary"
            onClick={() => void load(game)}
          >
            Повторити спробу
          </button>
        </div>
      ) : scores.length === 0 ? (
        <div className="arcade-ranking-empty">
          <Trophy />
          <strong>Арена чекає свого чемпіона</strong>
          <p>Заверши раунд в аркаді та збережи результат зі своїм ім’ям.</p>
        </div>
      ) : (
        <>
          <div className="arcade-podium">
            {podium.map((score) => {
              const rank = scores.indexOf(score) + 1
              return (
                <div
                  key={score.id}
                  className={`arcade-podium-card ${rank === 1 ? "is-first" : ""}`}
                >
                  {rank === 1 ? <Crown /> : <Medal />}
                  <small>МІСЦЕ {rank}</small>
                  <strong title={score.player_name}>{score.player_name}</strong>
                  <b>{score.score}</b>
                </div>
              )
            })}
          </div>
          <table className="arcade-ranking-table">
            <caption className="sr-only">
              Топ 10 — {game === "dino" ? "Neon Run" : "Snake Arena"}
            </caption>
            <thead>
              <tr>
                <th scope="col">МІСЦЕ</th>
                <th scope="col">ГРАВЕЦЬ</th>
                <th scope="col">ОЧКИ</th>
              </tr>
            </thead>
            <tbody>
              {scores.map((score, index) => {
                const isYou =
                  score.player_name.trim().toLowerCase() ===
                  currentPlayerName.trim().toLowerCase()
                return (
                  <tr
                    key={score.id}
                    className={
                      isYou || score.id === lastSubmittedScoreId ? "is-you" : ""
                    }
                  >
                    <td>{String(index + 1).padStart(2, "0")}</td>
                    <td className="arcade-ranking-name">
                      {score.player_name}
                      {isYou && <em>ТИ</em>}
                      <small>
                        <LocalDateTime
                          value={score.created_at}
                          dateStyle="medium"
                        />
                      </small>
                    </td>
                    <td>{score.score}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </>
      )}
      <div className="arcade-ranking-footnote">
        У таблиці — найкращий результат кожного імені, включно з попередніми
        версіями ігор. Ім’я — ігровий псевдонім. Рекорди виклику дня
        зберігаються окремо на твоєму пристрої.
      </div>
    </section>
  )
}
