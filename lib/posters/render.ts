import type { Match, Team } from "../supabase"
import { getPosterLogoSource } from "./assets"
import {
  getPosterDateLabel,
  getPosterScorers,
  getPosterMatchScore,
  getPosterMatchTime,
  getPosterPages,
  getPosterRoundLayout,
  getPosterSponsorHeight,
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

function logo(ctx: CanvasRenderingContext2D, team: Team | undefined, name: string, x: number, y: number, size: number, assets: Assets, p: Palette, options: PosterOptions) {
  const img = team?.logo ? assets.get(team.logo) : null
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

function background(ctx: CanvasRenderingContext2D, width: number, height: number, p: Palette, options: PosterOptions, assets: Assets) {
  ctx.fillStyle = p.bg
  ctx.fillRect(0, 0, width, height)
  if (options.template === "stadium") {
    const glow = ctx.createRadialGradient(width * 0.7, height * 0.23, 10, width * 0.7, height * 0.23, height * 0.8)
    glow.addColorStop(0, "#1c3552")
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
    ctx.strokeRect(80, height * 0.35, 920, height * 0.48)
    ctx.beginPath()
    ctx.arc(540, height * 0.59, 250, 0, Math.PI * 2)
    ctx.moveTo(80, height * 0.59)
    ctx.lineTo(1000, height * 0.59)
    ctx.stroke()
  }
  ctx.restore()
  ctx.fillStyle = p.accent
  ctx.fillRect(0, 0, width, 12)
  if (options.template !== "minimal") {
    ctx.save()
    ctx.globalAlpha = 0.06
    text(ctx, "KS", 1000, height - 170, 470, p.text, options, 900, "right", 900)
    ctx.restore()
  }
}

function header(ctx: CanvasRenderingContext2D, data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const compact = data.mode === "round"
  const brand = assets.get("/images/ks-logo.png")
  if (brand) contain(ctx, brand, 103, compact ? 80 : 100, compact ? 70 : 90)
  else text(ctx, "KS", 58, 127, 72, p.accentText, options, 120)
  text(ctx, "KS LIGA", 170, compact ? 85 : 105, compact ? 36 : 43, p.text, options, 490, "left", 900)
  text(ctx, "СПОРТИВНІ ПОДІЇ ОНЛАЙН!", 172, compact ? 112 : 135, 16, p.muted, options, 490, "left", 700)
  const label = options.showScores ? data.mode === "match" ? "РЕЗУЛЬТАТ" : "РЕЗУЛЬТАТИ" : "АНОНС МАТЧІВ"
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

function footer(ctx: CanvasRenderingContext2D, height: number, data: PosterData, options: PosterOptions, p: Palette, pageCount: number) {
  ctx.fillStyle = p.accent
  ctx.fillRect(0, height - 92, 1080, 92)
  text(ctx, options.footer, 60, height - 37, 26, p.onAccent, options, 570, "left", 800)
  const page = pageCount > 1 ? `${options.page + 1} / ${pageCount}` : data.mode === "match" ? "ЗУСТРІНЕМОСЯ НА ФУТБОЛІ" : "ПІДТРИМУЙ СВОЮ КОМАНДУ"
  text(ctx, page, 1020, height - 37, 18, p.onAccent, options, 340, "right", 800)
}

function findTeam(data: PosterData, match: Match, name: string) {
  const normalized = name.trim().toLocaleLowerCase("uk-UA")
  return data.teams.find((team) => team.championship_id === match.championship_id && team.name.trim().toLocaleLowerCase("uk-UA") === normalized)
}

function sponsorStrip(ctx: CanvasRenderingContext2D, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const sponsors = options.sponsors.filter((sponsor) => sponsor.url.trim())
  if (!sponsors.length) return
  const main = sponsors.find((sponsor) => sponsor.id === options.mainSponsorId) || sponsors[0]
  const others = sponsors.filter((sponsor) => sponsor.id !== main.id)
  const top = height - 92 - getPosterSponsorHeight(options)
  const mainX = others.length ? 210 : 540
  text(ctx, "ГОЛОВНИЙ ПАРТНЕР", mainX, top + 16, 14, p.muted, options, 300, "center")
  const drawSponsor = (sponsor: typeof main, x: number, y: number, width: number, size: number) => {
    box(ctx, x - width / 2, y - size / 2, width, size, 12, "#ffffff")
    const img = assets.get(sponsor.url)
    if (img) {
      const ratio = Math.min((width - 20) / img.naturalWidth, (size - 14) / img.naturalHeight)
      ctx.drawImage(img, x - img.naturalWidth * ratio / 2, y - img.naturalHeight * ratio / 2, img.naturalWidth * ratio, img.naturalHeight * ratio)
    } else text(ctx, sponsor.name || "Партнер", x, y + 6, 18, "#10203a", options, width - 18, "center")
  }
  const twoRows = others.length > 3
  drawSponsor(main, mainX, top + (twoRows ? 78 : 60), 300, twoRows ? 100 : 68)
  if (main.name) text(ctx, main.name, mainX, top + (twoRows ? 146 : 108), 14, p.muted, options, 300, "center")
  others.forEach((sponsor, index) => {
    const columns = twoRows ? 4 : others.length
    const row = Math.floor(index / columns)
    const columnWidth = 636 / columns
    const x = 384 + columnWidth * (index % columns + .5)
    const y = top + (twoRows ? 43 + row * 68 : 62)
    drawSponsor(sponsor, x, y, Math.min(200, columnWidth - 12), twoRows ? 42 : 46)
    if (sponsor.name) text(ctx, sponsor.name, x, y + (twoRows ? 34 : 39), 13, p.muted, options, columnWidth - 10, "center")
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
  logo(ctx, findTeam(data, match, match.home_team), match.home_team, 270, centerY, size, assets, p, options)
  logo(ctx, findTeam(data, match, match.away_team), match.away_team, 810, centerY, size, assets, p, options)
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
    const details = [multipleDates ? getPosterDateLabel([match]) : "", center && match.penalty_home != null && match.penalty_away != null ? `пен. ${match.penalty_home}:${match.penalty_away}` : "", center && match.is_technical_defeat ? "Технічний результат" : ""].filter(Boolean)
    const scorerRows = getPosterScorerRows(data, options, match)
    const detailHeight = details.length ? 16 : 0
    const scorerHeight = scorerRows ? scorerRows * 16 + 4 : 0
    const mainHeight = rowHeight - detailHeight - scorerHeight
    const logoSize = Math.min(58, mainHeight - 18)
    const centerY = y + mainHeight / 2
    logo(ctx, findTeam(data, match, match.home_team), match.home_team, 403, centerY, logoSize, assets, p, options)
    logo(ctx, findTeam(data, match, match.away_team), match.away_team, 677, centerY, logoSize, assets, p, options)
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

export async function renderPoster(canvas: HTMLCanvasElement, data: PosterData, options: PosterOptions): Promise<{ warnings: string[] }> {
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const pages = getPosterPages(data, options)
  const matches = pages[Math.max(0, Math.min(options.page, pages.length - 1))] || []
  const usedTeams = matches.flatMap((match) => [findTeam(data, match, match.home_team), findTeam(data, match, match.away_team)])
  const logoUrls = [...new Set(usedTeams.map((team) => team?.logo).filter((url): url is string => Boolean(url)))]
  const sponsorUrls = options.sponsors.map((sponsor) => sponsor.url).filter(Boolean)
  const urls = ["/images/ks-logo.png", ...logoUrls, ...sponsorUrls, ...(options.backgroundUrl ? [options.backgroundUrl] : [])]
  const assets: Assets = new Map(await Promise.all(urls.map(async (url) => [url, await loadImage(url, getPosterLogoSource(url, url === options.backgroundUrl ? 1920 : 256))] as const)))
  const warnings: string[] = []
  if (logoUrls.some((url) => !assets.get(url))) warnings.push("Деякі емблеми недоступні для експорту. Замість них використано ініціали команд.")
  if (sponsorUrls.some((url) => !assets.get(url))) warnings.push("Деякі логотипи спонсорів недоступні. Перевірте пряме посилання та дозвіл CORS; тимчасово показано назву партнера.")
  if (options.backgroundUrl && !assets.get(options.backgroundUrl)) warnings.push("Не вдалося прочитати фото тла. Оберіть зображення ще раз.")
  if (typeof document !== "undefined" && document.fonts) await document.fonts.ready
  canvas.width = format.width
  canvas.height = format.height
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Браузер не підтримує створення афіш. Спробуйте інший браузер.")
  const p = palette(options)
  background(ctx, format.width, format.height, p, options, assets)
  header(ctx, data, options, assets, p, format.height)
  if (!matches.length) text(ctx, "Матчів ще немає", 540, format.height / 2, 48, p.muted, options, 940, "center")
  else if (data.mode === "match") matchPoster(ctx, matches[0], data, options, assets, p, format.height)
  else roundPoster(ctx, matches, data, options, assets, p, format.height)
  sponsorStrip(ctx, options, assets, p, format.height)
  footer(ctx, format.height, data, options, p, pages.length)
  return { warnings }
}
