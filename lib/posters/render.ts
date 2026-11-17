import type { Match } from "../supabase"
import { getPosterLogoSource } from "./assets"
import {
  getPosterDateLabel,
  getPosterTeamLogo,
  getPosterScorers,
  getPosterMatchScore,
  getPosterMatchTime,
  getPosterPages,
  getCupPosterPages,
  getCupPosterLayout,
  getPosterPageCount,
  getPosterRankingPages,
  getPosterRoundLayout,
  getPosterSponsorHeight,
  getPosterSponsors,
  getPosterScorerRows,
  POSTER_FORMATS,
  type PosterData,
  type PosterOptions,
} from "./model"

type Palette = { bg: string; text: string; muted: string; card: string; line: string; accent: string; accentText: string; onAccent: string }
type Assets = Map<string, HTMLImageElement | null>
const assetCache = new Map<string, Promise<HTMLImageElement | null>>()

function loadImage(url: string, source = url): Promise<HTMLImageElement | null> {
  let cached = assetCache.get(url)
  if (cached) return cached
  cached = new Promise((resolve) => {
    const img = new Image()
    let done = false
    const finish = (image: HTMLImageElement | null) => {
      if (done) return
      done = true
      clearTimeout(timer)
      img.onload = null
      img.onerror = null
      resolve(image)
    }
    const timer = window.setTimeout(() => finish(null), 6000)
    img.crossOrigin = "anonymous"
    img.onload = () => finish(img.naturalWidth > 0 && img.naturalHeight > 0 ? img : null)
    img.onerror = () => finish(null)
    img.src = source
  })
  // Keep a small cache: repeated typing should not download badges repeatedly.
  if (assetCache.size > 80) assetCache.clear()
  assetCache.set(url, cached)
  void cached.then((image) => { if (!image && assetCache.get(url) === cached) assetCache.delete(url) })
  return cached
}

function luminance(hex: string): number {
  const rgb = [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16) / 255)
  const linear = rgb.map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
}

function contrast(hex: string): string {
  return luminance(hex) > 0.179 ? "#101827" : "#ffffff"
}

function palette(options: PosterOptions): Palette {
  const accent = /^#[\da-f]{6}$/i.test(options.accent) ? options.accent : "#f2bd3e"
  // A custom near-white accent must remain readable on light templates, and a
  // near-black accent must remain readable on the stadium background.
  const accentText = options.template === "stadium"
    ? luminance(accent) > 0.14 ? accent : "#ffffff"
    : luminance(accent) < 0.26 ? accent : "#10203a"
  return options.template === "stadium"
    ? { bg: "#080f1d", text: "#ffffff", muted: "#a3b2c7", card: "#172338", line: "#2c3c52", accent, accentText, onAccent: contrast(accent) }
    : { bg: options.template === "editorial" ? "#f1f4f8" : "#ffffff", text: "#10203a", muted: "#53647c", card: "#ffffff", line: "#d8e0e9", accent, accentText, onAccent: contrast(accent) }
}

function family(options: PosterOptions): string {
  if (options.font === "serif") return 'Georgia, "Times New Roman", serif'
  if (options.font === "condensed") return '"Arial Narrow", "Roboto Condensed", Impact, Arial, sans-serif'
  return 'Arial, Helvetica, sans-serif'
}

function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, color: string, options: PosterOptions, maxWidth = 960, align: CanvasTextAlign = "left", weight = 800) {
  const clean = value.replace(/\s+/g, " ").trim()
  ctx.textAlign = align
  ctx.textBaseline = "alphabetic"
  ctx.fillStyle = color
  let fitted = size
  ctx.font = `${weight} ${fitted}px ${family(options)}`
  while (ctx.measureText(clean).width > maxWidth && fitted > Math.min(18, size)) {
    fitted -= 1
    ctx.font = `${weight} ${fitted}px ${family(options)}`
  }
  ctx.fillText(clean, x, y, maxWidth)
}

function lines(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, width: number, options: PosterOptions, color: string, maxLines = 2, align: CanvasTextAlign = "center", verticalCenter = false) {
  const words = value.trim().split(/\s+/)
  let fitted = size
  let result: string[] = []
  do {
    ctx.font = `800 ${fitted}px ${family(options)}`
    result = []
    for (const word of words) {
      const last = result.length - 1
      if (last >= 0 && ctx.measureText(`${result[last]} ${word}`).width <= width) result[last] += ` ${word}`
      else result.push(word)
    }
    if (result.length <= maxLines) break
    fitted -= 1
  } while (fitted > 14)
  if (result.length > maxLines) result = [...result.slice(0, maxLines - 1), result.slice(maxLines - 1).join(" ")]
  const firstBaseline = verticalCenter ? y - (result.length - 1) * fitted * 0.565 + fitted * 0.33 : y
  for (let index = 0; index < result.length; index++) {
    text(ctx, result[index], x, firstBaseline + index * fitted * 1.13, fitted, color, options, width, align)
  }
  return result.length * fitted * 1.13
}

