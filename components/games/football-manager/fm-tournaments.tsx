"use client"

import { useState, useEffect } from "react"
import {
  FMClub,
  FMPlayer,
  FMTactics,
  FMStadium,
  FMTournament,
  FMTournamentBracket,
  FMTournamentMatch,
  FMMatch
} from "@/lib/fm-types"
import {
  fmGetActiveTournaments,
  fmCreateTournament,
  fmUpdateTournament,
  fmGetOpponentClubs,
  fmSaveCompletedMatch,
  fmUpdateClub
} from "@/lib/fm-database"
import {
  simulateFullMatch,
  calculateTeamPower,
  generateStarterSquad,
  SPECIAL_ABILITIES_MAP
} from "@/lib/fm-engine"
import { fmAudio } from "@/lib/fm-audio"
import {
  Trophy,
  Play,
  Zap,
  Shield,
  Award,
  Clock,
  Sparkles,
  ChevronRight,
  Flame,
  CheckCircle2,
  AlertCircle
} from "lucide-react"

interface FMTournamentsViewProps {
  club: FMClub
  players: FMPlayer[]
  tactics: FMTactics | null
  stadium: FMStadium | null
  onClubUpdated: () => void
}

export function FMTournamentsView({
  club,
  players,
  tactics,
  stadium,
  onClubUpdated
}: FMTournamentsViewProps) {
  const [tournaments, setTournaments] = useState<FMTournament[]>([])
  const [activeTournament, setActiveTournament] = useState<FMTournament | null>(null)
  const [loading, setLoading] = useState(true)
  const [simulatingMatch, setSimulatingMatch] = useState<FMMatch | null>(null)
  const [simSpeed, setSimSpeed] = useState<number>(1)
  const [simMinute, setSimMinute] = useState<number>(0)
  const [postMatchReward, setPostMatchReward] = useState<{
    revenue: number
    xp: number
    resultText: string
    isFinalWin?: boolean
  } | null>(null)

  useEffect(() => {
    loadTournaments()
  }, [])

  const loadTournaments = async () => {
    setLoading(true)
    const list = await fmGetActiveTournaments()
    setTournaments(list)
    if (list.length > 0) {
      setActiveTournament(list[0])
    }
    setLoading(false)
  }

  const handleCreateTournament = async (name: string, entryFee: number, prizePool: number) => {
    fmAudio.playClick()
    if (club.balance < entryFee) {
      alert("Недостатньо коштів для сплати внеску за участь у турнірі!")
      return
    }

    const opponents = await fmGetOpponentClubs(club.id)
    const botClubs = opponents.map((b) => ({
      id: b.id,
      name: b.name,
      badge: b.badge_symbol,
      color: b.primary_color
    }))

    const newT = await fmCreateTournament(
      name,
      { id: club.id, name: club.name, badge: club.badge_symbol, color: club.primary_color },
      botClubs,
      entryFee,
      prizePool
    )

    if (newT) {
      fmAudio.playCoins()
      await fmUpdateClub(club.id, { balance: club.balance - entryFee })
      await loadTournaments()
      setActiveTournament(newT)
      onClubUpdated()
    }
  }

  // Play current round of active tournament
  const handlePlayCurrentRound = async () => {
    if (!activeTournament) return
    fmAudio.playClick()

    const bracket = { ...activeTournament.bracket }
    let userMatch: FMTournamentMatch | undefined
    const isQF = activeTournament.status === "quarter_finals"
    const isSF = activeTournament.status === "semi_finals"
    const isF = activeTournament.status === "final"

    if (isQF) {
      userMatch = bracket.quarter_finals.find(
        (m) => (m.home_club_id === club.id || m.away_club_id === club.id) && !m.is_played
      )
    } else if (isSF) {
      userMatch = bracket.semi_finals.find(
        (m) => (m.home_club_id === club.id || m.away_club_id === club.id) && !m.is_played
      )
    } else if (isF) {
      userMatch = !bracket.final.is_played ? bracket.final : undefined
    }

    if (!userMatch) {
      alert("Матч вашого клубу не знайдено або вже зіграно.")
      return
    }

    // Opponent details
    const isUserHome = userMatch.home_club_id === club.id
    const opponentId = isUserHome ? userMatch.away_club_id : userMatch.home_club_id
    const opponentName = isUserHome ? userMatch.away_club_name : userMatch.home_club_name

    // Generate opponent squad
    const botSquad = generateStarterSquad(opponentId).map((p, i) => ({
      ...p,
      id: 9000 + i,
      skill: p.skill + 10
    })) as FMPlayer[]

    // Simulate Match
    const simRes = simulateFullMatch(
      isUserHome ? { id: club.id, name: club.name } : { id: opponentId, name: opponentName },
      isUserHome ? players : botSquad,
      tactics,
      stadium,
      !isUserHome ? { id: club.id, name: club.name } : { id: opponentId, name: opponentName },
      !isUserHome ? players : botSquad,
      null,
      "cup",
      activeTournament.id
    )

    // Start live simulation viewer
    setSimulatingMatch(simRes.match)
    setSimMinute(0)
    fmAudio.playWhistle()

    // Background timer to advance simulation
    let currentMin = 0
    const interval = setInterval(async () => {
      currentMin += 5
      setSimMinute(currentMin)

      if (currentMin >= 90) {
        clearInterval(interval)
        fmAudio.playWhistle()

        // Update match outcome
        const userWon = isUserHome
          ? simRes.match.home_score > simRes.match.away_score
          : simRes.match.away_score > simRes.match.home_score

        const isDraw = simRes.match.home_score === simRes.match.away_score
        const penaltyWinner = isDraw && Math.random() > 0.5 ? club.id : opponentId

        const winnerId = userWon ? club.id : isDraw ? penaltyWinner : opponentId
        const winnerName = winnerId === club.id ? club.name : opponentName

        userMatch!.home_score = simRes.match.home_score
        userMatch!.away_score = simRes.match.away_score
        userMatch!.winner_club_id = winnerId
        userMatch!.is_played = true

        // Simulate other bot matches in the round
        if (isQF) {
          bracket.quarter_finals.forEach((m) => {
            if (!m.is_played) {
              const hScore = Math.floor(Math.random() * 4)
              let aScore = Math.floor(Math.random() * 4)
              if (hScore === aScore) aScore += 1 // no draws in knockout
              m.home_score = hScore
              m.away_score = aScore
              m.winner_club_id = hScore > aScore ? m.home_club_id : m.away_club_id
              m.is_played = true
            }
          })

          // Setup Semi-Finals
          const qfWinners = bracket.quarter_finals.map((m) => ({
            id: m.winner_club_id!,
            name: m.winner_club_id === m.home_club_id ? m.home_club_name : m.away_club_name
          }))

          bracket.semi_finals = [
            {
              home_club_id: qfWinners[0].id,
              home_club_name: qfWinners[0].name,
              away_club_id: qfWinners[1].id,
              away_club_name: qfWinners[1].name,
              is_played: false
            },
            {
              home_club_id: qfWinners[2].id,
              home_club_name: qfWinners[2].name,
              away_club_id: qfWinners[3].id,
              away_club_name: qfWinners[3].name,
              is_played: false
            }
          ]

          await fmUpdateTournament(activeTournament.id, bracket, "semi_finals")
        } else if (isSF) {
          bracket.semi_finals.forEach((m) => {
            if (!m.is_played) {
              const hScore = Math.floor(Math.random() * 4)
              let aScore = Math.floor(Math.random() * 4)
              if (hScore === aScore) aScore += 1
              m.home_score = hScore
              m.away_score = aScore
              m.winner_club_id = hScore > aScore ? m.home_club_id : m.away_club_id
              m.is_played = true
            }
          })

          const sfWinners = bracket.semi_finals.map((m) => ({
            id: m.winner_club_id!,
            name: m.winner_club_id === m.home_club_id ? m.home_club_name : m.away_club_name
          }))

          bracket.final = {
            home_club_id: sfWinners[0].id,
            home_club_name: sfWinners[0].name,
            away_club_id: sfWinners[1].id,
            away_club_name: sfWinners[1].name,
            is_played: false
          }

          await fmUpdateTournament(activeTournament.id, bracket, "final")
        } else if (isF) {
          bracket.final.home_score = simRes.match.home_score
          bracket.final.away_score = simRes.match.away_score
          bracket.final.winner_club_id = winnerId
          bracket.final.is_played = true
          bracket.winner_club_id = winnerId
          bracket.winner_club_name = winnerName

          const isFinalChampion = winnerId === club.id
          if (isFinalChampion) {
            fmAudio.playLevelUp()
            await fmUpdateClub(club.id, {
              cups_won: (club.cups_won || 0) + 1,
              balance: club.balance + activeTournament.prize_pool
            })
          }

          await fmUpdateTournament(activeTournament.id, bracket, "completed", winnerId, winnerName)
        }

        // Save completed match and fatigue
        await fmSaveCompletedMatch(simRes.match, simRes.playerFatigueDrained, club.id)

        // Show reward modal
        const isChamp = isF && winnerId === club.id
        setPostMatchReward({
          revenue: simRes.match.revenue + (isChamp ? activeTournament.prize_pool : 0),
          xp: simRes.match.xp_reward + (isChamp ? 500 : 0),
          resultText: isChamp
            ? "🏆 ВИТЯЗЬ ТУРНІРУ! ВИ ВИГРАЛИ КУБОК 11x11!"
            : userWon
            ? "🎉 ПЕРЕМОГА! ВИ ВИЙШЛИ В НАСТУПНИЙ РАУНД!"
            : "❌ ПОРАЗКА У РАУНДІ",
          isFinalWin: isChamp
        })

        await loadTournaments()
        onClubUpdated()
      }
    }, 450)
  }

  const closeSimulation = () => {
    setSimulatingMatch(null)
    setPostMatchReward(null)
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16 text-emerald-400">
        <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* HEADER & TOURNAMENT SELECTOR */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/40 border border-amber-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-400 animate-bounce" />
            <h2 className="text-2xl font-black text-white">Швидкі Кубки 11x11</h2>
            <span className="px-2 py-0.5 text-xs font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
              8 Команд • Нокаут
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Головний ігровий режим 11x11.ru: грайте кубкові турніри, проходьте раунди та заробляйте ₴ призові й славу!
          </p>
        </div>

        {/* Quick Registration CTA */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => handleCreateTournament("Кубок Майстрів", 5000, 50000)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-emerald-950 border border-emerald-400/40 transition-all scale-100 hover:scale-105"
          >
            <Flame className="w-4 h-4 text-amber-300" />
            <span>Новий Кубок (Внесок 5,000 ₴)</span>
          </button>
          <button
            onClick={() => handleCreateTournament("Золотий Кубок Чемпіонів", 25000, 250000)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black text-xs sm:text-sm shadow-lg shadow-amber-950 border border-amber-300 transition-all scale-100 hover:scale-105"
          >
            <Trophy className="w-4 h-4" />
            <span>Золотий Кубок (250,000 ₴)</span>
          </button>
        </div>
      </div>

      {/* ACTIVE TOURNAMENT BRACKET */}
      {activeTournament ? (
        <div className="space-y-6">
          {/* Tournament Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/90 border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 font-black">
                🏆
              </div>
              <div>
                <h3 className="text-lg font-black text-white">{activeTournament.name}</h3>
                <p className="text-xs text-slate-400">
                  Призовий фонд: <span className="text-amber-400 font-bold">{activeTournament.prize_pool.toLocaleString()} ₴</span> |
                  Стадія: <span className="text-emerald-400 font-bold uppercase">{activeTournament.status.replace("_", " ")}</span>
                </p>
              </div>
            </div>

            {activeTournament.status !== "completed" ? (
              <button
                onClick={handlePlayCurrentRound}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-950 transition-all animate-pulse"
              >
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Зіграти Раунд!</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-300 font-bold text-sm border border-amber-500/40">
                <CheckCircle2 className="w-4 h-4" />
                <span>Переможець: {activeTournament.winner_club_name || "Завершено"}</span>
              </div>
            )}
          </div>

          {/* VISUAL 11x11 TOURNAMENT BRACKET */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* 1. QUARTER-FINALS (1/4) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
                <span>1/4 ФІНАЛУ (8 КОМАНД)</span>
                <span className="text-emerald-400">Раунд 1</span>
              </div>

              {activeTournament.bracket.quarter_finals?.map((match, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    match.home_club_id === club.id || match.away_club_id === club.id
                      ? "bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-950"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold py-1">
                    <span className={match.home_club_id === club.id ? "text-emerald-300 font-black" : "text-slate-200"}>
                      {match.home_club_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-white font-mono">
                      {match.is_played ? match.home_score : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold py-1 border-t border-slate-800/60 mt-1 pt-1">
                    <span className={match.away_club_id === club.id ? "text-emerald-300 font-black" : "text-slate-200"}>
                      {match.away_club_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-white font-mono">
                      {match.is_played ? match.away_score : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 2. SEMI-FINALS (1/2) */}
            <div className="space-y-3 flex flex-col justify-around">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-bold text-slate-400">
                <span>1/2 ФІНАЛУ (4 КОМАНДИ)</span>
                <span className="text-amber-400">Раунд 2</span>
              </div>

              {(activeTournament.bracket.semi_finals?.length
                ? activeTournament.bracket.semi_finals
                : [
                    { home_club_id: 0, away_club_id: 0, home_club_name: "Переможець 1/4 (1)", away_club_name: "Переможець 1/4 (2)", is_played: false, home_score: 0, away_score: 0 },
                    { home_club_id: 0, away_club_id: 0, home_club_name: "Переможець 1/4 (3)", away_club_name: "Переможець 1/4 (4)", is_played: false, home_score: 0, away_score: 0 }
                  ]
              ).map((match, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-xl border transition-all ${
                    match.home_club_id === club.id || match.away_club_id === club.id
                      ? "bg-emerald-950/40 border-emerald-500/50 shadow-md"
                      : "bg-slate-900/60 border-slate-800"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold py-1">
                    <span className={match.home_club_id === club.id ? "text-emerald-300 font-black" : "text-slate-300"}>
                      {match.home_club_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-white font-mono">
                      {match.is_played ? match.home_score : "-"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs font-bold py-1 border-t border-slate-800/60 mt-1 pt-1">
                    <span className={match.away_club_id === club.id ? "text-emerald-300 font-black" : "text-slate-300"}>
                      {match.away_club_name}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-950 text-white font-mono">
                      {match.is_played ? match.away_score : "-"}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* 3. GRAND FINAL */}
            <div className="space-y-3 flex flex-col justify-center">
              <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-amber-950/50 border border-amber-500/40 text-xs font-black text-amber-300">
                <span>🏆 ВЕЛИКИЙ ФІНАЛ</span>
                <span>Трофей</span>
              </div>

              <div
                className={`p-5 rounded-2xl border-2 transition-all ${
                  activeTournament.bracket.final?.home_club_id === club.id ||
                  activeTournament.bracket.final?.away_club_id === club.id
                    ? "bg-gradient-to-b from-amber-950/40 to-emerald-950/60 border-amber-400 shadow-xl shadow-amber-950"
                    : "bg-slate-900/80 border-slate-800"
                }`}
              >
                <div className="text-center pb-3">
                  <span className="text-[10px] uppercase font-black tracking-widest text-amber-400">
                    Битва за Кубок
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm font-black py-1.5">
                  <span className={activeTournament.bracket.final?.home_club_id === club.id ? "text-emerald-300" : "text-white"}>
                    {activeTournament.bracket.final?.home_club_name || "Фіналіст 1"}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-950 text-amber-400 font-mono text-base">
                    {activeTournament.bracket.final?.is_played ? activeTournament.bracket.final.home_score : "-"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm font-black py-1.5 border-t border-slate-800 mt-2 pt-2">
                  <span className={activeTournament.bracket.final?.away_club_id === club.id ? "text-emerald-300" : "text-white"}>
                    {activeTournament.bracket.final?.away_club_name || "Фіналіст 2"}
                  </span>
                  <span className="px-3 py-1 rounded-lg bg-slate-950 text-amber-400 font-mono text-base">
                    {activeTournament.bracket.final?.is_played ? activeTournament.bracket.final.away_score : "-"}
                  </span>
                </div>

                {activeTournament.winner_club_name && (
                  <div className="mt-4 pt-3 border-t border-amber-500/30 text-center">
                    <span className="text-xs text-slate-400">Володар Кубка:</span>
                    <p className="text-sm font-black text-amber-300">
                      🏆 {activeTournament.winner_club_name}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-12 text-center rounded-2xl bg-slate-900/60 border border-slate-800">
          <Trophy className="w-12 h-12 text-amber-400 mx-auto mb-3 opacity-60" />
          <h3 className="text-lg font-bold text-white">Немає активних турнірів</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mt-1 mb-4">
            Зареєструйтеся на швидкий кубок 11x11, щоб почати боротьбу за нагороди та трофеї!
          </p>
          <button
            onClick={() => handleCreateTournament("Кубок Майстрів", 5000, 50000)}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-lg shadow-emerald-950"
          >
            Створити Кубок (5,000 ₴)
          </button>
        </div>
      )}

      {/* LIVE MATCH SIMULATION MODAL */}
      {simulatingMatch && (
        <div className="fixed inset-0 z-[110] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-slate-900 border border-emerald-500/40 p-5 sm:p-6 shadow-2xl space-y-5">
            {/* SCOREBOARD */}
            <div className="relative overflow-hidden rounded-xl bg-slate-950 border border-emerald-500/30 p-5 text-center shadow-inner">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 text-right">
                  <h4 className="text-lg sm:text-xl font-black text-white truncate">
                    {simulatingMatch.home_club_name}
                  </h4>
                </div>
                <div className="px-5 py-2 rounded-xl bg-slate-900 border border-slate-800 font-mono text-3xl sm:text-4xl font-black text-amber-400 shadow-md">
                  {simulatingMatch.home_score} : {simulatingMatch.away_score}
                </div>
                <div className="flex-1 text-left">
                  <h4 className="text-lg sm:text-xl font-black text-white truncate">
                    {simulatingMatch.away_club_name}
                  </h4>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
                <span>Хвилина: {simMinute}' / 90'</span>
              </div>
            </div>

            {/* LIVE COMMENTARY STREAM */}
            <div className="h-56 overflow-y-auto space-y-2 p-3 rounded-xl bg-slate-950/80 border border-slate-800 font-sans text-xs sm:text-sm scrollbar-thin">
              {simulatingMatch.events_log
                .filter((e) => e.minute <= simMinute)
                .map((event, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-lg border ${
                      event.type === "goal"
                        ? "bg-emerald-950/70 border-emerald-400 text-emerald-200 font-bold"
                        : event.type === "yellow_card"
                        ? "bg-amber-950/50 border-amber-500/40 text-amber-200"
                        : "bg-slate-900 border-slate-800 text-slate-300"
                    }`}
                  >
                    <span className="font-mono text-slate-400 mr-2">[{event.minute}']</span>
                    <span>{event.text}</span>
                  </div>
                ))}
            </div>

            {/* REWARD POPUP ONCE MATCH ENDS */}
            {postMatchReward && (
              <div className="p-4 rounded-xl bg-emerald-950/80 border-2 border-emerald-400 text-center space-y-3 animate-fade-in">
                <h3 className="text-xl font-black text-white">{postMatchReward.resultText}</h3>
                <div className="flex items-center justify-center gap-6 text-sm">
                  <span className="text-emerald-300 font-bold">
                    Дохід: +{postMatchReward.revenue.toLocaleString()} ₴
                  </span>
                  <span className="text-amber-300 font-bold">
                    XP Менеджера: +{postMatchReward.xp} XP
                  </span>
                </div>
                <button
                  onClick={closeSimulation}
                  className="px-6 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm shadow-lg shadow-emerald-950"
                >
                  Забрати нагороду та повернутися
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
