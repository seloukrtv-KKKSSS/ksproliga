"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Edit,
  Trash2,
  Settings,
  Users,
  Calendar,
  Target,
  Clock,
  Trophy,
  AlertTriangle,
  Crosshair,
  Star,
} from "lucide-react"
import {
  getChampionships,
  addChampionship,
  updateChampionship,
  deleteChampionship,
  getTeams,
  addTeam,
  updateTeam,
  deleteTeam,
  getMatches,
  addMatch,
  updateMatch,
  deleteMatch,
  getPlayers,
  addPlayer,
  updatePlayer,
  deletePlayer,
  getMatchGoals,
  addMatchGoal,
  deleteMatchGoal,
  getMatchVoting,
  getVotingCandidates,
  getChampionshipVotings,
  createOrUpdateVoting,
  setVotingActiveState,
  addVotingCandidate,
  deleteVotingCandidate,
  updateVotingCandidate,
} from "@/lib/database"
import type { Championship, Team, Match, Player, MatchGoal, MatchVoting, VotingCandidate } from "@/lib/supabase"

const CUP_STAGES = ["1/32 фіналу", "1/16 фіналу", "1/8 фіналу", "1/4 фіналу", "1/2 фіналу", "Фінал"]

const getErrorMessage = (error: unknown): string => {
  return error instanceof Error ? error.message : String(error)
}

interface AdminPanelProps {
  onLogout: () => void
  currentChampionshipId: number
  onChampionshipChange: (id: number) => void
}