function box(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, width, height, radius)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) {
    ctx.strokeStyle = stroke
    ctx.lineWidth = 1.5
    ctx.stroke()
  }
}

function contain(ctx: CanvasRenderingContext2D, img: HTMLImageElement, x: number, y: number, size: number) {
  const ratio = Math.min(size / img.naturalWidth, size / img.naturalHeight)
  const width = img.naturalWidth * ratio
  const height = img.naturalHeight * ratio
  ctx.drawImage(img, x - width / 2, y - height / 2, width, height)
}

function logo(ctx: CanvasRenderingContext2D, url: string | undefined, name: string, x: number, y: number, size: number, assets: Assets, p: Palette, options: PosterOptions) {
  const img = url ? assets.get(url) : null
  if (img) {
    // White backing keeps transparent dark crests legible in either theme.
    box(ctx, x - size / 2 - 8, y - size / 2 - 8, size + 16, size + 16, size * 0.22, "#ffffff")
    contain(ctx, img, x, y, size * 0.87)
    return
  }
  ctx.beginPath()
  ctx.moveTo(x, y - size * 0.53)
  ctx.lineTo(x + size * 0.44, y - size * 0.29)
  ctx.lineTo(x + size * 0.35, y + size * 0.27)
  ctx.quadraticCurveTo(x + size * 0.18, y + size * 0.45, x, y + size * 0.55)
  ctx.quadraticCurveTo(x - size * 0.18, y + size * 0.45, x - size * 0.35, y + size * 0.27)
  ctx.lineTo(x - size * 0.44, y - size * 0.29)
  ctx.closePath()
  ctx.fillStyle = p.accent
  ctx.fill()
  const initials = name.split(/\s+/).filter((word) => !/^(фк|мфк|ск)$/i.test(word)).map((word) => [...word][0]).join("").slice(0, 3) || "КС"
  text(ctx, initials.toUpperCase(), x, y + size * 0.12, size * 0.28, p.onAccent, options, size * 0.68, "center", 900)
}

function background(ctx: CanvasRenderingContext2D, width: number, height: number, p: Palette, options: PosterOptions, assets: Assets, cup = false) {
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, width, height)
  if (options.template === "stadium") {
    const glow = ctx.createRadialGradient(width * 0.7, height * 0.23, 10, width * 0.7, height * 0.23, height * 0.8)
    glow.addColorStop(0, cup ? `${p.accent}55` : "#1c3552")
    glow.addColorStop(1, "#080f1d")
    ctx.fillStyle = glow
    ctx.fillRect(0, 0, width, height)
  }
  const photo = options.backgroundUrl ? assets.get(options.backgroundUrl) : null
  if (photo) {
    const scale = Math.max(width / photo.naturalWidth, height / photo.naturalHeight)
    const drawnWidth = photo.naturalWidth * scale
    const drawnHeight = photo.naturalHeight * scale
    ctx.drawImage(photo, (width - drawnWidth) * options.backgroundPosition / 100, (height - drawnHeight) * options.backgroundPosition / 100, drawnWidth, drawnHeight)
    ctx.fillStyle = options.template === "stadium" ? `rgba(5, 14, 28, ${options.backgroundOpacity / 100})` : `rgba(248, 250, 252, ${options.backgroundOpacity / 100})`
    ctx.fillRect(0, 0, width, height)
  }
  ctx.save()
  if (options.template === "editorial") {
    ctx.fillStyle = "#e5ebf3"
    for (let x = -height; x < width; x += 180) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x + 65, 0)
      ctx.lineTo(x + height * 0.4 + 65, height)
      ctx.lineTo(x + height * 0.4, height)
      ctx.fill()
    }
  } else if (options.template === "stadium") {
    ctx.strokeStyle = "rgba(183, 207, 232, 0.07)"
    ctx.lineWidth = 3
    ctx.strokeRect(width * 0.074, height * 0.35, width * 0.852, height * 0.48)
    ctx.beginPath()
    ctx.arc(width / 2, height * 0.59, 250, 0, Math.PI * 2)
    ctx.moveTo(width * 0.074, height * 0.59)
    ctx.lineTo(width * 0.926, height * 0.59)
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = p.accent
  ctx.fillRect(0, 0, width, 12)
  if (options.template !== "minimal") {
    ctx.save()
    ctx.globalAlpha = 0.06
    text(ctx, "KS", width - 80, height - 170, 470, p.text, options, width - 180, "right", 900)
    ctx.restore()
  }
}

