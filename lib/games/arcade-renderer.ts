import {
  GATE_ROW,
  GRID,
  GROUND,
  RUN_HEIGHT,
  RUN_WIDTH,
  type ArcadeState,
  type GameEvent,
  type RunnerState,
  type SnakeState,
} from "./arcade-engine"

export const KITS = [
  { name: "Volt", primary: "#c8ff5f", secondary: "#72dd65" },
  { name: "Ice", primary: "#6de6ff", secondary: "#658aff" },
  { name: "Sunset", primary: "#ffb184", secondary: "#ff6d9b" },
] as const
type Kit = (typeof KITS)[number]
type Particle = {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  color: string
  text?: string
}
const TAU = Math.PI * 2

function box(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, radius)
  ctx.fill()
}
function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) {
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, r, 0, TAU)
  ctx.fill()
}
function line(
  ctx: CanvasRenderingContext2D,
  points: number[],
  color: string,
  width = 1,
) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(points[0], points[1])
  for (let i = 2; i < points.length; i += 2)
    ctx.lineTo(points[i], points[i + 1])
  ctx.stroke()
}
function ball(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  golden = false,
) {
  circle(ctx, x, y, r + 4, golden ? "#ffc86a22" : "#d4ff7220")
  circle(ctx, x, y, r, golden ? "#ffd078" : "#eaf9df")
  ctx.fillStyle = golden ? "#92652b" : "#304744"
  ctx.beginPath()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2
    const px = x + Math.cos(a) * r * 0.43
    const py = y + Math.sin(a) * r * 0.43
    if (!i) ctx.moveTo(px, py)
    else ctx.lineTo(px, py)
  }
  ctx.closePath()
  ctx.fill()
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU - Math.PI / 2
    line(
      ctx,
      [
        x + Math.cos(a) * r * 0.42,
        y + Math.sin(a) * r * 0.42,
        x + Math.cos(a) * r * 0.9,
        y + Math.sin(a) * r * 0.9,
      ],
      golden ? "#aa793b" : "#6a8174",
      1,
    )
  }
}

function stadium(ctx: CanvasRenderingContext2D) {
  const sky = ctx.createLinearGradient(0, 0, 0, RUN_HEIGHT)
  sky.addColorStop(0, "#0a1725")
  sky.addColorStop(0.62, "#192a35")
  sky.addColorStop(1, "#0a201c")
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, RUN_WIDTH, RUN_HEIGHT)
  const glow = ctx.createRadialGradient(480, 80, 0, 480, 80, 220)
  glow.addColorStop(0, "#91e6d216")
  glow.addColorStop(1, "#91e6d200")
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, RUN_WIDTH, GROUND)
  circle(ctx, 485, 58, 22, "#d7ede3")
  circle(ctx, 477, 51, 22, "#142932")
  for (let i = 0; i < 38; i++)
    circle(
      ctx,
      (i * 137.3) % 640,
      12 + ((i * 49.7) % 140),
      i % 4 === 0 ? 1.2 : 0.6,
      "#bed8d657",
    )
  // City silhouette and the stadium's illuminated cantilever roof.
  for (let i = 0; i < 24; i++) {
    const h = 14 + ((i * 31) % 62)
    box(ctx, i * 29 - 4, 182 - h, 21, h, 1, "#101e2b")
    for (let j = 0; j < 3; j++)
      box(ctx, i * 29 + 2, 187 - h + j * 12, 3, 3, 0, "#9ebbb32b")
  }
  ctx.fillStyle = "#24353d"
  ctx.beginPath()
  ctx.moveTo(0, 172)
  ctx.quadraticCurveTo(320, 117, 640, 172)
  ctx.lineTo(640, 183)
  ctx.quadraticCurveTo(320, 141, 0, 183)
  ctx.fill()
  ctx.strokeStyle = "#81cfc371"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(0, 173)
  ctx.quadraticCurveTo(320, 118, 640, 173)
  ctx.stroke()
  for (let row = 0; row < 5; row++) {
    const y = 190 + row * 11
    box(ctx, 0, y + 4, 640, 5, 0, "#0b1b28")
    for (let col = 0; col < 64; col++)
      box(
        ctx,
        col * 11 + (row % 2) * 4,
        y,
        3,
        3,
        1,
        ["#9faf8170", "#718e9760", "#345266", "#8dc1b750"][
          (col * 7 + row * 3) % 4
        ],
      )
  }
  for (const x of [46, 589]) {
    line(ctx, [x, 86, x, 200], "#3f545a", 3)
    box(ctx, x - 23, 78, 46, 12, 2, "#354951")
    for (let i = 0; i < 7; i++) box(ctx, x - 20 + i * 6, 81, 4, 5, 1, "#e7ffd7")
    const beam = ctx.createLinearGradient(x, 85, x, 255)
    beam.addColorStop(0, "#dfffe311")
    beam.addColorStop(1, "#dfffe300")
    ctx.fillStyle = beam
    ctx.beginPath()
    ctx.moveTo(x - 18, 88)
    ctx.lineTo(x - 75, 265)
    ctx.lineTo(x + 125, 265)
    ctx.lineTo(x + 18, 88)
    ctx.fill()
  }
  box(ctx, 0, 250, 640, 26, 0, "#102a2b")
  line(ctx, [0, 250, 640, 250], "#aaf07265")
  ctx.font = "800 10px system-ui"
  ctx.textAlign = "left"
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 2 ? "#91a6a3" : "#c8ff5f"
    ctx.fillText(
      i % 2 ? "THE GAME IS YOURS" : "KS LIGA  /  PLAY",
      i * 126 + 12,
      267,
    )
  }
  const pitch = ctx.createLinearGradient(0, 276, 0, 360)
  pitch.addColorStop(0, "#204a3e")
  pitch.addColorStop(1, "#0b201f")
  ctx.fillStyle = pitch
  ctx.fillRect(0, 276, 640, 84)
  line(ctx, [0, GROUND + 2, 640, GROUND + 2], "#bded9f", 2)
  line(ctx, [0, 340, 640, 340], "#a1cdbc2b")
}