export function AdminPanel({ onLogout, currentChampionshipId, onChampionshipChange }: AdminPanelProps) {
  const [championships, setChampionships] = useState<Championship[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(false)

  // Championship form state
  const [championshipForm, setChampionshipForm] = useState<{
    name: string
    season: string
    is_active: boolean
    tournament_type: "league" | "cup"
  }>({
    name: "",
    season: "",
    is_active: false,
    tournament_type: "league",
  })
  const [editingChampionship, setEditingChampionship] = useState<Championship | null>(null)

  // Team form state
  const [teamForm, setTeamForm] = useState({ name: "", logo: "" })
  const [editingTeam, setEditingTeam] = useState<Team | null>(null)

  // Match form state
  const [matchForm, setMatchForm] = useState({
    round: 1,
    date: "",
    home_team: "",
    away_team: "",
    home_score: "",
    away_score: "",
    is_finished: false,
    match_time: "",
    cup_stage: "",
    is_technical_defeat: false,
    technical_winner: "",
    penalty_home: "",
    penalty_away: "",
    penalty_winner: "",
    finished_after_penalties: false,
  })
  const [editingMatch, setEditingMatch] = useState<Match | null>(null)

  // Player form state
  const [playerForm, setPlayerForm] = useState({ name: "", team: "", goals: 0 })
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null)

  // Match goals state
  const [selectedMatchForGoals, setSelectedMatchForGoals] = useState<Match | null>(null)
  const [matchGoals, setMatchGoals] = useState<MatchGoal[]>([])
  const [goalForm, setGoalForm] = useState({
    player_name: "",
    team_name: "",
    minute: "",
    goal_type: "regular" as "regular" | "penalty" | "own_goal",
  })

  // Lion of the Match state
  const [selectedMatchForVoting, setSelectedMatchForVoting] = useState<Match | null>(null)
  const [matchVoting, setMatchVoting] = useState<MatchVoting | null>(null)
  const [votingCandidates, setVotingCandidates] = useState<VotingCandidate[]>([])
  const [championshipVotings, setChampionshipVotings] = useState<MatchVoting[]>([])
  const [hideCompletedVotings, setHideCompletedVotings] = useState(false)
  const [candidateForm, setCandidateForm] = useState({
    player_name: "",
    team_name: "",
  })
  const [votingTimeForm, setVotingTimeForm] = useState({
    start_time: "",
    end_time: "",
  })
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(null)
  const [editingCandidateName, setEditingCandidateName] = useState("")


  const currentChampionship = championships.find((c) => c.id === currentChampionshipId)

  useEffect(() => {
    loadData()
  }, [currentChampionshipId])

  const loadData = async () => {
    try {
      const championshipsData = await getChampionships()
      setChampionships(championshipsData)

      if (currentChampionshipId && currentChampionshipId > 0) {
        const [teamsData, matchesData, playersData, votingsData] = await Promise.all([
          getTeams(currentChampionshipId),
          getMatches(currentChampionshipId),
          getPlayers(currentChampionshipId),
          getChampionshipVotings(currentChampionshipId),
        ])
        setTeams(teamsData)
        setMatches(matchesData)
        setPlayers(playersData)
        setChampionshipVotings(votingsData)
      } else {
        setTeams([])
        setMatches([])
        setPlayers([])
        setChampionshipVotings([])
      }
    } catch (error) {
      console.error("Error loading data:", error)
    }
  }

  // Championship handlers
  const handleChampionshipSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (editingChampionship) {
        await updateChampionship(editingChampionship.id, championshipForm)
        setEditingChampionship(null)
      } else {
        const newChampionship = await addChampionship(championshipForm)
        onChampionshipChange(newChampionship.id)
      }
      setChampionshipForm({ name: "", season: "", is_active: false, tournament_type: "league" })
      await loadData()
    } catch (error) {
      console.error("Error saving championship:", error)
    }
    setLoading(false)
  }

  const handleDeleteChampionship = async (id: number) => {
    if (confirm("Ви впевнені, що хочете видалити цей чемпіонат? Це також видалить всі команди, матчі та гравців.")) {
      try {
        await deleteChampionship(id)
        await loadData()
        if (id === currentChampionshipId && championships.length > 1) {
          const remainingChampionships = championships.filter((c) => c.id !== id)
          if (remainingChampionships.length > 0) {
            onChampionshipChange(remainingChampionships[0].id)
          } else {
            onChampionshipChange(0)
          }
        }
      } catch (error) {
        console.error("Error deleting championship:", error)
      }
    }
  }

  // Team handlers
  const handleTeamSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0) {
      alert("Спочатку створіть чемпіонат")
      return
    }

    setLoading(true)
    try {
      const teamData = {
        name: teamForm.name,
        logo: teamForm.logo,
        championship_id: currentChampionshipId,
      }

      if (editingTeam) {
        await updateTeam(editingTeam.id, teamData)
        setEditingTeam(null)
      } else {
        await addTeam(teamData)
      }
      setTeamForm({ name: "", logo: "" })
      await loadData()
    } catch (error) {
      console.error("Error saving team:", error)
      alert("Помилка при збереженні команди: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleDeleteTeam = async (id: number) => {
    if (confirm("Ви впевнені, що хочете видалити цю команду?")) {
      try {
        await deleteTeam(id)
        await loadData()
      } catch (error) {
        console.error("Error deleting team:", error)
      }
    }
  }

  // Match handlers
  const handleMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0) {
      alert("Спочатку створіть чемпіонат")
      return
    }

    if (matchForm.home_team === matchForm.away_team) {
      alert("Команда не може грати сама з собою!")
      return
    }

    setLoading(true)
    try {
      const matchData = {
        round: matchForm.round,
        date: matchForm.date,
        home_team: matchForm.home_team,
        away_team: matchForm.away_team,
        home_score:
          matchForm.is_finished && matchForm.home_score !== ""
            ? Number.parseInt(matchForm.home_score)
            : null,
        away_score:
          matchForm.is_finished && matchForm.away_score !== ""
            ? Number.parseInt(matchForm.away_score)
            : null,
        is_finished: matchForm.is_finished,
        championship_id: currentChampionshipId,
        match_time: matchForm.match_time || undefined,
        cup_stage: currentChampionship?.tournament_type === "cup" ? (matchForm.cup_stage || undefined) : undefined,
        is_technical_defeat: matchForm.is_technical_defeat || undefined,
        technical_winner: matchForm.is_technical_defeat ? (matchForm.technical_winner || undefined) : undefined,
        penalty_home:
          matchForm.finished_after_penalties && matchForm.penalty_home ? Number.parseInt(matchForm.penalty_home) : null,
        penalty_away:
          matchForm.finished_after_penalties && matchForm.penalty_away ? Number.parseInt(matchForm.penalty_away) : null,
        penalty_winner: matchForm.finished_after_penalties ? (matchForm.penalty_winner || undefined) : undefined,
      }

      if (editingMatch) {
        await updateMatch(editingMatch.id, matchData)
        setEditingMatch(null)
      } else {
        await addMatch(matchData)
      }

      setMatchForm({
        round: 1,
        date: "",
        home_team: "",
        away_team: "",
        home_score: "",
        away_score: "",
        is_finished: false,
        match_time: "",
        cup_stage: "",
        is_technical_defeat: false,
        technical_winner: "",
        penalty_home: "",
        penalty_away: "",
        penalty_winner: "",
        finished_after_penalties: false,
      })
      await loadData()
    } catch (error) {
      console.error("Error saving match:", error)
      alert("Помилка при збереженні матчу: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleDeleteMatch = async (id: number) => {
    if (confirm("Ви впевнені, що хочете видалити цей матч?")) {
      try {
        await deleteMatch(id)
        await loadData()
      } catch (error) {
        console.error("Error deleting match:", error)
      }
    }
  }

  // Match goals handlers
  const loadMatchGoals = async (matchId: number) => {
    try {
      const goals = await getMatchGoals(matchId)
      setMatchGoals(goals)
    } catch (error) {
      console.error("Error loading match goals:", error)
    }
  }

  const handleAddMatchGoal = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatchForGoals) return

    setLoading(true)
    try {
      await addMatchGoal({
        match_id: selectedMatchForGoals.id,
        player_name: goalForm.player_name,
        team_name: goalForm.team_name,
        minute: goalForm.minute ? Number.parseInt(goalForm.minute) : undefined,
        goal_type: goalForm.goal_type,
      })

      setGoalForm({
        player_name: "",
        team_name: selectedMatchForGoals.home_team,
        minute: "",
        goal_type: "regular",
      })
      await loadMatchGoals(selectedMatchForGoals.id)
    } catch (error) {
      console.error("Error adding match goal:", error)
      alert("Помилка при додаванні голу: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleDeleteMatchGoal = async (goalId: number) => {
    if (confirm("Ви впевнені, що хочете видалити цей гол?")) {
      try {
        await deleteMatchGoal(goalId)
        if (selectedMatchForGoals) {
          await loadMatchGoals(selectedMatchForGoals.id)
        }
      } catch (error) {
        console.error("Error deleting match goal:", error)
      }
    }
  }

  const updateChampionshipVotingsList = (updatedVoting: MatchVoting) => {
    setChampionshipVotings((prev) => {
      const exists = prev.some((v) => v.match_id === updatedVoting.match_id)
      if (exists) {
        return prev.map((v) => v.match_id === updatedVoting.match_id ? updatedVoting : v)
      } else {
        return [...prev, updatedVoting]
      }
    })
  }

  const applyPreset = (preset: "match24" | "match48" | "now24" | "now48" | "clear", targetMatch: Match | null) => {
    if (!targetMatch) return

    if (preset === "clear") {
      setVotingTimeForm({ start_time: "", end_time: "" })
      return
    }

    let startDate = new Date()
    if (preset.startsWith("match")) {
      const matchDateStr = targetMatch.date // e.g. "2026-07-16"
      const matchTimeStr = targetMatch.match_time || "12:00"
      startDate = new Date(`${matchDateStr}T${matchTimeStr}`)
      if (isNaN(startDate.getTime())) {
        startDate = new Date()
      }
    }

    const hours = preset.endsWith("24") ? 24 : 48
    const endDate = new Date(startDate.getTime() + hours * 60 * 60 * 1000)

    const toLocalISO = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0")
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
    }

    setVotingTimeForm({
      start_time: toLocalISO(startDate),
      end_time: toLocalISO(endDate),
    })
  }

  // Lion of the Match handlers
  const loadMatchVoting = async (matchId: number) => {
    try {
      const [votingData, candidatesData] = await Promise.all([
        getMatchVoting(matchId),
        getVotingCandidates(matchId),
      ])
      setMatchVoting(votingData)
      setVotingCandidates(candidatesData)

      if (votingData) {
        const formatForInput = (isoString: string | null) => {
          if (!isoString) return ""
          const date = new Date(isoString)
          const pad = (num: number) => num.toString().padStart(2, "0")
          return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
        }

        setVotingTimeForm({
          start_time: formatForInput(votingData.start_time),
          end_time: formatForInput(votingData.end_time),
        })
      } else {
        setVotingTimeForm({
          start_time: "",
          end_time: "",
        })
      }
    } catch (error) {
      console.error("Error loading match voting info:", error)
    }
  }

  const handleVotingTimeSubmit = async (e: React.FormEvent) => {
    if (!selectedMatchForVoting) return

    e.preventDefault()
    setLoading(true)
    try {
      const startTime = votingTimeForm.start_time ? new Date(votingTimeForm.start_time).toISOString() : null
      const endTime = votingTimeForm.end_time ? new Date(votingTimeForm.end_time).toISOString() : null

      const updated = await createOrUpdateVoting(
        selectedMatchForVoting.id,
        startTime,
        endTime
      )
      setMatchVoting(updated)
      updateChampionshipVotingsList(updated)
      alert("Параметри голосування успішно збережено!")
    } catch (error) {
      console.error("Error saving voting configuration:", error)
      alert("Помилка збереження голосування: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleToggleVotingActiveState = async () => {
    if (!selectedMatchForVoting) return

    setLoading(true)
    try {
      const nextState = !matchVoting?.is_active
      if (!matchVoting) {
        const startTime = votingTimeForm.start_time ? new Date(votingTimeForm.start_time).toISOString() : null
        const endTime = votingTimeForm.end_time ? new Date(votingTimeForm.end_time).toISOString() : null
        const created = await createOrUpdateVoting(selectedMatchForVoting.id, startTime, endTime)
        updateChampionshipVotingsList(created)
      }

      const updated = await setVotingActiveState(selectedMatchForVoting.id, nextState)
      setMatchVoting(updated)
      updateChampionshipVotingsList(updated)
    } catch (error) {
      console.error("Error toggling voting state:", error)
      alert("Помилка активації/деактивації голосування: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleAddCandidateSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMatchForVoting) return

    setLoading(true)
    try {
      if (!matchVoting) {
        const defaultVoting = await createOrUpdateVoting(selectedMatchForVoting.id, null, null)
        setMatchVoting(defaultVoting)
      }

      const newCandidate = await addVotingCandidate(
        selectedMatchForVoting.id,
        candidateForm.player_name,
        candidateForm.team_name
      )

      setVotingCandidates([...votingCandidates, newCandidate])
      setCandidateForm({
        ...candidateForm,
        player_name: "",
      })
    } catch (error) {
      console.error("Error adding candidate:", error)
      alert("Помилка додавання гравця: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleDeleteCandidate = async (candidateId: number) => {
    if (confirm("Ви впевнені, що хочете видалити цього гравця зі списку голосування?")) {
      try {
        await deleteVotingCandidate(candidateId)
        setVotingCandidates(votingCandidates.filter((c) => c.id !== candidateId))
      } catch (error) {
        console.error("Error deleting candidate:", error)
      }
    }
  }

  const handleStartEditCandidate = (candidate: VotingCandidate) => {
    setEditingCandidateId(candidate.id)
    setEditingCandidateName(candidate.player_name)
  }

  const handleSaveEditCandidate = async () => {
    if (!editingCandidateId) return

    setLoading(true)
    try {
      const updated = await updateVotingCandidate(editingCandidateId, editingCandidateName)
      setVotingCandidates(
        votingCandidates.map((c) => (c.id === editingCandidateId ? updated : c))
      )
      setEditingCandidateId(null)
      setEditingCandidateName("")
    } catch (error) {
      console.error("Error editing candidate:", error)
      alert("Помилка редагування гравця: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  // Player handlers
  const handlePlayerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0) {
      alert("Спочатку створіть чемпіонат")
      return
    }

    if (!playerForm.team) {
      alert("Оберіть команду для гравця")
      return
    }

    setLoading(true)
    try {
      const playerData = { ...playerForm, championship_id: currentChampionshipId }
      if (editingPlayer) {
        await updatePlayer(editingPlayer.id, playerData)
        setEditingPlayer(null)
      } else {
        await addPlayer(playerData)
      }
      setPlayerForm({ name: "", team: "", goals: 0 })
      await loadData()
    } catch (error) {
      console.error("Error saving player:", error)
      alert("Помилка при збереженні гравця: " + getErrorMessage(error))
    }
    setLoading(false)
  }

  const handleDeletePlayer = async (id: number) => {
    if (confirm("Ви впевнені, що хочете видалити цього гравця?")) {
      try {
        await deletePlayer(id)
        await loadData()
      } catch (error) {
        console.error("Error deleting player:", error)
      }
    }
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {championships.length > 0 ? (
            <Select
              value={currentChampionshipId.toString()}
              onValueChange={(value) => onChampionshipChange(Number.parseInt(value))}
            >
              <SelectTrigger className="w-full sm:w-48 bg-white/10 border-2 border-blue-400/30 text-white backdrop-blur-md hover:bg-white/20 transition-all duration-300 rounded-xl shadow-lg">
                <SelectValue placeholder="Оберіть чемпіонат" />
              </SelectTrigger>
              <SelectContent className="bg-slate-900/95 backdrop-blur-md border-blue-400/30">
                {championships.map((championship) => (
                  <SelectItem
                    key={championship.id}
                    value={championship.id.toString()}
                    className="text-white hover:bg-slate-800/30"
                  >
                    {championship.name} ({championship.season})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="text-sm text-blue-200">Немає створених чемпіонатів</div>
          )}
        </div>
        <Button
          variant="outline"
          onClick={onLogout}
          className="bg-red-600/20 border-red-400/30 text-white hover:bg-red-600/30 w-full sm:w-auto"
        >
          Вийти
        </Button>
      </div>

      <Tabs defaultValue="championships" className="w-full">
        <TabsList className="flex w-full justify-start gap-6 border-b border-slate-200 bg-transparent h-auto p-0 rounded-none mb-6">
          <TabsTrigger
            value="championships"
            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-0 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all flex items-center gap-1.5"
          >
            <Settings className="h-4 w-4" />
            <span>Чемпіонати</span>
          </TabsTrigger>
          <TabsTrigger
            value="teams"
            disabled={!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0}
            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-0 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Users className="h-4 w-4" />
            <span>Команди</span>
          </TabsTrigger>
          <TabsTrigger
            value="matches"
            disabled={!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0}
            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-0 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Calendar className="h-4 w-4" />
            <span>Матчі</span>
          </TabsTrigger>
          <TabsTrigger
            value="players"
            disabled={!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0}
            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-0 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Target className="h-4 w-4" />
            <span>Гравці</span>
          </TabsTrigger>
          <TabsTrigger
            value="votings"
            disabled={!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0}
            className="bg-transparent border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent rounded-none px-0 py-2.5 text-xs sm:text-sm font-semibold text-slate-500 data-[state=active]:text-slate-950 shadow-none transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            <Star className="h-4 w-4" />
            <span>Лев матчу</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="championships" className="space-y-4">
          <form
            onSubmit={handleChampionshipSubmit}
            className="space-y-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="championship-name" className="text-slate-700 font-semibold text-xs">
                  Назва чемпіонату
                </Label>
                <Input
                  id="championship-name"
                  value={championshipForm.name}
                  onChange={(e) => setChampionshipForm({ ...championshipForm, name: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="championship-season" className="text-slate-700 font-semibold text-xs">
                  Сезон
                </Label>
                <Input
                  id="championship-season"
                  value={championshipForm.season}
                  onChange={(e) => setChampionshipForm({ ...championshipForm, season: e.target.value })}
                  required
                  className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                />
              </div>
              <div>
                <Label htmlFor="tournament-type" className="text-slate-700 font-semibold text-xs">
                  Тип турніру
                </Label>
                <Select
                  value={championshipForm.tournament_type}
                  onValueChange={(value) =>
                    setChampionshipForm({ ...championshipForm, tournament_type: value as "league" | "cup" })
                  }
                >
                  <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1">
                    <SelectValue placeholder="Оберіть тип" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-slate-200">
                    <SelectItem value="league" className="text-slate-900 hover:bg-slate-50">
                      Ліга
                    </SelectItem>
                    <SelectItem value="cup" className="text-slate-900 hover:bg-slate-50">
                      Кубок
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <input
                  type="checkbox"
                  id="is-active"
                  checked={championshipForm.is_active}
                  onChange={(e) => setChampionshipForm({ ...championshipForm, is_active: e.target.checked })}
                  className="w-4 h-4 text-slate-900 bg-slate-50 border-slate-200 rounded"
                />
                <Label htmlFor="is-active" className="text-slate-700 font-semibold text-xs">
                  Активний
                </Label>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                type="submit"
                disabled={loading}
                className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg h-10 transition-colors px-6"
              >
                <Plus className="h-4 w-4 mr-2" />
                {editingChampionship ? "Оновити" : "Додати"} чемпіонат
              </Button>
              {editingChampionship && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setEditingChampionship(null)
                    setChampionshipForm({ name: "", season: "", is_active: false, tournament_type: "league" })
                  }}
                  className="bg-slate-100 border border-slate-200 text-slate-900 hover:bg-slate-200 rounded-lg h-10 px-4"
                >
                  Скасувати
                </Button>
              )}
            </div>
          </form>

          <div className="space-y-3">
            {championships.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
                Немає створених чемпіонатів. Створіть перший чемпіонат вище.
              </div>
            ) : (
              championships.map((championship) => (
                <div
                  key={championship.id}
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex-1">
                    <div className="font-bold text-slate-900 text-base">{championship.name}</div>
                    <div className="text-xs text-slate-500 font-medium mt-1">
                      Сезон: {championship.season} | {championship.is_active ? "Активний" : "Неактивний"} |{" "}
                      {championship.tournament_type === "league" ? "Ліга" : "Кубок"}
                    </div>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingChampionship(championship)
                        setChampionshipForm({
                          name: championship.name,
                          season: championship.season,
                          is_active: championship.is_active,
                          tournament_type: championship.tournament_type,
                        })
                      }}
                      className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDeleteChampionship(championship.id)}
                      className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg flex-1 sm:flex-none"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          {!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
              Спочатку створіть чемпіонат
            </div>
          ) : (
            <>
              <div className="bg-slate-100 p-4 rounded-xl mb-4 border border-slate-200 text-slate-900 text-xs sm:text-sm">
                <div>
                  <strong>Поточний чемпіонат:</strong> {championships.find((c) => c.id === currentChampionshipId)?.name}{" "}
                  ({championships.find((c) => c.id === currentChampionshipId)?.season})
                </div>
                <div className="text-slate-500 mt-1">
                  Команди будуть додані до цього чемпіонату
                </div>
              </div>
              <form
                onSubmit={handleTeamSubmit}
                className="space-y-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="team-name" className="text-slate-700 font-semibold text-xs">
                      Назва команди
                    </Label>
                    <Input
                      id="team-name"
                      value={teamForm.name}
                      onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="team-logo" className="text-slate-700 font-semibold text-xs">
                      URL логотипу
                    </Label>
                    <Input
                      id="team-logo"
                      value={teamForm.logo}
                      onChange={(e) => setTeamForm({ ...teamForm, logo: e.target.value })}
                      placeholder="https://example.com/logo.png"
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg h-10 transition-colors px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingTeam ? "Оновити" : "Додати"} команду
                  </Button>
                  {editingTeam && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingTeam(null)
                        setTeamForm({ name: "", logo: "" })
                      }}
                      className="bg-slate-100 border border-slate-200 text-slate-900 hover:bg-slate-200 rounded-lg h-10 px-4"
                    >
                      Скасувати
                    </Button>
                  )}
                </div>
              </form>

              <div className="space-y-3">
                {teams.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
                    Немає команд. Додайте першу команду вище.
                  </div>
                ) : (
                  teams.map((team) => (
                    <div
                      key={team.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all"
                    >
                      <div className="flex items-center gap-4 flex-1">
                        <img
                          src={team.logo || "/placeholder.svg?height=32&width=32"}
                          alt={team.name}
                          className="h-10 w-10 rounded-full border border-slate-200 object-cover"
                        />
                        <span className="font-bold text-slate-900 text-base">{team.name}</span>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTeam(team)
                            setTeamForm({ name: team.name, logo: team.logo || "" })
                          }}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTeam(team.id)}
                          className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="matches" className="space-y-4">
          {!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0 ? (
            <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
              Спочатку створіть чемпіонат
            </div>
          ) : teams.length < 2 ? (
            <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
              Додайте принаймні 2 команди для створення матчів
            </div>
          ) : (
            <>
              <div className="bg-slate-100 p-4 rounded-xl mb-4 border border-slate-200 text-slate-900 text-xs sm:text-sm">
                <div>
                  <strong>Поточний чемпіонат:</strong> {championships.find((c) => c.id === currentChampionshipId)?.name}{" "}
                  ({championships.find((c) => c.id === currentChampionshipId)?.season})
                </div>
                <div className="text-slate-500 mt-1">Матчі будуть додані до цього чемпіонату</div>
              </div>
              <form
                onSubmit={handleMatchSubmit}
                className="space-y-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-xl shadow-sm"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="match-round" className="text-slate-700 font-semibold text-xs">
                      {currentChampionship?.tournament_type === "cup" ? "Стадія" : "Тур"}
                    </Label>
                    {currentChampionship?.tournament_type === "cup" ? (
                      <Select
                        value={matchForm.cup_stage}
                        onValueChange={(value) => setMatchForm({ ...matchForm, cup_stage: value })}
                      >
                        <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1">
                          <SelectValue placeholder="Оберіть стадію" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-slate-200">
                          {CUP_STAGES.map((stage) => (
                            <SelectItem key={stage} value={stage} className="text-slate-900 hover:bg-slate-50">
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="match-round"
                        type="number"
                        min="1"
                        value={matchForm.round || ""}
                        onChange={(e) => setMatchForm({ ...matchForm, round: Number(e.target.value) || 1 })}
                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                      />
                    )}
                  </div>
                  <div>
                    <Label htmlFor="match-date" className="text-slate-700 font-semibold text-xs">
                      Дата
                    </Label>
                    <Input
                      id="match-date"
                      type="date"
                      value={matchForm.date}
                      onChange={(e) => setMatchForm({ ...matchForm, date: e.target.value })}
                      required
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="match-time" className="text-slate-700 font-semibold text-xs">
                      Час матчу
                    </Label>
                    <Input
                      id="match-time"
                      type="time"
                      value={matchForm.match_time}
                      onChange={(e) => setMatchForm({ ...matchForm, match_time: e.target.value })}
                      className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="home-team" className="text-slate-700 font-semibold text-xs">
                      Господарі
                    </Label>
                    <Select
                      value={matchForm.home_team}
                      onValueChange={(value) => setMatchForm({ ...matchForm, home_team: value })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1">
                        <SelectValue placeholder="Оберіть команду" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.name} className="text-slate-900 hover:bg-slate-50">
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="away-team" className="text-slate-700 font-semibold text-xs">
                      Гості
                    </Label>
                    <Select
                      value={matchForm.away_team}
                      onValueChange={(value) => setMatchForm({ ...matchForm, away_team: value })}
                    >
                      <SelectTrigger className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1">
                        <SelectValue placeholder="Оберіть команду" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {teams
                          .filter((team) => team.name !== matchForm.home_team)
                          .map((team) => (
                            <SelectItem key={team.id} value={team.name} className="text-slate-900 hover:bg-slate-50">
                              {team.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Technical Defeat Section */}
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-slate-900">
                  <div className="flex items-center space-x-2 mb-3">
                    <input
                      type="checkbox"
                      id="is-technical-defeat"
                      checked={matchForm.is_technical_defeat}
                      onChange={(e) => setMatchForm({ ...matchForm, is_technical_defeat: e.target.checked })}
                      className="w-4 h-4 text-red-600 bg-slate-50 border-red-300 rounded"
                    />
                    <Label
                      htmlFor="is-technical-defeat"
                      className="text-red-900 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                    >
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      Технічна поразка
                    </Label>
                  </div>
                  {matchForm.is_technical_defeat && (
                    <div>
                      <Label htmlFor="technical-winner" className="text-red-950 font-semibold text-[11px]">
                        Переможець (технічна перемога)
                      </Label>
                      <Select
                        value={matchForm.technical_winner}
                        onValueChange={(value) => setMatchForm({ ...matchForm, technical_winner: value })}
                      >
                        <SelectTrigger className="bg-white border-red-200 text-slate-900 rounded-lg h-10 mt-1">
                          <SelectValue placeholder="Оберіть переможця" />
                        </SelectTrigger>
                        <SelectContent className="bg-white border-red-200">
                          {matchForm.home_team && (
                            <SelectItem value={matchForm.home_team} className="text-slate-900 hover:bg-red-50">
                              {matchForm.home_team}
                            </SelectItem>
                          )}
                          {matchForm.away_team && (
                            <SelectItem value={matchForm.away_team} className="text-slate-900 hover:bg-red-50">
                              {matchForm.away_team}
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                {!matchForm.is_technical_defeat && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="home-score" className="text-slate-700 font-semibold text-xs">
                        Голи господарів
                      </Label>
                      <Input
                        id="home-score"
                        type="number"
                        min="0"
                        value={matchForm.home_score}
                        onChange={(e) => setMatchForm({ ...matchForm, home_score: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="away-score" className="text-slate-700 font-semibold text-xs">
                        Голи гостей
                      </Label>
                      <Input
                        id="away-score"
                        type="number"
                        min="0"
                        value={matchForm.away_score}
                        onChange={(e) => setMatchForm({ ...matchForm, away_score: e.target.value })}
                        className="bg-slate-50 border-slate-200 text-slate-900 rounded-lg h-10 mt-1"
                      />
                    </div>
                    <div className="flex items-center space-x-2 pt-6">
                      <input
                        type="checkbox"
                        id="is-finished"
                        checked={matchForm.is_finished}
                        onChange={(e) => setMatchForm({ ...matchForm, is_finished: e.target.checked })}
                        className="w-4 h-4 text-slate-900 bg-slate-50 border-slate-200 rounded"
                      />
                      <Label htmlFor="is-finished" className="text-slate-700 font-semibold text-xs cursor-pointer">
                        Завершено
                      </Label>
                    </div>
                  </div>
                )}

                {/* Penalty Shootout Section */}
                {currentChampionship?.tournament_type === "cup" &&
                  matchForm.is_finished &&
                  !matchForm.is_technical_defeat && (
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-slate-900">
                      <div className="flex items-center space-x-2 mb-3">
                        <input
                          type="checkbox"
                          id="finished-after-penalties"
                          checked={matchForm.finished_after_penalties}
                          onChange={(e) => setMatchForm({ ...matchForm, finished_after_penalties: e.target.checked })}
                          className="w-4 h-4 text-amber-700 bg-slate-50 border-amber-300 rounded"
                        />
                        <Label
                          htmlFor="finished-after-penalties"
                          className="text-amber-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
                        >
                          <Crosshair className="h-4 w-4 text-amber-600" />
                          Матч закінчився після серії пенальті
                        </Label>
                      </div>

                      {matchForm.finished_after_penalties && (
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-3">
                          <div>
                            <Label htmlFor="penalty-home" className="text-amber-900 font-semibold text-xs">
                              Пенальті господарів
                            </Label>
                            <Input
                              id="penalty-home"
                              type="number"
                              min="0"
                              value={matchForm.penalty_home}
                              onChange={(e) => setMatchForm({ ...matchForm, penalty_home: e.target.value })}
                              className="bg-white border-amber-200 text-slate-900 rounded-lg h-10 mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="penalty-away" className="text-amber-900 font-semibold text-xs">
                              Пенальті гостей
                            </Label>
                            <Input
                              id="penalty-away"
                              type="number"
                              min="0"
                              value={matchForm.penalty_away}
                              onChange={(e) => setMatchForm({ ...matchForm, penalty_away: e.target.value })}
                              className="bg-white border-amber-200 text-slate-900 rounded-lg h-10 mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="penalty-winner" className="text-amber-900 font-semibold text-xs">
                              Переможець по пенальті
                            </Label>
                            <Select
                              value={matchForm.penalty_winner}
                              onValueChange={(value) => setMatchForm({ ...matchForm, penalty_winner: value })}
                            >
                              <SelectTrigger className="bg-white border-amber-200 text-slate-900 rounded-lg h-10 mt-1">
                                <SelectValue placeholder="Оберіть переможця" />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-amber-200">
                                {matchForm.home_team && (
                                  <SelectItem value={matchForm.home_team} className="text-slate-900 hover:bg-amber-50">
                                    {matchForm.home_team}
                                  </SelectItem>
                                )}
                                {matchForm.away_team && (
                                  <SelectItem value={matchForm.away_team} className="text-slate-900 hover:bg-amber-50">
                                    {matchForm.away_team}
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    type="submit"
                    disabled={loading || !matchForm.home_team || !matchForm.away_team}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg h-10 transition-colors px-6"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingMatch ? "Оновити" : "Додати"} матч
                  </Button>
                  {editingMatch && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingMatch(null)
                        setMatchForm({
                          round: 1,
                          date: "",
                          home_team: "",
                          away_team: "",
                          home_score: "",
                          away_score: "",
                          is_finished: false,
                          match_time: "",
                          cup_stage: "",
                          is_technical_defeat: false,
                          technical_winner: "",
                          penalty_home: "",
                          penalty_away: "",
                          penalty_winner: "",
                          finished_after_penalties: false,
                        })
                      }}
                  className="bg-slate-100 border border-slate-200 text-slate-900 hover:bg-slate-200 rounded-lg h-10 px-4"
                    >
                      Скасувати
                    </Button>
                  )}
                </div>
              </form>

          <div className="space-y-3">
            {matches.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-white border border-slate-200 rounded-xl">
                Немає матчів. Додайте перший матч вище.
              </div>
            ) : (
              matches.map((match) => (
                <div
                  key={match.id}
                  className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                    <div className="flex-1">
                      <div className="font-bold text-slate-900 text-base mb-1.5">
                        {currentChampionship?.tournament_type === "cup" && match.cup_stage
                          ? `${match.cup_stage}: ${match.home_team} - ${match.away_team}`
                          : `Тур ${match.round}: ${match.home_team} - ${match.away_team}`}
                      </div>
                      <div className="text-xs text-slate-500 font-medium flex flex-wrap items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          {match.date}
                        </span>
                        {match.match_time && (
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            {match.match_time}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            match.is_finished
                              ? match.is_technical_defeat
                                ? "bg-red-50 text-red-700 border border-red-150"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-150"
                              : "bg-blue-50 text-blue-700 border border-blue-150"
                          }`}
                        >
                          {match.is_finished
                            ? match.is_technical_defeat
                              ? `Технічна поразка: ${match.technical_winner === match.home_team ? "+:-" : "-:+"}`
                              : `${match.home_score} - ${match.away_score}${match.penalty_home !== null && match.penalty_away !== null ? ` (${match.penalty_home}-${match.penalty_away} пен.)` : ""}`
                            : "Не зіграно"}
                        </span>
                        {match.is_technical_defeat && (
                          <span className="flex items-center gap-1 text-red-700 font-medium">
                            <AlertTriangle className="h-3 w-3 text-red-500" />
                            Технічна поразка
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto flex-wrap">
                      {match.is_finished && !match.is_technical_defeat && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedMatchForGoals(match)
                            setSelectedMatchForVoting(null)
                            setGoalForm({
                              player_name: "",
                              team_name: match.home_team,
                              minute: "",
                              goal_type: "regular",
                            })
                            loadMatchGoals(match.id)
                          }}
                          className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                        >
                          <Trophy className="h-4 w-4 mr-1.5 text-slate-400" />
                          Голи
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelectedMatchForVoting(match)
                          setSelectedMatchForGoals(null)
                          setCandidateForm({
                            player_name: "",
                            team_name: match.home_team,
                          })
                          loadMatchVoting(match.id)
                        }}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                      >
                        <Star className="h-4 w-4 mr-1.5 text-slate-400" />
                        Лев матчу
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingMatch(match)
                          setMatchForm({
                            round: match.round,
                            date: match.date,
                            home_team: match.home_team,
                            away_team: match.away_team,
                            home_score: match.home_score?.toString() || "",
                            away_score: match.away_score?.toString() || "",
                            is_finished: match.is_finished,
                            match_time: match.match_time || "",
                            cup_stage: match.cup_stage || "",
                            is_technical_defeat: match.is_technical_defeat || false,
                            technical_winner: match.technical_winner || "",
                            penalty_home: match.penalty_home?.toString() || "",
                            penalty_away: match.penalty_away?.toString() || "",
                            penalty_winner: match.penalty_winner || "",
                            finished_after_penalties: match.penalty_home !== null && match.penalty_away !== null,
                          })
                        }}
                        className="border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                      >
                        <Edit className="h-4 w-4 text-slate-400" />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDeleteMatch(match.id)}
                        className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded-lg flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Lion of the Match Voting Management */}
                  {selectedMatchForVoting?.id === match.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900 space-y-6">
                      <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                        Голосування: Лев матчу · {match.home_team} vs {match.away_team}
                      </h4>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 border-b border-slate-200">
                        {/* Time Config */}
                        <form onSubmit={handleVotingTimeSubmit} className="space-y-3">
                          <h5 className="font-semibold text-xs text-slate-700">Час проведення</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="vote-start-time" className="text-slate-600 text-xs">Початок</Label>
                              <Input
                                id="vote-start-time"
                                type="datetime-local"
                                value={votingTimeForm.start_time}
                                onChange={(e) => setVotingTimeForm({ ...votingTimeForm, start_time: e.target.value })}
                                className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="vote-end-time" className="text-slate-600 text-xs">Завершення</Label>
                              <Input
                                id="vote-end-time"
                                type="datetime-local"
                                value={votingTimeForm.end_time}
                                onChange={(e) => setVotingTimeForm({ ...votingTimeForm, end_time: e.target.value })}
                                className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => applyPreset("match24", match)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              📅 Матч +24г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("match48", match)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              📅 Матч +48г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("now24", match)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              ⚡ Зараз +24г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("now48", match)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              ⚡ Зараз +48г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("clear", match)}
                              className="text-[10px] font-medium text-red-650 hover:bg-red-50 px-2 py-1 rounded transition-all bg-transparent ml-auto"
                            >
                              ❌ Очистити
                            </button>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="submit"
                              disabled={loading}
                              size="sm"
                              className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-3 rounded-lg"
                            >
                              Зберегти час
                            </Button>
                          </div>
                        </form>

                        {/* Status Toggle */}
                        <div className="flex flex-col justify-between space-y-3">
                          <div>
                            <h5 className="font-semibold text-xs text-slate-700">Статус голосування</h5>
                            <p className="text-xs text-slate-500 mt-1">
                              Голосування наразі:{" "}
                              <span className={`font-bold ${matchVoting?.is_active ? "text-emerald-600" : "text-red-500"}`}>
                                {matchVoting?.is_active ? "ВІДКРИТЕ" : "ЗАКРИТЕ"}
                              </span>
                            </p>
                          </div>
                          <div>
                            <Button
                              type="button"
                              onClick={handleToggleVotingActiveState}
                              disabled={loading}
                              size="sm"
                              className={`text-white text-xs h-8 px-4 rounded-lg font-medium ${
                                matchVoting?.is_active
                                  ? "bg-red-600 hover:bg-red-700"
                                  : "bg-emerald-600 hover:bg-emerald-700"
                              }`}
                            >
                              {matchVoting?.is_active ? "Закрити голосування" : "Відкрити голосування"}
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Add Candidate Form */}
                      <form onSubmit={handleAddCandidateSubmit} className="space-y-3 pb-4 border-b border-slate-200">
                        <h5 className="font-semibold text-xs text-slate-700">Додати кандидата</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="candidate-player-name" className="text-slate-600 text-xs">Ім'я гравця</Label>
                            <Input
                              id="candidate-player-name"
                              value={candidateForm.player_name}
                              onChange={(e) => setCandidateForm({ ...candidateForm, player_name: e.target.value })}
                              required
                              placeholder="Введіть ім'я гравця"
                              className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs"
                            />
                          </div>
                          <div>
                            <Label htmlFor="candidate-team-name" className="text-slate-600 text-xs">Команда</Label>
                            <Select
                              value={candidateForm.team_name}
                              onValueChange={(value) => setCandidateForm({ ...candidateForm, team_name: value })}
                            >
                              <SelectTrigger className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value={match.home_team} className="text-slate-900">
                                  {match.home_team} (Господарі)
                                </SelectItem>
                                <SelectItem value={match.away_team} className="text-slate-900">
                                  {match.away_team} (Гості)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-3 rounded-lg"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Додати гравця
                        </Button>
                      </form>

                      {/* Candidates Lists */}
                      <div className="space-y-4">
                        <h5 className="font-semibold text-xs text-slate-700">Список кандидатів</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Home Candidates */}
                          <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-white">
                            <h6 className="font-bold text-xs text-slate-800 pb-1 border-b border-slate-100">
                              {match.home_team}
                            </h6>
                            {votingCandidates.filter(c => c.team_name === match.home_team).length === 0 ? (
                              <div className="text-xs text-slate-400 py-2">Гравців не додано</div>
                            ) : (
                              <div className="space-y-1.5">
                                {votingCandidates.filter(c => c.team_name === match.home_team).map((candidate) => (
                                  <div key={candidate.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                    {editingCandidateId === candidate.id ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Input
                                          value={editingCandidateName}
                                          onChange={(e) => setEditingCandidateName(e.target.value)}
                                          className="border-slate-300 text-slate-900 rounded h-7 text-xs px-2 py-0.5 flex-1"
                                        />
                                        <Button size="sm" onClick={handleSaveEditCandidate} className="bg-slate-900 text-white text-[10px] h-7 px-2">Зберегти</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingCandidateId(null)} className="h-7 px-2 text-[10px]">Скасувати</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium text-slate-900">{candidate.player_name}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-500 font-semibold mr-1">{candidate.votes || 0} гол.</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStartEditCandidate(candidate)}
                                            className="h-6 w-6 p-0 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                            type="button"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteCandidate(candidate.id)}
                                            className="h-6 w-6 p-0 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                            type="button"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Away Candidates */}
                          <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-white">
                            <h6 className="font-bold text-xs text-slate-800 pb-1 border-b border-slate-100">
                              {match.away_team}
                            </h6>
                            {votingCandidates.filter(c => c.team_name === match.away_team).length === 0 ? (
                              <div className="text-xs text-slate-400 py-2">Гравців не додано</div>
                            ) : (
                              <div className="space-y-1.5">
                                {votingCandidates.filter(c => c.team_name === match.away_team).map((candidate) => (
                                  <div key={candidate.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                    {editingCandidateId === candidate.id ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Input
                                          value={editingCandidateName}
                                          onChange={(e) => setEditingCandidateName(e.target.value)}
                                          className="border-slate-300 text-slate-900 rounded h-7 text-xs px-2 py-0.5 flex-1"
                                        />
                                        <Button size="sm" onClick={handleSaveEditCandidate} className="bg-slate-900 text-white text-[10px] h-7 px-2">Зберегти</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingCandidateId(null)} className="h-7 px-2 text-[10px]">Скасувати</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium text-slate-900">{candidate.player_name}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-500 font-semibold mr-1">{candidate.votes || 0} гол.</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStartEditCandidate(candidate)}
                                            className="h-6 w-6 p-0 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                            type="button"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteCandidate(candidate.id)}
                                            className="h-6 w-6 p-0 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                            type="button"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setSelectedMatchForVoting(null)}
                          className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-9 text-xs"
                        >
                          Закрити панель голосування
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Match Goals Management */}
                  {selectedMatchForGoals?.id === match.id && (
                    <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-900">
                      <h4 className="font-bold text-slate-900 text-sm mb-4 flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-slate-500" />
                        Автори голів: {match.home_team} {match.home_score} - {match.away_score} {match.away_team}
                      </h4>

                          {/* Add Goal Form */}
                          <form onSubmit={handleAddMatchGoal} className="space-y-4 mb-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="goal-player-name" className="text-slate-700 font-medium text-sm">
                                  Ім'я гравця
                                </Label>
                                <Input
                                  id="goal-player-name"
                                  value={goalForm.player_name}
                                  onChange={(e) => setGoalForm({ ...goalForm, player_name: e.target.value })}
                                  required
                                  className="border border-slate-200 text-slate-900 rounded-lg h-10"
                                />
                              </div>
                              <div>
                                <Label htmlFor="goal-team-name" className="text-slate-700 font-medium text-sm">
                                  Команда
                                </Label>
                                <Select
                                  value={goalForm.team_name}
                                  onValueChange={(value) => setGoalForm({ ...goalForm, team_name: value })}
                                >
                                  <SelectTrigger className="border border-slate-200 text-slate-900 rounded-lg h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-slate-200">
                                    <SelectItem value={match.home_team} className="text-slate-900">
                                      {match.home_team}
                                    </SelectItem>
                                    <SelectItem value={match.away_team} className="text-slate-900">
                                      {match.away_team}
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div>
                                <Label htmlFor="goal-minute" className="text-slate-700 font-medium text-sm">
                                  Хвилина
                                </Label>
                                <Input
                                  id="goal-minute"
                                  type="number"
                                  min="1"
                                  max="120"
                                  value={goalForm.minute}
                                  onChange={(e) => setGoalForm({ ...goalForm, minute: e.target.value })}
                                  className="border border-slate-200 text-slate-900 rounded-lg h-10"
                                />
                              </div>
                              <div>
                                <Label htmlFor="goal-type" className="text-slate-700 font-medium text-sm">
                                  Тип голу
                                </Label>
                                <Select
                                  value={goalForm.goal_type}
                                  onValueChange={(value) =>
                                    setGoalForm({ ...goalForm, goal_type: value as "regular" | "penalty" | "own_goal" })
                                  }
                                >
                                  <SelectTrigger className="border border-slate-200 text-slate-900 rounded-lg h-10">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent className="bg-white border-slate-200">
                                    <SelectItem value="regular" className="text-slate-900">
                                      Звичайний
                                    </SelectItem>
                                    <SelectItem value="penalty" className="text-slate-900">
                                      Пенальті
                                    </SelectItem>
                                    <SelectItem value="own_goal" className="text-slate-900">
                                      Автогол
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-3">
                              <Button
                                type="submit"
                                disabled={loading}
                                className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg h-10"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Додати гол
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => setSelectedMatchForGoals(null)}
                                className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-10"
                              >
                                Закрити
                              </Button>
                            </div>
                          </form>

                          {/* Goals List */}
                          <div className="space-y-2">
                            <h5 className="font-semibold text-slate-700 text-sm">Список голів:</h5>
                            {matchGoals.length === 0 ? (
                              <div className="text-center py-4 text-slate-400 text-sm">Немає доданих голів</div>
                            ) : (
                              <div className="space-y-2">
                                {matchGoals.map((goal) => (
                                  <div
                                    key={goal.id}
                                    className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                                  >
                                    <div className="text-sm">
                                      <span className="font-semibold text-slate-900">{goal.player_name}</span>
                                      <span className="text-slate-500 ml-2">({goal.team_name})</span>
                                      {goal.minute && <span className="text-slate-600 ml-2">{goal.minute}'</span>}
                                      {goal.goal_type === "penalty" && (
                                        <span className="text-amber-600 ml-1">(пен.)</span>
                                      )}
                                      {goal.goal_type === "own_goal" && (
                                        <span className="text-red-500 ml-1">(автогол)</span>
                                      )}
                                    </div>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => handleDeleteMatchGoal(goal.id)}
                                      className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Players Tab */}
        <TabsContent value="players" className="space-y-4">
          {!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-slate-400 bg-white border border-slate-200 rounded-lg">
              Спочатку створіть чемпіонат
            </div>
          ) : teams.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-slate-400 bg-white border border-slate-200 rounded-lg">
              Додайте команди для створення гравців
            </div>
          ) : (
            <>
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-900 font-medium">
                  <strong>Поточний чемпіонат:</strong> {championships.find((c) => c.id === currentChampionshipId)?.name}{" "}
                  ({championships.find((c) => c.id === currentChampionshipId)?.season})
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Гравці будуть додані до цього чемпіонату
                </div>
              </div>
              <form
                onSubmit={handlePlayerSubmit}
                className="space-y-4 p-4 sm:p-6 bg-white border border-slate-200 rounded-lg"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="player-name" className="text-slate-700 font-medium text-sm">
                      Ім'я гравця
                    </Label>
                    <Input
                      id="player-name"
                      value={playerForm.name}
                      onChange={(e) => setPlayerForm({ ...playerForm, name: e.target.value })}
                      required
                      className="border border-slate-200 text-slate-900 rounded-lg h-10"
                    />
                  </div>
                  <div>
                    <Label htmlFor="player-team" className="text-slate-700 font-medium text-sm">
                      Команда
                    </Label>
                    <Select
                      value={playerForm.team}
                      onValueChange={(value) => setPlayerForm({ ...playerForm, team: value })}
                    >
                      <SelectTrigger className="border border-slate-200 text-slate-900 rounded-lg h-10">
                        <SelectValue placeholder="Оберіть команду" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-slate-200">
                        {teams.map((team) => (
                          <SelectItem key={team.id} value={team.name} className="text-slate-900">
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="player-goals" className="text-slate-700 font-medium text-sm">
                      Голи
                    </Label>
                    <Input
                      id="player-goals"
                      type="number"
                      min="0"
                      value={playerForm.goals === 0 ? "" : playerForm.goals}
                      onChange={(e) => {
                        const val = e.target.value
                        setPlayerForm({ ...playerForm, goals: val === "" ? 0 : Number.parseInt(val) })
                      }}
                      className="border border-slate-200 text-slate-900 rounded-lg h-10"
                    />
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    type="submit"
                    disabled={loading || !playerForm.team}
                    className="bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-lg h-10"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {editingPlayer ? "Оновити" : "Додати"} гравця
                  </Button>
                  {editingPlayer && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingPlayer(null)
                        setPlayerForm({ name: "", team: "", goals: 0 })
                      }}
                      className="border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg h-10"
                    >
                      Скасувати
                    </Button>
                  )}
                </div>
              </form>

              <div className="space-y-2">
                {players.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 bg-white border border-slate-200 rounded-lg">
                    Немає гравців. Додайте першого гравця вище.
                  </div>
                ) : (
                  players.map((player) => (
                    <div
                      key={player.id}
                      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-white border border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="font-semibold text-slate-900">{player.name}</div>
                        <div className="text-sm text-slate-500">
                          {player.team} · {player.goals} голів
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingPlayer(player)
                            setPlayerForm({ name: player.name, team: player.team, goals: player.goals })
                          }}
                          className="border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-lg flex-1 sm:flex-none"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeletePlayer(player.id)}
                          className="bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg flex-1 sm:flex-none"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        {/* Lion of the Match Voting Tab */}
        <TabsContent value="votings" className="space-y-4">
          {!currentChampionshipId || currentChampionshipId === 0 || championships.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-slate-400 bg-white border border-slate-200 rounded-lg">
              Спочатку створіть чемпіонат
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-8 sm:py-12 text-slate-400 bg-white border border-slate-200 rounded-lg">
              Додайте матчі для керування голосуваннями
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="text-sm text-slate-900 font-semibold">
                  <strong>Керування голосуванням «Лев матчу»</strong>
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Оберіть матч нижче, щоб додати кандидатів та відкрити/закрити голосування.
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Matches List */}
                <div className="lg:col-span-1 border border-slate-200 rounded-xl bg-white overflow-hidden shadow-sm h-[500px] flex flex-col">
                  <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Матчі чемпіонату</span>
                    <label className="flex items-center gap-1.5 cursor-pointer select-none text-[10px] font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={hideCompletedVotings}
                        onChange={(e) => setHideCompletedVotings(e.target.checked)}
                        className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 h-3.5 w-3.5"
                      />
                      <span>Приховати завершені</span>
                    </label>
                  </div>
                  <div className="divide-y divide-slate-100 overflow-y-auto flex-1">
                    {matches
                      .filter((match) => {
                        if (!hideCompletedVotings) return true
                        const voting = championshipVotings.find((v) => v.match_id === match.id)
                        if (!voting) return true
                        if (voting.is_active) return true
                        const now = new Date()
                        const endTime = voting.end_time ? new Date(voting.end_time) : null
                        if (endTime && endTime > now) return true
                        return false
                      })
                      .map((match) => (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => {
                            setSelectedMatchForVoting(match)
                            setCandidateForm({
                              player_name: "",
                              team_name: match.home_team,
                            })
                            loadMatchVoting(match.id)
                          }}
                          className={`w-full text-left p-3 hover:bg-slate-50 transition-colors text-xs space-y-1.5 ${
                            selectedMatchForVoting?.id === match.id ? "bg-slate-100/80 font-medium" : ""
                          }`}
                        >
                          <div className="font-bold text-slate-900 flex justify-between items-center">
                            <span>{match.home_team} — {match.away_team}</span>
                            <span className="text-[10px] text-slate-400">
                              {currentChampionship?.tournament_type === "cup" && match.cup_stage
                                ? match.cup_stage
                                : `Тур ${match.round}`}
                            </span>
                          </div>
                          <div className="text-[10px] text-slate-500 flex items-center justify-between">
                            <span>{match.date} {match.match_time}</span>
                            <span className="font-semibold text-slate-600">
                              {match.is_finished ? `${match.home_score}:${match.away_score}` : "Не зіграно"}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Voting Settings / Candidates Manager */}
                <div className="lg:col-span-2">
                  {selectedMatchForVoting ? (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                        <div>
                          <h4 className="font-bold text-slate-950 text-base">
                            {selectedMatchForVoting.home_team} vs {selectedMatchForVoting.away_team}
                          </h4>
                          <p className="text-xs text-slate-500 mt-1">
                            {selectedMatchForVoting.date} {selectedMatchForVoting.match_time && `· ${selectedMatchForVoting.match_time}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-slate-500">Статус:</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            matchVoting?.is_active ? "bg-emerald-100 text-emerald-800 border-emerald-200" : "bg-red-100 text-red-800 border-red-200"
                          }`}>
                            {matchVoting?.is_active ? "ВІДКРИТЕ" : "ЗАКРИТЕ"}
                          </span>
                        </div>
                      </div>

                      {/* Config & Toggle */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pb-6 border-b border-slate-200">
                        {/* Time Settings */}
                        <form onSubmit={handleVotingTimeSubmit} className="space-y-3">
                          <h5 className="font-bold text-xs text-slate-800">Час проведення голосування</h5>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <Label htmlFor="voting-tab-start-time" className="text-slate-600 text-[11px] font-semibold">Початок</Label>
                              <Input
                                id="voting-tab-start-time"
                                type="datetime-local"
                                value={votingTimeForm.start_time}
                                onChange={(e) => setVotingTimeForm({ ...votingTimeForm, start_time: e.target.value })}
                                className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1"
                              />
                            </div>
                            <div>
                              <Label htmlFor="voting-tab-end-time" className="text-slate-600 text-[11px] font-semibold">Кінець</Label>
                              <Input
                                id="voting-tab-end-time"
                                type="datetime-local"
                                value={votingTimeForm.end_time}
                                onChange={(e) => setVotingTimeForm({ ...votingTimeForm, end_time: e.target.value })}
                                className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1"
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-1 bg-slate-100 p-1.5 rounded-lg">
                            <button
                              type="button"
                              onClick={() => applyPreset("match24", selectedMatchForVoting)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              📅 Матч +24г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("match48", selectedMatchForVoting)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              📅 Матч +48г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("now24", selectedMatchForVoting)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              ⚡ Зараз +24г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("now48", selectedMatchForVoting)}
                              className="text-[10px] font-medium text-slate-700 hover:bg-white hover:shadow-sm px-2 py-1 rounded transition-all bg-transparent"
                            >
                              ⚡ Зараз +48г
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPreset("clear", selectedMatchForVoting)}
                              className="text-[10px] font-medium text-red-650 hover:bg-red-50 px-2 py-1 rounded transition-all bg-transparent ml-auto"
                            >
                              ❌ Очистити
                            </button>
                          </div>
                          <Button
                            type="submit"
                            disabled={loading}
                            size="sm"
                            className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-3 rounded-lg"
                          >
                            Зберегти час
                          </Button>
                        </form>

                        {/* Status controls */}
                        <div className="flex flex-col justify-between space-y-3">
                          <div>
                            <h5 className="font-bold text-xs text-slate-800">Керування станом</h5>
                            <p className="text-xs text-slate-500 mt-1">
                              Ви можете активувати або деактивувати голосування вручну в будь-який момент.
                            </p>
                          </div>
                          <Button
                            type="button"
                            onClick={handleToggleVotingActiveState}
                            disabled={loading}
                            className={`w-full text-white text-xs h-9 rounded-lg font-semibold ${
                              matchVoting?.is_active ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700"
                            }`}
                          >
                            {matchVoting?.is_active ? "Закрити голосування" : "Відкрити голосування"}
                          </Button>
                        </div>
                      </div>

                      {/* Add Candidates form */}
                      <form onSubmit={handleAddCandidateSubmit} className="space-y-3 pb-6 border-b border-slate-200">
                        <h5 className="font-bold text-xs text-slate-800">Додати кандидата</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <Label htmlFor="voting-tab-player-name" className="text-slate-600 text-[11px] font-semibold">Ім'я гравця</Label>
                            <Input
                              id="voting-tab-player-name"
                              value={candidateForm.player_name}
                              onChange={(e) => setCandidateForm({ ...candidateForm, player_name: e.target.value })}
                              required
                              placeholder="Введіть ім'я гравця"
                              className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1"
                            />
                          </div>
                          <div>
                            <Label htmlFor="voting-tab-team-name" className="text-slate-600 text-[11px] font-semibold">Команда</Label>
                            <Select
                              value={candidateForm.team_name}
                              onValueChange={(value) => setCandidateForm({ ...candidateForm, team_name: value })}
                            >
                              <SelectTrigger className="border-slate-200 text-slate-900 rounded-lg h-9 text-xs mt-1">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="bg-white border-slate-200">
                                <SelectItem value={selectedMatchForVoting.home_team} className="text-slate-900">
                                  {selectedMatchForVoting.home_team} (Господарі)
                                </SelectItem>
                                <SelectItem value={selectedMatchForVoting.away_team} className="text-slate-900">
                                  {selectedMatchForVoting.away_team} (Гості)
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <Button
                          type="submit"
                          disabled={loading}
                          size="sm"
                          className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-8 px-3 rounded-lg"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Додати гравця
                        </Button>
                      </form>

                      {/* Candidates Lists */}
                      <div className="space-y-4">
                        <h5 className="font-bold text-xs text-slate-800">Список кандидатів</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {/* Home Candidates */}
                          <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-white">
                            <h6 className="font-bold text-xs text-slate-800 pb-1 border-b border-slate-100">
                              {selectedMatchForVoting.home_team}
                            </h6>
                            {votingCandidates.filter(c => c.team_name === selectedMatchForVoting.home_team).length === 0 ? (
                              <div className="text-xs text-slate-400 py-2">Гравців не додано</div>
                            ) : (
                              <div className="space-y-1.5">
                                {votingCandidates.filter(c => c.team_name === selectedMatchForVoting.home_team).map((candidate) => (
                                  <div key={candidate.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                    {editingCandidateId === candidate.id ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Input
                                          value={editingCandidateName}
                                          onChange={(e) => setEditingCandidateName(e.target.value)}
                                          className="border-slate-300 text-slate-900 rounded h-7 text-xs px-2 py-0.5 flex-1"
                                        />
                                        <Button size="sm" onClick={handleSaveEditCandidate} className="bg-slate-900 text-white text-[10px] h-7 px-2">Зберегти</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingCandidateId(null)} className="h-7 px-2 text-[10px]">Скасувати</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium text-slate-900">{candidate.player_name}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-500 font-semibold mr-1">{candidate.votes || 0} гол.</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStartEditCandidate(candidate)}
                                            className="h-6 w-6 p-0 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                            type="button"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteCandidate(candidate.id)}
                                            className="h-6 w-6 p-0 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                            type="button"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Away Candidates */}
                          <div className="space-y-2 border border-slate-200 p-3 rounded-lg bg-white">
                            <h6 className="font-bold text-xs text-slate-800 pb-1 border-b border-slate-100">
                              {selectedMatchForVoting.away_team}
                            </h6>
                            {votingCandidates.filter(c => c.team_name === selectedMatchForVoting.away_team).length === 0 ? (
                              <div className="text-xs text-slate-400 py-2">Гравців не додано</div>
                            ) : (
                              <div className="space-y-1.5">
                                {votingCandidates.filter(c => c.team_name === selectedMatchForVoting.away_team).map((candidate) => (
                                  <div key={candidate.id} className="flex items-center justify-between gap-2 p-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs">
                                    {editingCandidateId === candidate.id ? (
                                      <div className="flex items-center gap-1.5 w-full">
                                        <Input
                                          value={editingCandidateName}
                                          onChange={(e) => setEditingCandidateName(e.target.value)}
                                          className="border-slate-300 text-slate-900 rounded h-7 text-xs px-2 py-0.5 flex-1"
                                        />
                                        <Button size="sm" onClick={handleSaveEditCandidate} className="bg-slate-900 text-white text-[10px] h-7 px-2">Зберегти</Button>
                                        <Button size="sm" variant="outline" onClick={() => setEditingCandidateId(null)} className="h-7 px-2 text-[10px]">Скасувати</Button>
                                      </div>
                                    ) : (
                                      <>
                                        <span className="font-medium text-slate-900">{candidate.player_name}</span>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[10px] text-slate-500 font-semibold mr-1">{candidate.votes || 0} гол.</span>
                                          <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleStartEditCandidate(candidate)}
                                            className="h-6 w-6 p-0 border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                                            type="button"
                                          >
                                            <Edit className="h-3 w-3" />
                                          </Button>
                                          <Button
                                            size="sm"
                                            variant="destructive"
                                            onClick={() => handleDeleteCandidate(candidate.id)}
                                            className="h-6 w-6 p-0 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100"
                                            type="button"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 text-center text-slate-400">
                      <Star className="h-10 w-10 mx-auto mb-2 text-slate-300" />
                      Будь ласка, оберіть матч зі списку ліворуч, щоб розпочати налаштування голосування.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
