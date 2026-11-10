import type { Match, Team } from "../supabase"
import { getPosterLogoSource } from "./assets"
import {
  getPosterDateLabel,
  getPosterMatchScore,
  getPosterMatchTime,
  getPosterPages,
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
    ctx.drawImage(photo, (width - drawnWidth) / 2, (height - drawnHeight) / 2, drawnWidth, drawnHeight)
    ctx.fillStyle = options.template === "stadium" ? "rgba(5, 14, 28, 0.84)" : "rgba(248, 250, 252, 0.9)"
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
  const brand = assets.get("/images/ks-logo.png")
  if (brand) contain(ctx, brand, 103, 100, 90)
  else text(ctx, "KS", 58, 127, 72, p.accentText, options, 120)
  text(ctx, "KS LIGA", 170, 105, 43, p.text, options, 490, "left", 900)
  text(ctx, "ФУТБОЛЬНА СПІЛЬНОТА", 172, 135, 16, p.muted, options, 490, "left", 700)
  const label = options.showScores ? data.mode === "match" ? "РЕЗУЛЬТАТ" : "РЕЗУЛЬТАТИ" : "АНОНС МАТЧІВ"
  box(ctx, 758, 74, 264, 48, 24, p.accent)
  text(ctx, label, 890, 106, 22, p.onAccent, options, 225, "center", 800)
  const square = height === 1080
  const titleY = square ? 274 : height === 1920 ? 300 : 288
  text(ctx, data.championship?.name || "KS LIGA · ФУТБОЛ", 60, 192, 22, p.muted, options, 960, "left", 700)
  text(ctx, options.title || (data.mode === "match" ? "МАТЧ ДНЯ" : "КАЛЕНДАР МАТЧІВ"), 58, titleY, square ? 68 : height === 1920 ? 96 : 88, p.text, options, 960, "left", 900)
  if (options.subtitle.trim()) text(ctx, options.subtitle, 62, titleY + 41, 27, p.muted, options, 956, "left", 600)
  ctx.fillStyle = p.accent
  ctx.fillRect(60, titleY + 58, 92, 5)
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

function matchPoster(ctx: CanvasRenderingContext2D, match: Match, data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const square = height === 1080
  const centerY = height * (square ? 0.435 : 0.46)
  const size = square ? 158 : height === 1920 ? 240 : 204
  logo(ctx, findTeam(data, match, match.home_team), match.home_team, 270, centerY, size, assets, p, options)
  logo(ctx, findTeam(data, match, match.away_team), match.away_team, 810, centerY, size, assets, p, options)
  const score = options.showScores ? getPosterMatchScore(match) : null
  text(ctx, score || "VS", 540, centerY + 29, score ? 87 : 74, p.accentText, options, 255, "center", 900)
  const penaltyText = score && match.penalty_home != null && match.penalty_away != null ? `пен. ${match.penalty_home}:${match.penalty_away}` : score && match.is_technical_defeat ? "ТЕХНІЧНИЙ РЕЗУЛЬТАТ" : ""
  if (penaltyText) text(ctx, penaltyText, 540, centerY + 73, 18, p.muted, options, 244, "center", 700)
  const namesY = centerY + size / 2 + 62
  lines(ctx, match.home_team.toUpperCase(), 270, namesY, square ? 33 : 42, 400, options, p.text)
  lines(ctx, match.away_team.toUpperCase(), 810, namesY, square ? 33 : 42, 400, options, p.text)
  const dateY = height * 0.755
  const showTime = options.showTime && !score
  const dateLabel = getPosterDateLabel([match]).toUpperCase()
  const kickoff = getPosterMatchTime(match)
  box(ctx, 60, dateY - 52, 960, showTime ? 144 : 105, 22, p.card, p.line)
  text(ctx, dateLabel, 540, dateY, 40, p.text, options, 880, "center", 900)
  if (showTime) text(ctx, `${kickoff}${/^\d/.test(kickoff) ? " · ЗА КИЄВОМ" : ""}`, 540, dateY + 52, 27, p.accentText, options, 860, "center", 800)
  if (options.showVenue && options.venue.trim()) text(ctx, options.venue, 540, dateY + (showTime ? 143 : 107), 27, p.muted, options, 940, "center", 600)
}

function roundPoster(ctx: CanvasRenderingContext2D, matches: Match[], data: PosterData, options: PosterOptions, assets: Assets, p: Palette, height: number) {
  const startY = height === 1920 ? 450 : height === 1080 ? 380 : 400
  const available = height - 190 - startY
  const rowHeight = Math.min(height === 1920 ? 142 : 124, available / Math.max(matches.length, 1) - 12)
  const multipleDates = new Set(matches.map((match) => match.date)).size > 1
  const showTimezone = options.showTime && (!options.showScores || matches.some((match) => !match.is_finished))
  if (showTimezone) text(ctx, "ЧАС ЗА КИЄВОМ", 62, startY - 27, 16, p.muted, options, 300, "left", 700)
  text(ctx, getPosterDateLabel(matches).toUpperCase(), 1020, startY - 27, 21, p.muted, options, showTimezone ? 650 : 960, "right", 700)
  matches.forEach((match, index) => {
    const y = startY + index * (rowHeight + 12)
    box(ctx, 60, y, 960, rowHeight, 18, p.card, p.line)
    ctx.fillStyle = p.accent
    ctx.fillRect(60, y + 20, 4, rowHeight - 40)
    const center = options.showScores ? getPosterMatchScore(match) : null
    const details = [multipleDates ? getPosterDateLabel([match]) : "", center && match.penalty_home != null && match.penalty_away != null ? `пен. ${match.penalty_home}:${match.penalty_away}` : "", center && match.is_technical_defeat ? "Технічний результат" : ""].filter(Boolean)
    const logoSize = Math.min(58, rowHeight * 0.43)
    // Dense pages reserve a separate bottom band for date/penalty details.
    const centerY = y + (details.length ? (rowHeight - 24) / 2 + 2 : rowHeight / 2)
    logo(ctx, findTeam(data, match, match.home_team), match.home_team, 403, centerY, logoSize, assets, p, options)
    logo(ctx, findTeam(data, match, match.away_team), match.away_team, 677, centerY, logoSize, assets, p, options)
    const clock = options.showTime ? getPosterMatchTime(match) : "VS"
    const centerText = center || clock
    const centerHeight = Math.min(54, rowHeight * 0.49)
    box(ctx, 462, centerY - centerHeight / 2, 156, centerHeight, 10, p.accent)
    const centerSize = /^\d/.test(centerText) ? rowHeight < 104 ? 30 : 33 : centerText === "VS" ? 28 : 17
    text(ctx, centerText, 540, centerY + centerSize * 0.33, centerSize, p.onAccent, options, 142, "center", 900)
    const nameSize = rowHeight < 110 ? 23 : 27
    lines(ctx, match.home_team.toUpperCase(), 350, centerY, nameSize, 250, options, p.text, 2, "right", true)
    lines(ctx, match.away_team.toUpperCase(), 730, centerY, nameSize, 250, options, p.text, 2, "left", true)
    if (details.length) text(ctx, details.join(" · "), 540, y + rowHeight - 13, rowHeight < 110 ? 16 : 18, p.muted, options, 870, "center", 600)
  })
  if (options.showVenue && options.venue.trim()) text(ctx, options.venue, 540, height - 132, 24, p.muted, options, 950, "center", 600)
}

export async function renderPoster(canvas: HTMLCanvasElement, data: PosterData, options: PosterOptions): Promise<{ warnings: string[] }> {
  const format = POSTER_FORMATS.find((item) => item.id === options.format) || POSTER_FORMATS[0]
  const pages = getPosterPages(data, options)
  const matches = pages[Math.max(0, Math.min(options.page, pages.length - 1))] || []
  const usedTeams = matches.flatMap((match) => [findTeam(data, match, match.home_team), findTeam(data, match, match.away_team)])
  const logoUrls = [...new Set(usedTeams.map((team) => team?.logo).filter((url): url is string => Boolean(url)))]
  const urls = ["/images/ks-logo.png", ...logoUrls, ...(options.backgroundUrl ? [options.backgroundUrl] : [])]
  const assets: Assets = new Map(await Promise.all(urls.map(async (url) => [url, await loadImage(url, logoUrls.includes(url) ? getPosterLogoSource(url) : url)] as const)))
  const warnings: string[] = []
  if (logoUrls.some((url) => !assets.get(url))) warnings.push("Деякі емблеми недоступні для експорту. Замість них використано ініціали команд.")
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
  footer(ctx, format.height, data, options, p, pages.length)
  return { warnings }
}