function snakePitch(ctx: CanvasRenderingContext2D) {
  ctx.fillStyle = "#0e2525"
  ctx.fillRect(0, 0, 480, 480)
  for (let i = 0; i < 6; i++) box(ctx, 0, i * 80, 480, 40, 0, "#ffffff03")
  const cell = 480 / GRID
  for (let i = 0; i <= GRID; i++) {
    line(ctx, [i * cell, 0, i * cell, 480], "#b9e9cb07")
    line(ctx, [0, i * cell, 480, i * cell], "#b9e9cb07")
  }
  ctx.strokeStyle = "#aeddd21f"
  ctx.lineWidth = 1.5
  ctx.strokeRect(17, 17, 446, 446)
  ctx.strokeRect(140, 17, 200, 67)
  ctx.strokeRect(140, 396, 200, 67)
  ctx.strokeRect(187, 17, 106, 28)
  ctx.strokeRect(187, 435, 106, 28)
  line(ctx, [17, 240, 463, 240], "#aeddd21f", 1.5)
  ctx.beginPath()
  ctx.arc(240, 240, 55, 0, TAU)
  ctx.stroke()
  circle(ctx, 240, 240, 3, "#aeddd233")
  ctx.fillStyle = "#b5d7c90c"
  ctx.font = "900 75px system-ui"
  ctx.textAlign = "center"
  ctx.fillText("KS", 240, 180)
}

export class ArcadeRenderer {
  private background: HTMLCanvasElement
  private particles: Particle[] = []
  constructor(kind: "dino" | "snake") {
    this.background = document.createElement("canvas")
    this.background.width = kind === "dino" ? RUN_WIDTH : 480
    this.background.height = kind === "dino" ? RUN_HEIGHT : 480
    const ctx = this.background.getContext("2d")
    if (ctx) {
      if (kind === "dino") stadium(ctx)
      else snakePitch(ctx)
    }
  }

  event(event: GameEvent, kind: "dino" | "snake", kit: Kit, reduced: boolean) {
    const x = kind === "snake" ? ((event.x + 0.5) * 480) / GRID : event.x
    const y = kind === "snake" ? ((event.y + 0.5) * 480) / GRID : event.y
    const color =
      event.type === "crash"
        ? "#ff8c86"
        : event.type === "bonus"
          ? "#ffd078"
          : kit.primary
    if (event.text)
      this.particles.push({
        x,
        y: y - 14,
        vx: 0,
        vy: -28,
        life: 0.9,
        color,
        text: event.text,
      })
    if (!reduced)
      for (let i = 0; i < 7; i++)
        this.particles.push({
          x,
          y,
          vx: Math.cos((i / 7) * TAU) * 60,
          vy: Math.sin((i / 7) * TAU) * 60 - 20,
          life: 0.5,
          color,
        })
    this.particles = this.particles.slice(-64)
  }

