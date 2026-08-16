"use client"

import { ProAvatar, ProClub } from "@/lib/pro-types"
import { Sparkles, Dice5, User } from "lucide-react"

// Color maps
export const SKIN_TONES = [
  { id: "fair", label: "Світлий", color: "#F8D9BD", shadow: "#E0B695" },
  { id: "peach", label: "Персиковий", color: "#F5C7A9", shadow: "#DBA382" },
  { id: "tan", label: "Засмаглий", color: "#E0AC69", shadow: "#C68E4D" },
  { id: "bronze", label: "Бронзовий", color: "#C68642", shadow: "#A66A2B" },
  { id: "dark", label: "Смаглявий", color: "#8D5524", shadow: "#693D15" }
]

export const HAIR_STYLES = [
  { id: "short_fade", label: "Короткий Фейд" },
  { id: "buzz", label: "Мілітарі / Їжачок" },
  { id: "curly", label: "Кучеряве" },
  { id: "mohawk", label: "Ірокез" },
  { id: "long", label: "Довге з пов'язкою" },
  { id: "classic", label: "Класичний проділ" },
  { id: "slick", label: "Зачесане назад" },
  { id: "dreadlocks", label: "Дреди" }
]

export const HAIR_COLORS = [
  { id: "black", label: "Чорний", color: "#171717", highlight: "#333333" },
  { id: "dark_brown", label: "Темно-каштановий", color: "#3B2219", highlight: "#5A382B" },
  { id: "light_brown", label: "Русявий", color: "#785338", highlight: "#996D4D" },
  { id: "blonde", label: "Блонд", color: "#E6C280", highlight: "#F7E1B5" },
  { id: "ginger", label: "Рудий", color: "#B84A1C", highlight: "#D96838" },
  { id: "platinum", label: "Платиновий", color: "#D1D5DB", highlight: "#F3F4F6" }
]

export const EYE_COLORS = [
  { id: "brown", label: "Карі", color: "#4A2E18" },
  { id: "blue", label: "Блакитні", color: "#2563EB" },
  { id: "green", label: "Зелені", color: "#16A34A" },
  { id: "amber", label: "Бурштинові", color: "#D97706" },
  { id: "dark", label: "Темні", color: "#18181B" }
]

export const FACIAL_HAIR = [
  { id: "none", label: "Без бороди" },
  { id: "stubble", label: "Легка щетина" },
  { id: "mustache", label: "Вуса" },
  { id: "goatee", label: "Еспаньйолка" },
  { id: "full_beard", label: "Густа борода" }
]

export const DEFAULT_AVATAR: ProAvatar = {
  skin_tone: "peach",
  face_shape: "oval",
  hair_style: "short_fade",
  hair_color: "dark_brown",
  eye_shape: "normal",
  eye_color: "brown",
  nose_type: "straight",
  mouth_type: "confident",
  facial_hair: "stubble"
}

interface ProAvatarRendererProps {
  avatar?: ProAvatar
  club?: ProClub
  size?: number
  className?: string
}