function header(ctx: CanvasRenderingContext2D, data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const compact = data.mode !== "match"
  const brand = assets.get("/images/ks-logo.png")
  if (brand) contain(ctx, brand, 103, compact ? 80 : 100, compact ? 70 : 90)
  else text(ctx, "KS", 58, 127, 72, p.accentText, options, 120)
  text(ctx, "KS LIGA", 170, compact ? 85 : 105, compact ? 36 : 43, p.text, options, 490, "left", 900)
  text(ctx, "СПОРТИВНІ ПОДІЇ ОНЛАЙН!", 172, compact ? 112 : 135, 16, p.muted, options, 490, "left", 700)
  const label = data.mode === "standings" || data.mode === "scorers" ? "СТАТИСТИКА" : options.showScores ? data.mode === "match" ? "РЕЗУЛЬТАТ" : "РЕЗУЛЬТАТИ" : "АНОНС МАТЧІВ"
  box(ctx, 758, compact ? 58 : 74, 264, compact ? 40 : 48, 24, p.accent)
  text(ctx, label, 890, compact ? 85 : 106, 22, p.onAccent, options, 225, "center", 800)
  const square = height === 1080
  const titleY = compact ? 222 : square ? 274 : height === 1920 ? 300 : 288
  text(ctx, data.championship?.name || "KS LIGA · ФУТБОЛ", 60, compact ? 158 : 192, compact ? 20 : 22, p.muted, options, 960, "left", 700)
  text(ctx, options.title || (data.mode === "match" ? "МАТЧ ДНЯ" : "КАЛЕНДАР МАТЧІВ"), 58, titleY, compact ? 64 : square ? 68 : height === 1920 ? 96 : 88, p.text, options, 960, "left", 900)
  if (options.subtitle.trim()) text(ctx, options.subtitle, 62, titleY + (compact ? 33 : 41), compact ? 22 : 27, p.muted, options, 956, "left", 600)
  ctx.fillStyle = p.accent
  ctx.fillRect(60, titleY + (compact ? 48 : 58), 92, 5)
}

function footer(ctx: CanvasRenderingContext2D, height: number, data: PosterData, options: PosterOptions, assets: Assets, p: Palette, pageCount: number, width = 1080) {
  const { main } = getPosterSponsors(options)
  const top = height - 92
  ctx.fillStyle = p.accent
  ctx.fillRect(0, top, width, 92)
  if (main) {
    text(ctx, "ГОЛОВНИЙ ПАРТНЕР", 60, top + 28, 13, p.onAccent, options, 260, "left", 800)
    text(ctx, options.footer, 60, top + 58, 26, p.onAccent, options, 260, "left", 800)
    drawSponsor(ctx, main, width / 2 + 10, top + 46, Math.min(600, 420 * width / 1080), 80, assets, options)
  } else {
    text(ctx, options.footer, 60, height - 37, 26, p.onAccent, options, 570, "left", 800)
  }
  const page = pageCount > 1 ? `${options.page + 1} / ${pageCount}` : data.mode === "match" ? "ЗУСТРІНЕМОСЯ НА ФУТБОЛІ" : "ПІДТРИМУЙ СВОЮ КОМАНДУ"
  text(ctx, page, width - 60, height - 37, 18, p.onAccent, options, (main ? 250 : 340) * width / 1080, "right", 800)
}

function drawSponsor(ctx: CanvasRenderingContext2D, sponsor: PosterOptions["sponsors"][number], x: number, y: number, width: number, size: number, assets: Assets, options: PosterOptions) {
  box(ctx, x - width / 2, y - size / 2, width, size, 10, "#ffffff")
  const img = assets.get(sponsor.url)
  if (img) {
    const ratio = Math.min((width - 12) / img.naturalWidth, (size - 6) / img.naturalHeight)
    ctx.drawImage(img, x - img.naturalWidth * ratio / 2, y - img.naturalHeight * ratio / 2, img.naturalWidth * ratio, img.naturalHeight * ratio)
  } else text(ctx, sponsor.name || "Партнер", x, y + 6, 18, "#10203a", options, width - 18, "center")
}

function sponsorStrip(ctx: CanvasRenderingContext2D, options: PosterOptions, assets: Assets, p: Palette, height: number, width = 1080) {
  const { partners } = getPosterSponsors(options)
  if (!partners.length) return
  const top = height - 92 - getPosterSponsorHeight(options)
  partners.forEach((sponsor, index) => {
    const columns = Math.min(4, partners.length)
    const row = Math.floor(index / columns)
    const countInRow = Math.min(columns, partners.length - row * columns)
    const columnWidth = (width - 120) / columns
    const x = width / 2 + ((index % columns) - (countInRow - 1) / 2) * columnWidth
    const y = top + 40 + row * 68
    drawSponsor(ctx, sponsor, x, y, Math.min(width > 1080 ? 320 : 224, columnWidth - 12), 62, assets, options)
  })
}

