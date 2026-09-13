"use client"

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react"
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  Copy,
  Expand,
  Flag,
  Flame,
  Gamepad2,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
  Shrink,
  Trophy,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react"
import { saveGameScore } from "@/lib/database"
import { KITS } from "@/lib/games/arcade-renderer"
import {
  readArcadeBest,
  readArcadeValue,
  writeArcadeValue,
} from "@/lib/games/arcade-storage"
import type { GameAction, GameKind, GameMode } from "@/lib/games/arcade-engine"
import { useArcade, type RunResult } from "./use-arcade"

export type ArcadeGameProps = {
  playerName: string
  onPlayerNameChange: (name: string) => void
  onScoreSubmitted: (id: number) => void
  onViewLeaderboard: () => void
  muted: boolean
  onToggleMute: () => void
}
const bestKey = (kind: GameKind, mode: GameMode, day: string) =>
  `ks_arcade_v2_${kind}_${mode}${mode === "daily" ? `_${day}` : ""}`
const keyActions: Record<string, GameAction> = {
  ArrowUp: "up",
  KeyW: "up",
  ArrowDown: "down",
  KeyS: "down",
  ArrowLeft: "left",
  KeyA: "left",
  ArrowRight: "right",
  KeyD: "right",
  Space: "jump",
}
const dailyDay = () => new Date().toISOString().slice(0, 10)