export function ProAvatarRenderer({
  avatar = DEFAULT_AVATAR,
  club,
  size = 120,
  className = ""
}: ProAvatarRendererProps) {
  const skin = SKIN_TONES.find((s) => s.id === avatar.skin_tone) || SKIN_TONES[1]
  const hair = HAIR_COLORS.find((h) => h.id === avatar.hair_color) || HAIR_COLORS[1]
  const eye = EYE_COLORS.find((e) => e.id === avatar.eye_color) || EYE_COLORS[0]

  const primaryJersey = club?.primary_color || "#166534"
  const secondaryJersey = club?.secondary_color || "#FACC15"

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 drop-shadow-md ${className}`}
    >
      <defs>
        {/* Gradients */}
        <radialGradient id={`skin-grad-${avatar.skin_tone}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor={skin.color} />
          <stop offset="100%" stopColor={skin.shadow} />
        </radialGradient>

        <linearGradient id={`hair-grad-${avatar.hair_color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={hair.highlight} />
          <stop offset="100%" stopColor={hair.color} />
        </linearGradient>

        <linearGradient id="jersey-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primaryJersey} />
          <stop offset="100%" stopColor={secondaryJersey} />
        </linearGradient>
      </defs>

      {/* ─── 1. BACKGROUND GLOW & COLLAR ─── */}
      <circle cx="60" cy="60" r="58" fill="#0B1320" />

      {/* ─── 2. JERSEY / SHOULDERS ─── */}
      <path
        d="M20 120 C20 95, 40 85, 60 85 C80 85, 100 95, 100 120 Z"
        fill="url(#jersey-grad)"
      />
      {/* Jersey Collar */}
      <path
        d="M48 85 L60 100 L72 85 Z"
        fill="#FFFFFF"
        opacity="0.9"
      />
      <circle cx="60" cy="107" r="3" fill="#FFFFFF" opacity="0.8" />

      {/* ─── 3. NECK ─── */}
      <rect
        x="50"
        y="70"
        width="20"
        height="20"
        rx="4"
        fill={skin.shadow}
      />

      {/* ─── 4. EARS ─── */}
      <ellipse cx="32" cy="54" rx="4.5" ry="7" fill={skin.shadow} />
      <ellipse cx="88" cy="54" rx="4.5" ry="7" fill={skin.shadow} />

      {/* ─── 5. HEAD / FACE SHAPE ─── */}
      {avatar.face_shape === "square" ? (
        <path
          d="M34 40 C34 26, 86 26, 86 40 L86 64 C86 76, 76 80, 60 80 C44 80, 34 76, 34 64 Z"
          fill={`url(#skin-grad-${avatar.skin_tone})`}
        />
      ) : avatar.face_shape === "round" ? (
        <circle
          cx="60"
          cy="52"
          r="26"
          fill={`url(#skin-grad-${avatar.skin_tone})`}
        />
      ) : (
        /* Oval Default */
        <path
          d="M35 42 C35 27, 85 27, 85 42 C85 64, 76 78, 60 78 C44 78, 35 64, 35 42 Z"
          fill={`url(#skin-grad-${avatar.skin_tone})`}
        />
      )}

      {/* ─── 6. EYES & BROWS ─── */}
      {/* Eyebrows */}
      <path
        d="M42 42 Q49 39 54 42"
        stroke={hair.color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <path
        d="M66 42 Q71 39 78 42"
        stroke={hair.color}
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Left Eye */}
      <ellipse cx="48" cy="48" rx="4.5" ry="3" fill="#FFFFFF" />
      <circle cx="48" cy="48" r="2.2" fill={eye.color} />
      <circle cx="47" cy="47" r="0.8" fill="#FFFFFF" />

      {/* Right Eye */}
      <ellipse cx="72" cy="48" rx="4.5" ry="3" fill="#FFFFFF" />
      <circle cx="72" cy="48" r="2.2" fill={eye.color} />
      <circle cx="71" cy="47" r="0.8" fill="#FFFFFF" />

      {/* ─── 7. NOSE ─── */}
      {avatar.nose_type === "button" ? (
        <circle cx="60" cy="58" r="2.5" fill={skin.shadow} />
      ) : avatar.nose_type === "roman" ? (
        <path
          d="M59 46 L63 56 L58 58"
          stroke={skin.shadow}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M60 48 L62 57 L58 58"
          stroke={skin.shadow}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {/* ─── 8. MOUTH ─── */}
      {avatar.mouth_type === "smile" ? (
        <path
          d="M52 66 Q60 72 68 66"
          stroke="#8A3838"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="#FFFFFF"
        />
      ) : avatar.mouth_type === "smirk" ? (
        <path
          d="M53 67 Q62 68 68 64"
          stroke="#8A3838"
          strokeWidth="2.2"
          strokeLinecap="round"
        />
      ) : (
        /* Confident Neutral */
        <path
          d="M54 66 Q60 67 66 66"
          stroke="#8A3838"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* ─── 9. FACIAL HAIR ─── */}
      {avatar.facial_hair === "stubble" && (
        <path
          d="M48 68 Q60 78 72 68 Q60 74 48 68"
          fill={hair.color}
          opacity="0.25"
        />
      )}
      {avatar.facial_hair === "mustache" && (
        <path
          d="M50 63 Q60 60 70 63 Q60 66 50 63"
          fill={hair.color}
          opacity="0.9"
        />
      )}
      {avatar.facial_hair === "goatee" && (
        <path
          d="M54 64 Q60 63 66 64 L64 74 Q60 76 56 74 Z"
          fill={hair.color}
          opacity="0.85"
        />
      )}
      {avatar.facial_hair === "full_beard" && (
        <path
          d="M34 50 C34 76, 44 82, 60 82 C76 82, 86 76, 86 50 C80 62, 70 74, 60 74 C50 74, 40 62, 34 50 Z"
          fill={hair.color}
          opacity="0.9"
        />
      )}

      {/* ─── 10. HAIR STYLE ─── */}
      {avatar.hair_style === "buzz" && (
        <path
          d="M35 38 C35 24, 85 24, 85 38 C80 28, 40 28, 35 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
          opacity="0.9"
        />
      )}

      {avatar.hair_style === "short_fade" && (
        <path
          d="M34 38 C34 20, 86 20, 86 38 C82 32, 74 27, 60 27 C46 27, 38 32, 34 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {avatar.hair_style === "curly" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <circle cx="40" cy="28" r="8" />
          <circle cx="50" cy="24" r="9" />
          <circle cx="60" cy="23" r="9" />
          <circle cx="70" cy="24" r="9" />
          <circle cx="80" cy="28" r="8" />
          <circle cx="34" cy="36" r="6" />
          <circle cx="86" cy="36" r="6" />
        </g>
      )}

      {avatar.hair_style === "mohawk" && (
        <path
          d="M50 36 C50 14, 70 14, 70 36 C65 24, 55 24, 50 36 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {avatar.hair_style === "long" && (
        <g>
          {/* Headband */}
          <path
            d="M33 40 C45 32, 75 32, 87 40 L87 43 C75 35, 45 35, 33 43 Z"
            fill="#FFFFFF"
          />
          <path
            d="M32 40 C32 18, 88 18, 88 40 C88 60, 85 70, 82 72 C80 60, 82 35, 60 30 C38 35, 40 60, 38 72 C35 70, 32 60, 32 40 Z"
            fill={`url(#hair-grad-${avatar.hair_color})`}
          />
        </g>
      )}

      {avatar.hair_style === "classic" && (
        <path
          d="M33 40 C33 20, 87 20, 87 40 C75 26, 45 28, 33 40 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {avatar.hair_style === "slick" && (
        <path
          d="M34 38 C34 18, 86 18, 86 38 C75 28, 45 28, 34 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {avatar.hair_style === "dreadlocks" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <rect x="32" y="24" width="6" height="30" rx="3" transform="rotate(-15 32 24)" />
          <rect x="42" y="18" width="6" height="32" rx="3" transform="rotate(-5 42 18)" />
          <rect x="52" y="16" width="6" height="34" rx="3" />
          <rect x="62" y="16" width="6" height="34" rx="3" />
          <rect x="72" y="18" width="6" height="32" rx="3" transform="rotate(5 72 18)" />
          <rect x="82" y="24" width="6" height="30" rx="3" transform="rotate(15 82 24)" />
        </g>
      )}
    </svg>
  )
}

interface ProAvatarBuilderProps {
  value: ProAvatar
  onChange: (avatar: ProAvatar) => void
  club?: ProClub
}

export function ProAvatarBuilder({
  value,
  onChange,
  club
}: ProAvatarBuilderProps) {
  const randomize = () => {
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id
    const randomHair = HAIR_STYLES[Math.floor(Math.random() * HAIR_STYLES.length)].id
    const randomColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id
    const randomEye = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].id
    const randomBeard = FACIAL_HAIR[Math.floor(Math.random() * FACIAL_HAIR.length)].id

    onChange({
      ...value,
      skin_tone: randomSkin,
      hair_style: randomHair,
      hair_color: randomColor,
      eye_color: randomEye,
      facial_hair: randomBeard
    })
  }

  return (
    <div className="space-y-5">
      {/* Top Preview Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-slate-950/80 border border-emerald-500/30 shadow-xl">
        <div className="flex items-center gap-4">
          <ProAvatarRenderer avatar={value} club={club} size={100} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Попередній перегляд
            </span>
            <h4 className="text-base font-black text-white">
              Обличчя твого футболіста
            </h4>
            <p className="text-xs text-slate-400">
              Цей аватар буде відображатися на твоїй 3D картці, в пресі та на табло!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={randomize}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 font-bold text-xs flex items-center gap-2 transition-all active:scale-95 cursor-pointer shadow-md shrink-0"
        >
          <Dice5 className="w-4 h-4 text-amber-400" />
          <span>Випадковий вигляд</span>
        </button>
      </div>

      {/* Customizer Controls Grid */}
      <div className="space-y-4 text-xs">
        {/* 1. Skin Tone */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 block">
            Колір шкіри:
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {SKIN_TONES.map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => onChange({ ...value, skin_tone: st.id })}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  value.skin_tone === st.id
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: st.color }}
                />
                <span>{st.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 2. Hair Style */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 block">
            Зачіска:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {HAIR_STYLES.map((hs) => (
              <button
                key={hs.id}
                type="button"
                onClick={() => onChange({ ...value, hair_style: hs.id })}
                className={`py-2 px-3 rounded-xl font-bold transition-all text-center cursor-pointer ${
                  value.hair_style === hs.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                {hs.label}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Hair Color */}
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300 block">
            Колір волосся:
          </label>
          <div className="flex items-center gap-2 flex-wrap">
            {HAIR_COLORS.map((hc) => (
              <button
                key={hc.id}
                type="button"
                onClick={() => onChange({ ...value, hair_color: hc.id })}
                className={`px-3 py-1.5 rounded-xl flex items-center gap-2 font-bold transition-all cursor-pointer ${
                  value.hair_color === hc.id
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: hc.color }}
                />
                <span>{hc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Eyes & Facial Hair */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Eyes Color */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              Колір очей:
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {EYE_COLORS.map((ec) => (
                <button
                  key={ec.id}
                  type="button"
                  onClick={() => onChange({ ...value, eye_color: ec.id })}
                  className={`px-2.5 py-1.5 rounded-xl flex items-center gap-1.5 font-bold transition-all cursor-pointer ${
                    value.eye_color === ec.id
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                      : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  <span
                    className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                    style={{ backgroundColor: ec.color }}
                  />
                  <span>{ec.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Facial Hair */}
          <div className="space-y-1.5">
            <label className="font-bold text-slate-300 block">
              Борода / Щетина:
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {FACIAL_HAIR.map((fh) => (
                <button
                  key={fh.id}
                  type="button"
                  onClick={() => onChange({ ...value, facial_hair: fh.id })}
                  className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                    value.facial_hair === fh.id
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                      : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                  }`}
                >
                  {fh.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