function matchPoster(ctx: CanvasRenderingContext2D, match: Match, data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const compact = options.showScorers || getPosterSponsorHeight(options) > 0
  const top = height === 1080 ? 355 : height === 1920 ? 395 : 370
  const bottom = height - 112 - getPosterSponsorHeight(options) - (options.showVenue && options.venue ? 40 : 0)
  const score = options.showScores ? getPosterMatchScore(match) : null
  const showTime = options.showTime && !score
  const dateTop = bottom - (showTime ? 105 : 75)
  const size = compact ? Math.max(64, Math.min(180, (dateTop - top) * .34)) : height === 1920 ? 240 : height === 1080 ? 158 : 204
  const centerY = compact ? top + size / 2 : height * (height === 1080 ? .435 : .46)
  logo(ctx, getPosterTeamLogo(data, options, match.championship_id, match.home_team), match.home_team, 270, centerY, size, assets, p, options)
  logo(ctx, getPosterTeamLogo(data, options, match.championship_id, match.away_team), match.away_team, 810, centerY, size, assets, p, options)
  text(ctx, score || "VS", 540, centerY + 24, 70, p.accentText, options, 240, "center", 900)
  const penalties = score && match.penalty_home != null && match.penalty_away != null ? `пен. ${match.penalty_home}:${match.penalty_away}` : score && match.is_technical_defeat ? "ТЕХНІЧНИЙ РЕЗУЛЬТАТ" : ""
  if (penalties) text(ctx, penalties, 540, centerY + 61, 18, p.muted, options, 240, "center")
  const namesY = centerY + size / 2 + (compact ? 32 : 62)
  const nameHeight = Math.max(lines(ctx, match.home_team.toUpperCase(), 270, namesY, compact ? 28 : 38, 400, options, p.text), lines(ctx, match.away_team.toUpperCase(), 810, namesY, compact ? 28 : 38, 400, options, p.text))
  if (options.showScorers && match.is_finished) {
    const goalsY = namesY + nameHeight + 9
    const space = Math.max(20, dateTop - goalsY - 10)
    for (const [team, x] of [[match.home_team, 270], [match.away_team, 810]] as const) {
      const scorers = getPosterScorers(data.goals || [], match.id, team)
      if (scorers) lines(ctx, scorers, x, goalsY, Math.min(22, space / 3.5), 420, options, p.muted, Math.max(1, Math.floor(space / 23)))
    }
  }
  box(ctx, 60, dateTop, 960, showTime ? 105 : 75, 18, p.card, p.line)
  text(ctx, getPosterDateLabel([match]).toUpperCase(), 540, dateTop + 44, 34, p.text, options, 880, "center")
  if (showTime) text(ctx, `${getPosterMatchTime(match)} · ЗА КИЄВОМ`, 540, dateTop + 80, 24, p.accentText, options, 860, "center")
  if (options.showVenue && options.venue) text(ctx, options.venue, 540, bottom + 30, 24, p.muted, options, 940, "center")
}