  draw(
    ctx: CanvasRenderingContext2D,
    state: ArcadeState,
    kitIndex: number,
    dt: number,
    reduced: boolean,
    preview: boolean,
  ) {
    const kit = KITS[kitIndex] ?? KITS[0]
    ctx.drawImage(this.background, 0, 0)
    if (state.kind === "dino") this.runner(ctx, state, kit, reduced, preview)
    else this.snake(ctx, state, kit, reduced, preview)
    for (const particle of this.particles) {
      particle.life -= dt
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      ctx.globalAlpha = Math.max(0, Math.min(1, particle.life * 2))
      if (particle.text) {
        ctx.fillStyle = particle.color
        ctx.font = "900 16px system-ui"
        ctx.textAlign = "center"
        ctx.fillText(particle.text, particle.x, particle.y)
      } else box(ctx, particle.x, particle.y, 3, 3, 1, particle.color)
    }
    ctx.globalAlpha = 1
    this.particles = this.particles.filter((p) => p.life > 0)
  }

  private runner(
    ctx: CanvasRenderingContext2D,
    state: RunnerState,
    kit: Kit,
    reduced: boolean,
    preview: boolean,
  ) {
    const distance = preview ? 100 : state.distance
    for (let i = 0; i < 12; i++) {
      const x = i * 80 - (distance % 80)
      line(ctx, [x, 291, x - 70, 360], "#a2e3b314")
    }
    const hurdles = preview
      ? [
          { x: 370, air: false, passed: false },
          { x: 590, air: true, passed: false },
        ]
      : state.hurdles
    for (const hurdle of hurdles) {
      if (hurdle.passed && state.rush > 0) continue
      const y = hurdle.air ? GROUND - 76 : GROUND - 40
      if (hurdle.air) {
        box(ctx, hurdle.x - 3, y, 45, 35, 6, "#402e39")
        box(ctx, hurdle.x, y + 3, 39, 27, 4, "#f49d8760")
        line(
          ctx,
          [hurdle.x + 7, y + 14, hurdle.x + 19, y + 23, hurdle.x + 31, y + 14],
          "#ffc1a4",
          3,
        )
        line(
          ctx,
          [
            hurdle.x + 2,
            y - 5,
            hurdle.x + 10,
            y - 5,
            hurdle.x + 27,
            y - 5,
            hurdle.x + 38,
            y - 5,
          ],
          "#92a6b3",
          2,
        )
      } else {
        box(ctx, hurdle.x + 2, GROUND - 35, 5, 35, 1, "#667c7b")
        box(ctx, hurdle.x + 32, GROUND - 35, 5, 35, 1, "#667c7b")
        box(ctx, hurdle.x - 1, y, 43, 25, 3, "#eb9f83")
        ctx.save()
        ctx.beginPath()
        ctx.rect(hurdle.x, y, 41, 25)
        ctx.clip()
        for (let i = -1; i < 4; i++)
          line(
            ctx,
            [hurdle.x + i * 19, y, hurdle.x + i * 19 + 18, y + 25],
            "#463a39",
            8,
          )
        ctx.restore()
      }
    }
    const coins = preview
      ? [
          { x: 339, y: GROUND - 98, taken: false },
          { x: 389, y: GROUND - 98, taken: false },
          { x: 440, y: GROUND - 98, taken: false },
        ]
      : state.coins
    for (const coin of coins)
      ball(
        ctx,
        coin.x,
        coin.y +
          (reduced ? 0 : Math.sin(state.elapsed * 5 + coin.x * 0.02) * 2),
        9,
      )
    const x = 86,
      y = GROUND - state.y
    ctx.fillStyle = "#010d1580"
    ctx.beginPath()
    ctx.ellipse(
      x + 17,
      GROUND + 5,
      Math.max(10, 23 - state.y * 0.045),
      5,
      0,
      0,
      TAU,
    )
    ctx.fill()
    if (state.rush > 0) {
      circle(ctx, x + 18, y - 25, 37, "#c8ff5f15")
      ctx.strokeStyle = kit.primary
      ctx.lineWidth = 1.5
      ctx.beginPath()
      ctx.arc(x + 18, y - 25, 36, -0.8, 4.1)
      ctx.stroke()
    }
    if (!reduced)
      for (let i = 1; i < 5; i++)
        box(
          ctx,
          x - i * 10,
          y - 28 + i,
          11,
          3,
          2,
          `${kit.primary}${state.rush ? "65" : "20"}`,
        )
    ctx.save()
    ctx.translate(x, y)
    if (state.slide && state.y === 0) {
      ctx.translate(6, -4)
      ctx.rotate(-Math.PI / 2.5)
      ctx.scale(0.86, 0.86)
    }
    const stride = state.y > 0 || reduced ? 3 : Math.sin(state.elapsed * 20) * 7
    line(ctx, [12, -15, 6 - stride, -3, 15 - stride, -2], "#dcebd8", 6)
    line(ctx, [23, -15, 25 + stride, -5, 32 + stride, -3], kit.secondary, 6)
    box(ctx, 7, -36, 24, 23, 5, kit.primary)
    box(ctx, 8, -17, 23, 8, 2, "#192b33")
    line(ctx, [12, -32, 1 - stride * 0.5, -23], kit.secondary, 5)
    line(ctx, [27, -31, 35, -24, 40, -30], "#efc6a2", 5)
    circle(ctx, 23, -46, 10, "#efc6a2")
    box(ctx, 13, -56, 22, 10, 4, "#1a3036")
    box(ctx, 21, -51, 20, 4, 2, kit.primary)
    box(ctx, 28, -44, 4, 3, 1, "#213e43")
    ctx.fillStyle = "#22372d"
    ctx.font = "900 12px system-ui"
    ctx.textAlign = "center"
    ctx.fillText("7", 20, -21)
    ctx.restore()
    if (state.rush > 0) {
      ctx.font = "900 12px system-ui"
      ctx.textAlign = "right"
      ctx.fillStyle = kit.primary
      ctx.fillText(`TURBO ×2  /  ${Math.ceil(state.rush)}s`, 620, 30)
    }
  }