export function ArcadeGame({
  kind,
  playerName,
  onPlayerNameChange,
  onScoreSubmitted,
  onViewLeaderboard,
  muted,
  onToggleMute,
}: ArcadeGameProps & { kind: GameKind }) {
  const runner = kind === "dino"
  const title = runner ? "Neon Run" : "Snake Arena"
  const root = useRef<HTMLDivElement>(null)
  const session = useRef(0)
  const invalidateSession = useCallback(() => {
    session.current++
  }, [])
  const resultRef = useRef<HTMLElement>(null)
  const pointer = useRef<{ x: number; y: number; id: number } | null>(null)
  const [mode, setMode] = useState<GameMode>("arena")
  const [day, setDay] = useState(dailyDay)
  const [kit, setKit] = useState(() =>
    Math.max(
      0,
      Math.min(
        2,
        Math.floor(Number(readArcadeValue("ks_arcade_kit", "0")) || 0),
      ),
    ),
  )
  const [best, setBest] = useState(() =>
    readArcadeBest(bestKey(kind, "arena", day)),
  )
  const [result, setResult] = useState<RunResult | null>(null)
  const [record, setRecord] = useState(false)
  const [localSaved, setLocalSaved] = useState(true)
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle")
  const [draftName, setDraftName] = useState(playerName)
  const [fullscreen, setFullscreen] = useState(false)
  const [focusMode, setFocusMode] = useState(false)
  const [shareStatus, setShareStatus] = useState("")
  const config = useMemo(() => ({ mode, kit, day }), [mode, kit, day])

  useEffect(() => {
    const timer = window.setInterval(() => setDay(dailyDay()), 60_000)
    const fs = () => setFullscreen(document.fullscreenElement === root.current)
    document.addEventListener("fullscreenchange", fs)
    return () => {
      clearInterval(timer)
      document.removeEventListener("fullscreenchange", fs)
      invalidateSession()
    }
  }, [invalidateSession])

  const submit = useCallback(
    async (score: number, name: string, generation: number) => {
      if (!name.trim() || score <= 0) return
      setSaveStatus("saving")
      let timeout: ReturnType<typeof setTimeout> | undefined
      try {
        const saved = await Promise.race([
          saveGameScore(name, kind, score),
          new Promise<null>((resolve) => {
            timeout = setTimeout(() => resolve(null), 12_000)
          }),
        ])
        if (session.current !== generation) return
        if (saved && typeof saved.id === "number") {
          setSaveStatus("saved")
          onScoreSubmitted(saved.id)
        } else setSaveStatus("error")
      } catch {
        if (session.current === generation) setSaveStatus("error")
      } finally {
        clearTimeout(timeout)
      }
    },
    [kind, onScoreSubmitted],
  )

  const finished = useCallback(
    (run: RunResult) => {
      setResult(run)
      const key = bestKey(kind, run.config.mode, run.config.day)
      const previous = readArcadeBest(key)
      setRecord(run.score > previous)
      setBest(Math.max(previous, run.score))
      setLocalSaved(
        run.score <= previous || writeArcadeValue(key, String(run.score)),
      )
      if (run.config.mode === "arena" && playerName)
        void submit(run.score, playerName, session.current)
    },
    [kind, playerName, submit],
  )

  const { canvasRef, snapshot, start, pause, action } = useArcade(
    kind,
    config,
    finished,
  )
  const playing = snapshot.phase === "playing"
  const inRun = playing || snapshot.phase === "paused"
  const startRun = () => {
    session.current++
    setResult(null)
    setSaveStatus("idle")
    setShareStatus("")
    setRecord(false)
    setBest(readArcadeBest(bestKey(kind, mode, day)))
    canvasRef.current?.scrollIntoView({ block: "center", behavior: "instant" })
    start()
    root.current?.focus({ preventScroll: true })
  }
  const changeMode = (next: GameMode) => {
    setMode(next)
    setBest(readArcadeBest(bestKey(kind, next, day)))
  }
  const toggleScreen = async () => {
    if (playing) pause()
    if (focusMode) {
      setFocusMode(false)
      return
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen()
      else if (root.current?.requestFullscreen && document.fullscreenEnabled)
        await root.current.requestFullscreen()
      else setFocusMode(true)
    } catch {
      setFocusMode(true)
    }
  }
  useEffect(() => {
    if (!focusMode) return
    const oldOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = oldOverflow
    }
  }, [focusMode])

  const handleKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (
      e.target instanceof HTMLInputElement ||
      e.target instanceof HTMLSelectElement ||
      e.target instanceof HTMLTextAreaElement
    )
      return
    if (e.code === "Escape") {
      if (playing) pause()
      if (focusMode) setFocusMode(false)
      return
    }
    if (e.code === "KeyP") {
      e.preventDefault()
      if (!e.repeat) pause()
      return
    }
    if (
      e.target instanceof HTMLButtonElement &&
      (e.code === "Space" || e.code === "Enter")
    )
      return
    const next = keyActions[e.code]
    if (!next || (!runner && next === "jump")) return
    e.preventDefault()
    if (!e.repeat && playing) action(next)
  }
  const share = async () => {
    if (!result) return
    const text = `Мій результат у KS ${title}: ${result.score} очок${result.config.mode === "daily" ? ` · виклик ${result.config.day}` : ""}. Твій хід! https://ksliga.com/?section=games`
    try {
      await navigator.clipboard.writeText(text)
      setShareStatus("Результат скопійовано")
    } catch {
      setShareStatus("Не вдалося скопіювати. Ваш результат: " + result.score)
    }
  }

  return (
    <div
      ref={root}
      className={`arcade-machine ${runner ? "is-runner" : "is-snake"} ${focusMode ? "arcade-focus" : ""}`}
      tabIndex={0}
      onKeyDown={handleKey}
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
      aria-label={`KS ${title}. ${runner ? "Стрибок: пробіл або вгору. Підкат: вниз." : "Керування: стрілки або WASD."} Пауза: P.`}
    >
      <div className="arcade-machine-heading">
        <div>
          <span className="arcade-eyebrow">
            {runner
              ? "01 / RUN · JUMP · REPEAT"
              : "02 / COLLECT · CONNECT · CONQUER"}
          </span>
          <h3>
            {title}
            <span>
              {runner ? "Швидкість має характер." : "Побудуй свою гру."}
            </span>
          </h3>
        </div>
        <div className="arcade-tools">
          <button
            type="button"
            className="arcade-icon-button"
            onClick={onToggleMute}
            aria-label={muted ? "Увімкнути звук" : "Вимкнути звук"}
            aria-pressed={!muted}
          >
            {muted ? <VolumeX /> : <Volume2 />}
          </button>
          <button
            type="button"
            className="arcade-icon-button"
            onClick={() => void toggleScreen()}
            aria-label={
              fullscreen || focusMode
                ? "Вийти з повного екрана"
                : "На весь екран"
            }
          >
            {fullscreen || focusMode ? <Shrink /> : <Expand />}
          </button>
          <button
            type="button"
            className="arcade-icon-button"
            onClick={pause}
            disabled={!inRun}
            aria-label={
              snapshot.phase === "paused" ? "Продовжити гру" : "Пауза"
            }
          >
            {snapshot.phase === "paused" ? <Play /> : <Pause />}
          </button>
        </div>
      </div>
      <div className="arcade-options">
        <div className="arcade-mode-switch" role="group" aria-label="Режим гри">
          <button
            type="button"
            aria-pressed={mode === "arena"}
            disabled={inRun}
            onClick={() => changeMode("arena")}
          >
            <Gamepad2 /> Аркада
          </button>
          <button
            type="button"
            aria-pressed={mode === "daily"}
            disabled={inRun}
            onClick={() => changeMode("daily")}
          >
            <Flag /> Виклик дня
          </button>
        </div>
        <div className="arcade-kits" role="group" aria-label="Колір форми">
          <span>Твій колір</span>
          {KITS.map((color, index) => (
            <button
              key={color.name}
              type="button"
              disabled={inRun}
              aria-label={`Форма ${color.name}`}
              aria-pressed={kit === index}
              style={{ backgroundColor: color.primary }}
              onClick={() => {
                setKit(index)
                writeArcadeValue("ks_arcade_kit", String(index))
              }}
            >
              {kit === index && <Check />}
            </button>
          ))}
        </div>
      </div>
      <div className="arcade-play-layout">
        <div className="arcade-play-column">
          <div className="arcade-hud" aria-label="Статистика гри">
            <div>
              <span>РАХУНОК</span>
              <strong>{String(snapshot.score).padStart(4, "0")}</strong>
            </div>
            <div>
              <span>
                <Trophy /> {mode === "daily" ? "РЕКОРД ДНЯ" : "МІЙ РЕКОРД"}
              </span>
              <strong className="arcade-best">
                {String(best).padStart(4, "0")}
              </strong>
            </div>
            <div className="arcade-hud-combo">
              <span>СЕРІЯ</span>
              <strong>×{Math.max(1, snapshot.combo)}</strong>
            </div>
          </div>
          <div className="arcade-viewport">
            <canvas
              ref={canvasRef}
              className="arcade-canvas"
              role="img"
              aria-label={
                runner
                  ? "Нічний стадіон Neon Run: футболіст, бар’єри та м’ячі"
                  : "Поле Snake Arena з двома бічними порталами"
              }
              onPointerDown={(e) => {
                if (!playing) return
                e.preventDefault()
                root.current?.focus({ preventScroll: true })
                e.currentTarget.setPointerCapture(e.pointerId)
                pointer.current = {
                  x: e.clientX,
                  y: e.clientY,
                  id: e.pointerId,
                }
                if (runner) action("jump")
              }}
              onPointerMove={(e) => {
                const origin = pointer.current
                if (!origin || origin.id !== e.pointerId || !playing) return
                const dx = e.clientX - origin.x,
                  dy = e.clientY - origin.y
                if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return
                if (runner) {
                  if (dy > 22) action("slide")
                } else
                  action(
                    Math.abs(dx) > Math.abs(dy)
                      ? dx > 0
                        ? "right"
                        : "left"
                      : dy > 0
                        ? "down"
                        : "up",
                  )
                pointer.current = {
                  x: e.clientX,
                  y: e.clientY,
                  id: e.pointerId,
                }
              }}
              onPointerUp={() => {
                pointer.current = null
              }}
              onPointerCancel={() => {
                pointer.current = null
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              Ваш браузер має підтримувати Canvas для гри.
            </canvas>
            <span className="arcade-live-label">
              <i /> KS NIGHT SESSION
            </span>
            {playing && (
              <button
                type="button"
                className="arcade-canvas-pause arcade-icon-button"
                onClick={pause}
                aria-label="Пауза гри"
              >
                <Pause />
              </button>
            )}
            {snapshot.phase === "idle" && (
              <div className="arcade-start-overlay">
                <span className="arcade-start-mark">
                  {runner ? <Zap /> : <Gamepad2 />}
                </span>
                <h4>
                  {runner ? "Лови ритм стадіону." : "Твоє поле. Твої правила."}
                </h4>
                <p>
                  {runner
                    ? "Подвійний стрибок. Підкат. Шість м’ячів до Turbo."
                    : "Збирай м’ячі. Замикай серії. Відкривай шлях через портали."}
                </p>
                <button
                  type="button"
                  className="arcade-primary"
                  onClick={startRun}
                >
                  <Play fill="currentColor" /> На поле <ArrowRight />
                </button>
              </div>
            )}
            {snapshot.phase === "paused" && (
              <div className="arcade-pause-overlay" role="status">
                <Pause />
                <h4>Перепочинок</h4>
                <p>Продовжуй, коли будеш готовий.</p>
                <button
                  type="button"
                  className="arcade-primary"
                  onClick={() => {
                    pause()
                    root.current?.focus({ preventScroll: true })
                  }}
                >
                  <Play /> Продовжити
                </button>
              </div>
            )}
            {snapshot.phase === "over" && result && (
              <div className="arcade-pause-overlay arcade-finish-overlay">
                <h4>{result.won ? "Поле підкорено!" : "Фінальний свисток"}</h4>
                <p>
                  {result.score} очок
                  {record
                    ? " · Новий рекорд!"
                    : " · Твій наступний рекорд попереду"}
                </p>
                <button
                  type="button"
                  className="arcade-primary"
                  onClick={startRun}
                >
                  <RotateCcw /> Ще один раунд
                </button>
                <button
                  type="button"
                  className="arcade-text-button"
                  onClick={() =>
                    resultRef.current?.scrollIntoView({
                      block: "center",
                      behavior: "smooth",
                    })
                  }
                >
                  Результат і збереження <ArrowDown />
                </button>
              </div>
            )}
          </div>
          <div className="arcade-energy">
            <div>
              <Zap />
              <span>
                {snapshot.special ||
                  (runner
                    ? "ЗБЕРИ 6 М’ЯЧІВ → TURBO"
                    : "ЗБЕРИ 4 М’ЯЧІ → ЗОЛОТИЙ БОНУС")}
              </span>
              <span>LVL {snapshot.level}</span>
            </div>
            <div
              className="arcade-energy-track"
              role="progressbar"
              aria-label={runner ? "Заряд Turbo" : "Золотий бонус"}
              aria-valuenow={Math.round(snapshot.energy * 100)}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <i style={{ width: `${snapshot.energy * 100}%` }} />
            </div>
          </div>
          <div
            className={`arcade-touch-controls ${runner ? "arcade-run-controls" : "arcade-snake-controls"}`}
            aria-label="Керування грою"
          >
            {runner ? (
              <>
                <button
                  type="button"
                  disabled={!playing}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    action("slide")
                  }}
                  onClick={(e) => {
                    if (e.detail === 0) action("slide")
                  }}
                >
                  <ArrowDown />
                  <span>
                    Підкат<small>↓ / S</small>
                  </span>
                </button>
                <button
                  type="button"
                  disabled={!playing}
                  onPointerDown={(e) => {
                    e.preventDefault()
                    action("jump")
                  }}
                  onClick={(e) => {
                    if (e.detail === 0) action("jump")
                  }}
                >
                  <ArrowUp />
                  <span>
                    Стрибок<small>Пробіл · двічі для подвійного</small>
                  </span>
                </button>
              </>
            ) : (
              <>
                <p>
                  Свайпай по полю
                  <br />
                  <span>або керуй кнопками →</span>
                </p>
                <div className="arcade-dpad">
                  {(
                    [
                      ["up", ArrowUp],
                      ["left", ArrowLeft],
                      ["down", ArrowDown],
                      ["right", ArrowRight],
                    ] as const
                  ).map(([direction, Icon]) => (
                    <button
                      type="button"
                      key={direction}
                      className={`arcade-dir-${direction}`}
                      disabled={!playing}
                      aria-label={
                        {
                          up: "Вгору",
                          left: "Ліворуч",
                          down: "Вниз",
                          right: "Праворуч",
                        }[direction]
                      }
                      onPointerDown={(e) => {
                        e.preventDefault()
                        action(direction)
                      }}
                      onClick={(e) => {
                        if (e.detail === 0) action(direction)
                      }}
                    >
                      <Icon />
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          {snapshot.phase === "over" && result && (
            <section
              ref={resultRef}
              className="arcade-result"
              aria-live="polite"
              aria-label="Результат гри"
            >
              <div className="arcade-result-main">
                <div className="arcade-result-icon">
                  {record ? <Trophy /> : <Flag />}
                </div>
                <div>
                  <span className="arcade-eyebrow">
                    {result.won
                      ? "ПОЛЕ ПІДКОРЕНО"
                      : record
                        ? "НОВИЙ ОСОБИСТИЙ РЕКОРД"
                        : "ФІНАЛЬНИЙ СВИСТОК"}
                  </span>
                  <h4>
                    {result.score}
                    <span>очок</span>
                  </h4>
                  <p>
                    {result.collected} м’ячів · {Math.floor(result.elapsed)} с ·{" "}
                    {result.special}{" "}
                    {runner ? "пройдених перешкод" : "проходів через портал"}
                  </p>
                </div>
              </div>
              <div className="arcade-result-actions">
                <button
                  type="button"
                  className="arcade-primary"
                  onClick={startRun}
                >
                  <RotateCcw /> Ще один раунд
                </button>
                <button
                  type="button"
                  className="arcade-secondary"
                  onClick={() => void share()}
                >
                  <Copy /> Поділитися результатом
                </button>
              </div>
              <div className="arcade-save-status" role="status">
                {result.config.mode === "daily" ? (
                  <p>
                    {localSaved
                      ? "Рекорд виклику збережено на цьому пристрої."
                      : "Результат доступний у цій сесії. Браузер не дозволив локальне збереження."}
                  </p>
                ) : (
                  <>
                    {!playerName && result.score > 0 && (
                      <form
                        onSubmit={(e) => {
                          e.preventDefault()
                          const name = draftName.trim().slice(0, 25)
                          if (name) {
                            onPlayerNameChange(name)
                            void submit(result.score, name, session.current)
                          }
                        }}
                      >
                        <label htmlFor={`${kind}-score-name`}>
                          Залиши ім’я для Залу слави
                        </label>
                        <div>
                          <input
                            id={`${kind}-score-name`}
                            value={draftName}
                            onChange={(e) => setDraftName(e.target.value)}
                            maxLength={25}
                            placeholder="Твій нікнейм"
                            required
                          />
                          <button type="submit" className="arcade-secondary">
                            Зберегти
                          </button>
                        </div>
                      </form>
                    )}
                    {saveStatus === "saving" && (
                      <p>
                        <LoaderCircle className="arcade-spin" /> Зберігаємо
                        результат…
                      </p>
                    )}
                    {saveStatus === "saved" && (
                      <p>
                        <Check /> Результат збережено в Залі слави. У таблиці —
                        твій найкращий.
                      </p>
                    )}
                    {saveStatus === "error" && (
                      <p>
                        Не вдалося зберегти онлайн.{" "}
                        {localSaved
                          ? "Локальний рекорд збережений."
                          : "Результат доступний у цій сесії."}
                        <button
                          type="button"
                          onClick={() =>
                            void submit(
                              result.score,
                              playerName || draftName,
                              session.current,
                            )
                          }
                        >
                          Спробувати ще раз
                        </button>
                      </p>
                    )}
                  </>
                )}
                {shareStatus && <p>{shareStatus}</p>}
              </div>
              <button
                type="button"
                className="arcade-text-button"
                onClick={onViewLeaderboard}
              >
                <Trophy /> Відкрити Зал слави <ArrowRight />
              </button>
            </section>
          )}
        </div>
        <aside className="arcade-field-notes">
          <span className="arcade-eyebrow">ПЛАН НА ГРУ</span>
          <h4>{runner ? "Більше, ніж просто біг." : "Думай на хід уперед."}</h4>
          {(runner
            ? [
                [
                  "01",
                  "Знайди свій ритм",
                  "Перестрибуй бар’єри. Другий стрибок у повітрі врятує від помилки. Під дронами — підкат.",
                ],
                [
                  "02",
                  "Заряджай Turbo",
                  "Збери 6 м’ячів: на 6 секунд отримай захист і подвійні очки за дистанцію.",
                ],
                [
                  "03",
                  "Тримай серію",
                  "Наступний м’яч за 6 секунд підвищує множник. Збирай до ×3 очок за м’ячі.",
                ],
              ]
            : [
                [
                  "01",
                  "Скорочуй шлях",
                  "Блакитні ворота зліва та справа — портали. Проходь крізь них на інший бік поля.",
                ],
                [
                  "02",
                  "Полюй на золото",
                  "Кожні 4 м’ячі з’являється золотий. Маєш 8 секунд, щоб отримати від 50 очок.",
                ],
                [
                  "03",
                  "Будуй серії",
                  "Збирай м’ячі з інтервалом до 6 секунд для ×3. Уникай стін та власного хвоста.",
                ],
              ]
          ).map(([number, heading, text]) => (
            <div className="arcade-note" key={number}>
              <span>{number}</span>
              <div>
                <h5>{heading}</h5>
                <p>{text}</p>
              </div>
            </div>
          ))}
          <div className="arcade-daily-note">
            <Flag />
            <div>
              <strong>
                {mode === "daily"
                  ? `Виклик ${day.slice(8)}.${day.slice(5, 7)}`
                  : "Спробуй виклик дня"}
              </strong>
              <p>
                Однаковий початковий сценарій на весь день. Рекорд виклику — на
                цьому пристрої. Оновлення о 00:00 UTC.
              </p>
            </div>
          </div>
          <div className="arcade-key-hint">
            {runner
              ? "Пробіл / ↑ — стрибок · ↓ — підкат"
              : "Стрілки / WASD — рух"}
            <br />P / Esc — пауза
          </div>
        </aside>
      </div>
      <div className="arcade-machine-footer">
        <span>
          <Flame /> Зроблено для KS LIGA
        </span>
        <span>Твій наступний рекорд — за один раунд.</span>
      </div>
    </div>
  )
}