function roundPoster(ctx: CanvasRenderingContext2D, matches: Match[], data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const layout = getPosterRoundLayout(data, options)
  const startY = layout.top
  const minimumHeights = matches.map(layout.minimumRowHeight)
  const spare = Math.max(0, layout.bottom - startY - minimumHeights.reduce((sum, height) => sum + height, 0) - Math.max(0, matches.length - 1) * layout.gap)
  let nextY = startY
  const multipleDates = new Set(matches.map((match) => match.date)).size > 1
  const multipleStages = new Set(data.matches.map((match) => match.cup_stage).filter(Boolean)).size > 1
  const showTimezone = options.showTime && (!options.showScores || matches.some((match) => !match.is_finished))
  if (showTimezone) text(ctx, "ЧАС ЗА КИЄВОМ", 62, startY - 27, 16, p.muted, options, 300, "left", 700)
  text(ctx, getPosterDateLabel(matches).toUpperCase(), 1020, startY - 27, 21, p.muted, options, showTimezone ? 650 : 960, "right", 700)
  matches.forEach((match, index) => {
    const y = nextY
    const rowHeight = Math.min(options.showScorers ? 220 : 142, minimumHeights[index] + spare / Math.max(matches.length, 1))
    nextY += rowHeight + layout.gap
    box(ctx, 60, y, 960, rowHeight, 18, p.card, p.line)
    ctx.fillStyle = p.accent
    ctx.fillRect(60, y + 20, 4, rowHeight - 40)
    const center = options.showScores ? getPosterMatchScore(match) : null
    const details = [multipleStages ? match.cup_stage : "", multipleDates ? getPosterDateLabel([match]) : "", center && match.penalty_home != null && match.penalty_away != null ? `пен. ${match.penalty_home}:${match.penalty_away}` : "", center && match.is_technical_defeat ? "Технічний результат" : ""].filter(Boolean)
    const scorerRows = getPosterScorerRows(data, options, match)
    const detailHeight = details.length ? 16 : 0
    const scorerHeight = scorerRows ? scorerRows * 16 + 4 : 0
    const mainHeight = rowHeight - detailHeight - scorerHeight
    const logoSize = Math.min(58, mainHeight - 18)
    const centerY = y + mainHeight / 2
    logo(ctx, getPosterTeamLogo(data, options, match.championship_id, match.home_team), match.home_team, 403, centerY, logoSize, assets, p, options)
    logo(ctx, getPosterTeamLogo(data, options, match.championship_id, match.away_team), match.away_team, 677, centerY, logoSize, assets, p, options)
    const clock = options.showTime ? getPosterMatchTime(match) : "VS"
    const centerText = center || clock
    const centerHeight = Math.min(54, mainHeight - 12)
    box(ctx, 462, centerY - centerHeight / 2, 156, centerHeight, 10, p.accent)
    const centerSize = /^\d/.test(centerText) ? rowHeight < 104 ? 30 : 33 : centerText === "VS" ? 28 : 17
    text(ctx, centerText, 540, centerY + centerSize * 0.33, centerSize, p.onAccent, options, 142, "center", 900)
    const nameSize = mainHeight < 72 ? 22 : 27
    lines(ctx, match.home_team.toUpperCase(), 350, centerY, nameSize, 250, options, p.text, 2, "right", true)
    lines(ctx, match.away_team.toUpperCase(), 730, centerY, nameSize, 250, options, p.text, 2, "left", true)
    if (details.length) text(ctx, details.join(" · "), 540, y + mainHeight + 12, 14, p.muted, options, 870, "center", 600)
    if (scorerRows) {
      const left = getPosterScorers(data.goals || [], match.id, match.home_team)
      const right = getPosterScorers(data.goals || [], match.id, match.away_team)
      const fontSize = Math.min(18, (scorerHeight - 4) / (scorerRows * 1.13))
      const goalsY = y + mainHeight + detailHeight + fontSize
      if (left) lines(ctx, left, 300, goalsY, fontSize, 440, options, p.muted, scorerRows)
      if (right) lines(ctx, right, 780, goalsY, fontSize, 440, options, p.muted, scorerRows)
    }
  })
  if (options.showVenue && options.venue.trim()) text(ctx, options.venue, 540, height - 104 - getPosterSponsorHeight(options), 18, p.muted, options, 950, "center", 600)
}

function rankingPoster(ctx: CanvasRenderingContext2D, data: PosterData, options: PosterOptions, assets: Assets, p: Palette) {
  const rows = getPosterRankingPages(data, options)[options.page] || []
  const layout = getPosterRoundLayout(data, options)
  const standings = data.mode === "standings"
  text(ctx, standings ? "КОМАНДА" : "ГРАВЕЦЬ / КОМАНДА", 162, layout.top + 26, 18, p.muted, options, 430)
  if (standings) for (const [label, x] of [["І", 640], ["В / Н / П", 748], ["З : П", 868], ["О", 978]] as const) text(ctx, label, x, layout.top + 26, 18, p.muted, options, 112, "center")
  else text(ctx, "ГОЛИ", 960, layout.top + 26, 18, p.muted, options, 100, "center")
  if (!rows.length) text(ctx, standings ? "Команд ще немає" : "Забитих голів ще немає", 540, layout.top + 140, 34, p.muted, options, 940, "center")
  const rowHeight = Math.min(88, (layout.bottom - layout.top - 44) / Math.max(1, rows.length))
  rows.forEach((row, index) => {
    const y = layout.top + 44 + index * rowHeight
    box(ctx, 60, y, 960, rowHeight - 6, 12, p.card, p.line)
    text(ctx, String(row.position).padStart(2, "0"), 88, y + rowHeight / 2 + 7, 23, row.position <= 3 ? p.accentText : p.muted, options, 50)
    logo(ctx, getPosterTeamLogo(data, options, data.championship?.id || data.teams[0]?.championship_id, row.team), row.team, 167, y + (rowHeight - 6) / 2, 42, assets, p, options)
    if (standings && row.standing) {
      text(ctx, row.name, 204, y + rowHeight / 2 + 6, 24, p.text, options, 370)
      for (const [value, x, width] of [[row.standing.games, 640, 60], [`${row.standing.wins}/${row.standing.draws}/${row.standing.losses}`, 748, 112], [`${row.standing.gf}:${row.standing.ga}`, 868, 104], [row.standing.pts, 978, 65]] as const) text(ctx, String(value), x, y + rowHeight / 2 + 6, 23, x === 978 ? p.accentText : p.text, options, width, "center", x === 978 ? 900 : 600)
    } else {
      text(ctx, row.name, 204, y + rowHeight / 2 - 4, 27, p.text, options, 650)
      text(ctx, row.team, 205, y + rowHeight / 2 + 19, 17, p.muted, options, 650, "left", 600)
      text(ctx, String(row.goals), 960, y + rowHeight / 2 + 9, 34, p.accentText, options, 90, "center", 900)
    }
  })
}