  private snake(
    ctx: CanvasRenderingContext2D,
    state: SnakeState,
    kit: Kit,
    reduced: boolean,
    preview: boolean,
  ) {
    const cell = 480 / GRID
    const gateY = GATE_ROW * cell
    for (const x of [0, 473]) {
      box(ctx, x === 0 ? 0 : 454, gateY - 5, 26, cell + 10, 8, "#7ebdff12")
      box(ctx, x, gateY, 7, cell, 3, "#83c8ff")
      for (let i = 0; i < 3; i++)
        line(
          ctx,
          [
            x === 0 ? 11 + i * 4 : 468 - i * 4,
            gateY + 7,
            x === 0 ? 15 + i * 4 : 464 - i * 4,
            gateY + 13,
            x === 0 ? 11 + i * 4 : 468 - i * 4,
            gateY + 19,
          ],
          "#93ccff78",
          1,
        )
    }
    const body = preview
      ? [
          { x: 10, y: 8 },
          { x: 9, y: 8 },
          { x: 8, y: 8 },
          { x: 7, y: 8 },
          { x: 6, y: 8 },
          { x: 6, y: 9 },
          { x: 6, y: 10 },
          { x: 5, y: 10 },
          { x: 4, y: 10 },
        ]
      : state.body
    const fraction =
      preview || reduced ? 1 : Math.min(1, state.accumulator / state.interval)
    for (let i = body.length - 1; i >= 0; i--) {
      let { x, y } = body[i]
      const previous = state.previous[i] ?? state.previous.at(-1)
      if (
        !preview &&
        previous &&
        Math.abs(previous.x - x) + Math.abs(previous.y - y) <= 1
      ) {
        x = previous.x + (x - previous.x) * fraction
        y = previous.y + (y - previous.y) * fraction
      }
      const px = x * cell + 2,
        py = y * cell + 2
      if (i === 0 && !reduced) {
        ctx.shadowColor = kit.primary
        ctx.shadowBlur = 12
      }
      box(
        ctx,
        px,
        py,
        cell - 4,
        cell - 4,
        i === 0 ? 8 : 6,
        i === 0 ? kit.primary : kit.secondary,
      )
      ctx.shadowBlur = 0
      if (i > 0) box(ctx, px + 4, py + 4, cell - 12, 2, 1, "#ffffff24")
      if (i === 0) {
        const dir = preview ? "right" : state.direction
        const eyes =
          dir === "right"
            ? [
                [16, 6],
                [16, 15],
              ]
            : dir === "left"
              ? [
                  [6, 6],
                  [6, 15],
                ]
              : dir === "up"
                ? [
                    [6, 6],
                    [15, 6],
                  ]
                : [
                    [6, 16],
                    [15, 16],
                  ]
        for (const [ex, ey] of eyes)
          circle(ctx, px + ex, py + ey, 2.1, "#193433")
      }
    }
    const food = preview ? { x: 12, y: 8 } : state.food
    if (food) ball(ctx, (food.x + 0.5) * cell, (food.y + 0.5) * cell, 9)
    const golden = preview ? { x: 13, y: 4 } : state.golden
    if (golden) {
      const x = (golden.x + 0.5) * cell,
        y = (golden.y + 0.5) * cell
      ball(ctx, x, y, 10, true)
      ctx.strokeStyle = "#ffd078"
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(
        x,
        y,
        16,
        -Math.PI / 2,
        -Math.PI / 2 + TAU * (preview ? 0.8 : state.goldenTime / 8),
      )
      ctx.stroke()
    }
  }
}