function cupTrophy(ctx: CanvasRenderingContext2D, x: number, y: number, color: string, accent: string) {
  ctx.save()
  ctx.translate(x, y)
  ctx.lineWidth = 5
  ctx.strokeStyle = color
  ctx.fillStyle = color
  ctx.beginPath(); ctx.moveTo(-30, -40); ctx.lineTo(30, -40); ctx.bezierCurveTo(29, -4, 19, 15, 0, 20); ctx.bezierCurveTo(-19, 15, -29, -4, -30, -40); ctx.fill()
  ctx.beginPath(); ctx.moveTo(-30, -29); ctx.bezierCurveTo(-65, -40, -54, 12, -17, 9); ctx.moveTo(30, -29); ctx.bezierCurveTo(65, -40, 54, 12, 17, 9); ctx.stroke()
  ctx.fillRect(-5, 18, 10, 28)
  ctx.beginPath(); ctx.moveTo(-28, 53); ctx.lineTo(-17, 43); ctx.lineTo(17, 43); ctx.lineTo(28, 53); ctx.closePath(); ctx.fill()
  ctx.fillStyle = accent
  ctx.beginPath()
  for (let point = 0; point < 10; point++) {
    const angle = -Math.PI / 2 + point * Math.PI / 5, radius = point % 2 ? 7 : 16
    const px = Math.cos(angle) * radius, py = Math.sin(angle) * radius - 14
    if (!point) ctx.moveTo(px, py); else ctx.lineTo(px, py)
  }
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

function cupPoster(ctx: CanvasRenderingContext2D, data: PosterData, options: PosterOptions, assets: Assets, p: Palette) {
  const layout = getCupPosterLayout(data, options)
  const pages = getCupPosterPages(data, options)
  const page = pages[options.page] || pages[0]
  const width = layout.width
  const brand = assets.get("/images/ks-logo.png")
  if (brand) contain(ctx, brand, 94, 78, 68)
  text(ctx, "KS LIGA", 150, 80, 36, p.text, options, 420)
  text(ctx, "СПОРТИВНІ ПОДІЇ ОНЛАЙН!", 152, 107, 16, p.muted, options, 470, "left", 700)
  text(ctx, "КУБКОВА СІТКА", width - 60, 80, 22, p.accentText, options, width > 1080 ? 600 : 360, "right")
  text(ctx, options.title, 60, 195, width > 1080 ? 78 : 58, p.text, options, width - 120, "left", 900)
  if (options.subtitle.trim()) text(ctx, options.subtitle, 62, 236, 25, p.muted, options, width - 124, "left", 600)
  ctx.fillStyle = p.accent; ctx.fillRect(60, 256, 120, 5)
  if (!page.entries.length) { text(ctx, "Додайте матчі плейоф або опублікуйте сітку кубка", width / 2, layout.height / 2, 32, p.muted, options, width - 120, "center"); return }
  const stages = page.stages
  const columnGap = width > 1080 ? 48 : 24
  const columnWidth = Math.min(720, (width - 120 - columnGap * (Math.max(1, stages.length) - 1)) / Math.max(1, stages.length))
  const left = (width - columnWidth * Math.max(1, stages.length) - columnGap * (Math.max(1, stages.length) - 1)) / 2
  const span = layout.bottom - layout.top
  const roots = page.entries.filter((entry) => entry.fixture.stage === stages[0] && entry.fixture.id !== "third-place")
  const cardHeight = Math.max(70, Math.min(116, (span - Math.max(0, roots.length - 1) * 10) / Math.max(1, roots.length)))
  const positions = new Map<string, { x: number; y: number }>()
  const lastStage = Math.max(...layout.stages)
  stages.forEach((stage, column) => {
    const list = page.entries.filter((entry) => entry.fixture.stage === stage && entry.fixture.id !== "third-place")
    text(ctx, list[0]?.fixture.label.toLocaleUpperCase("uk-UA") || "ПЛЕЙОФ", left + column * (columnWidth + columnGap), 289, 20, p.muted, options, columnWidth, "left", 800)
    list.forEach((entry, index) => {
      const parents = [entry.fixture.home_source, entry.fixture.away_source].flatMap((source) => source.kind === "winner" || source.kind === "loser" ? positions.has(source.fixtureId) ? [positions.get(source.fixtureId)!] : [] : [])
      const y = parents.length ? parents.reduce((sum, parent) => sum + parent.y, 0) / parents.length : layout.top + (index + 0.5) * span / Math.max(1, list.length)
      positions.set(entry.fixture.id, { x: left + column * (columnWidth + columnGap), y })
    })
  })
  const third = page.entries.find((entry) => entry.fixture.id === "third-place")
  if (third) positions.set(third.fixture.id, { x: left + Math.max(0, stages.indexOf(third.fixture.stage)) * (columnWidth + columnGap), y: layout.bottom - cardHeight / 2 - 3 })
  // Draw the bracket connections behind the cards.
  ctx.save(); ctx.globalAlpha = 0.6; ctx.strokeStyle = p.muted; ctx.lineWidth = width > 1080 ? 3 : 2
  for (const entry of page.entries) {
    if (entry.fixture.id === "third-place") continue
    const current = positions.get(entry.fixture.id)
    if (!current) continue
    for (const source of [entry.fixture.home_source, entry.fixture.away_source]) {
      if (source.kind !== "winner" && source.kind !== "loser") continue
      const parent = positions.get(source.fixtureId)
      if (!parent || parent.x >= current.x) continue
      const middle = current.x - columnGap / 2
      ctx.beginPath(); ctx.moveTo(parent.x + columnWidth, parent.y); ctx.lineTo(middle, parent.y); ctx.lineTo(middle, current.y); ctx.lineTo(current.x, current.y); ctx.stroke()
    }
  }
  ctx.restore()
  for (const entry of page.entries) {
    const position = positions.get(entry.fixture.id)
    if (!position) continue
    const { x, y } = position
    if (entry.fixture.id === "third-place") text(ctx, entry.fixture.label.toLocaleUpperCase("uk-UA"), x, y - cardHeight / 2 - 15, 18, p.text, options, columnWidth)
    else if (entry.fixture.stage === lastStage && entry.fixture.id !== "third-place" && y - layout.top > 120) {
      cupTrophy(ctx, x + columnWidth / 2, y - cardHeight / 2 - 80, p.text, p.accent)
      if (entry.winner && options.showScores) text(ctx, "ВОЛОДАР КУБКА", x + columnWidth / 2, y - cardHeight / 2 - 16, 15, p.accentText, options, columnWidth, "center")
    }
    const metaHeight = 18
    const rowHeight = (cardHeight - metaHeight - 6) / 2
    for (const [side, score, row] of [[entry.home, entry.homeScore, 0], [entry.away, entry.awayScore, 1]] as const) {
      const top = y - cardHeight / 2 + row * (rowHeight + 3)
      const centerY = top + rowHeight / 2
      const scoreWidth = columnWidth >= 350 ? 60 : 40
      const badgeSize = Math.min(46, rowHeight - 6)
      const badgeX = x + badgeSize / 2 + 10
      box(ctx, x, top, columnWidth, rowHeight, 5, "#ffffff")
      ctx.fillStyle = p.accent
      ctx.beginPath(); ctx.moveTo(x + columnWidth - scoreWidth + 8, top); ctx.lineTo(x + columnWidth, top); ctx.lineTo(x + columnWidth, top + rowHeight); ctx.lineTo(x + columnWidth - scoreWidth, top + rowHeight); ctx.lineTo(x + columnWidth - scoreWidth - 8, top + rowHeight / 2); ctx.closePath(); ctx.fill()
      const url = side.pending || side.bye ? undefined : getPosterTeamLogo(data, options, data.championship?.id || data.teams[0]?.championship_id, side.name)
      const img = url ? assets.get(url) : null
      if (img) contain(ctx, img, badgeX, centerY, badgeSize)
      else if (!side.pending && !side.bye) logo(ctx, undefined, side.name, badgeX, centerY, badgeSize, assets, p, options)
      const nameX = x + badgeSize + 22
      const nameWidth = columnWidth - badgeSize - scoreWidth - 40
      const name = side.name.toLocaleUpperCase("uk-UA")
      let fontSize = Math.min(columnWidth >= 350 ? 26 : 21, rowHeight * 0.59)
      ctx.font = `800 ${fontSize}px ${family(options)}`
      if (ctx.measureText(name).width > nameWidth) fontSize = Math.min(fontSize, (rowHeight - 3) / 2.26)
      lines(ctx, name, nameX, centerY, fontSize, nameWidth, options, side.pending || side.bye ? "#637085" : "#101827", 2, "left", true)
      text(ctx, options.showScores ? score : "—", x + columnWidth - scoreWidth / 2 + 2, centerY + rowHeight * 0.24, Math.min(32, rowHeight * 0.7), p.onAccent, options, scoreWidth - 10, "center", 900)
      if (options.showScores && entry.winner === side.name) { ctx.fillStyle = p.accent; ctx.fillRect(x, top + 5, 4, rowHeight - 10) }
    }
    const next = entry.games.find((match) => !match.is_finished)
    const date = next?.date || entry.fixture.scheduled_date
    const time = next?.match_time || entry.fixture.scheduled_time
    const dateText = options.showTime && date ? `${date.slice(8, 10)}.${date.slice(5, 7)}${time ? ` · ${time.slice(0, 5)}` : ""}` : ""
    const detail = options.showScores && entry.detail ? entry.detail : [entry.fixture.legs === 2 ? "2 матчі" : "", dateText].filter(Boolean).join(" · ")
    if (detail) text(ctx, detail, x + columnWidth / 2, y + cardHeight / 2 - 3, 14, p.muted, options, columnWidth - 8, "center", 600)
  }
  let noteY = layout.bottom + 23
  for (const entry of layout.preliminary) {
    text(ctx, `ПОПЕРЕДНІЙ ЕТАП · ${entry.home.name} ${options.showScores ? `${entry.homeScore}:${entry.awayScore}` : "—"} ${entry.away.name}`, 60, noteY, 17, p.muted, options, width - 120, "left", 600)
    noteY += 24
  }
  if (options.showVenue && options.venue.trim()) text(ctx, options.venue, 60, noteY, 18, p.muted, options, width - 120, "left", 600)
}

export async function renderPoster(canvas: HTMLCanvasElement, data: PosterData, options: PosterOptions): Promise<{ warnings: string[] }> {
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const pages = getPosterPages(data, options)
  const matches = pages[Math.max(0, Math.min(options.page, pages.length - 1))] || []
  const badges = data.mode === "cup" ? (getCupPosterPages(data, options)[options.page]?.entries || []).flatMap((entry) => [entry.home, entry.away]).filter((side) => !side.pending && !side.bye).map((side) => ({ name: side.name, url: getPosterTeamLogo(data, options, data.championship?.id || data.teams[0]?.championship_id, side.name) })) : data.mode === "standings" || data.mode === "scorers" ? (getPosterRankingPages(data, options)[options.page] || []).map((row) => ({ name: row.team, url: getPosterTeamLogo(data, options, data.championship?.id || data.teams[0]?.championship_id, row.team) })) : matches.flatMap((match) => [match.home_team, match.away_team].map((name) => ({ name, url: getPosterTeamLogo(data, options, match.championship_id, name) })))
  const logoUrls = [...new Set(badges.map((badge) => badge.url).filter((url): url is string => Boolean(url)))]
  const sponsorUrls = options.sponsors.map((sponsor) => sponsor.url).filter(Boolean)
  const urls = ["/images/ks-logo.png", ...logoUrls, ...sponsorUrls, ...(options.backgroundUrl ? [options.backgroundUrl] : [])]
  const assets: Assets = new Map(await Promise.all(urls.map(async (url) => [url, await loadImage(url, getPosterLogoSource(url, url === options.backgroundUrl ? 1920 : sponsorUrls.includes(url) ? 828 : 256))] as const)))
  const warnings: string[] = []
  const failedTeams = [...new Set(badges.filter((badge) => badge.url && !assets.get(badge.url)).map((badge) => badge.name))]
  if (failedTeams.length) warnings.push(`Недоступні емблеми: ${failedTeams.slice(0, 5).join(", ")}${failedTeams.length > 5 ? ` та ще ${failedTeams.length - 5}` : ""}. Замініть посилання у «Емблеми команд». Поки використано ініціали.`)
  if (sponsorUrls.some((url) => !assets.get(url))) warnings.push("Деякі логотипи спонсорів недоступні. Перевірте пряме посилання та дозвіл CORS; тимчасово показано назву партнера.")
  if (options.backgroundUrl && !assets.get(options.backgroundUrl)) warnings.push("Не вдалося прочитати фото тла. Оберіть зображення ще раз.")
  if (typeof document !== "undefined" && document.fonts) await document.fonts.ready
  canvas.width = format.width
  canvas.height = format.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Браузер не підтримує створення афіш. Спробуйте інший браузер.")
  const p = palette(options)
  background(ctx, format.width, format.height, p, options, assets, data.mode === "cup")
  if (data.mode !== "cup") header(ctx, data, options, assets, p, format.height)
  if (data.mode === "cup") cupPoster(ctx, data, options, assets, p)
  else if (data.mode === "standings" || data.mode === "scorers") rankingPoster(ctx, data, options, assets, p)
  else if (!matches.length) text(ctx, "Матчів ще немає", 540, format.height / 2, 48, p.muted, options, 940, "center")
  else if (data.mode === "match") matchPoster(ctx, matches[0], data, options, assets, p, format.height)
  else roundPoster(ctx, matches, data, options, assets, p, format.height)
  sponsorStrip(ctx, options, assets, p, format.height, format.width)
  footer(ctx, format.height, data, options, assets, p, getPosterPageCount(data, options), format.width)
  return { warnings }
}
