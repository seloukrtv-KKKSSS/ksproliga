"use client"

import { ProAvatar, ProClub } from "@/lib/pro-types"
import { Sparkles, Dice5, User, Heart, Zap, Crown } from "lucide-react"

// Color maps
export const SKIN_TONES = [
  { id: "fair", label: "Світлий", color: "#F8D9BD", shadow: "#E0B695", icon: "🥛" },
  { id: "peach", label: "Персиковий", color: "#F5C7A9", shadow: "#DBA382", icon: "🍑" },
  { id: "tan", label: "Засмаглий", color: "#E0AC69", shadow: "#C68E4D", icon: "☀️" },
  { id: "bronze", label: "Бронзовий", color: "#C68642", shadow: "#A66A2B", icon: "🥉" },
  { id: "dark", label: "Смаглявий", color: "#8D5524", shadow: "#693D15", icon: "☕" }
]

export const MALE_HAIR_STYLES = [
  { id: "short_fade", label: "Короткий Фейд", icon: "✂️" },
  { id: "buzz", label: "Мілітарі / Їжачок", icon: "🪖" },
  { id: "curly", label: "Кучеряве", icon: "🌀" },
  { id: "mohawk", label: "Ірокез", icon: "⚡" },
  { id: "long", label: "Довге з пов'язкою", icon: "🧣" },
  { id: "classic", label: "Класичний проділ", icon: "👔" },
  { id: "slick", label: "Зачесане назад", icon: "✨" },
  { id: "dreadlocks", label: "Дреди", icon: "🌴" }
]

export const FEMALE_HAIR_STYLES = [
  { id: "female_ponytail", label: "Кінський Хвіст (Понітейл)", icon: "👱‍♀️" },
  { id: "female_long", label: "Довге хвилясте", icon: "🌊" },
  { id: "female_bob", label: "Стильне Каре / Боб", icon: "💇‍♀️" },
  { id: "female_bun", label: "Спортивний Пучок", icon: "⚽" },
  { id: "female_braids", label: "Французькі Косички", icon: "🎀" },
  { id: "female_pixie", label: "Короткий Піксі", icon: "✨" }
]

export const HAIR_COLORS = [
  { id: "black", label: "Чорний", color: "#171717", highlight: "#333333", icon: "🖤" },
  { id: "dark_brown", label: "Темний каштан", color: "#3B2219", highlight: "#5A382B", icon: "🌰" },
  { id: "light_brown", label: "Русявий", color: "#785338", highlight: "#996D4D", icon: "🪵" },
  { id: "blonde", label: "Золотий Блонд", color: "#E6C280", highlight: "#F7E1B5", icon: "👑" },
  { id: "ginger", label: "Вогняний Рудий", color: "#B84A1C", highlight: "#D96838", icon: "🔥" },
  { id: "platinum", label: "Платиновий", color: "#D1D5DB", highlight: "#F3F4F6", icon: "❄️" }
]

export const EYE_COLORS = [
  { id: "brown", label: "Карі", color: "#4A2E18", icon: "👁️" },
  { id: "blue", label: "Блакитні", color: "#2563EB", icon: "💎" },
  { id: "green", label: "Смарагдові", color: "#16A34A", icon: "🍀" },
  { id: "amber", label: "Бурштинові", color: "#D97706", icon: "🌟" },
  { id: "dark", label: "Темні", color: "#18181B", icon: "🌑" }
]

export const FACIAL_HAIR = [
  { id: "none", label: "Чисте гоління", icon: "✨" },
  { id: "stubble", label: "Легка щетина", icon: "🧔" },
  { id: "mustache", label: "Вуса", icon: "👨" },
  { id: "goatee", label: "Еспаньйолка", icon: "🎯" },
  { id: "full_beard", label: "Густа борода", icon: "🦁" }
]

export const DEFAULT_AVATAR: ProAvatar = {
  gender: "male",
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
  const isFemale = avatar.gender === "female"
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

      {/* ─── 1. BACKGROUND GLOW & SHIELD ─── */}
      <circle cx="60" cy="60" r="58" fill="#0B1320" />

      {/* ─── 2. JERSEY / SHOULDERS ─── */}
      <path
        d="M20 120 C20 95, 40 85, 60 85 C80 85, 100 95, 100 120 Z"
        fill="url(#jersey-grad)"
      />
      {/* Jersey Collar */}
      <path
        d={isFemale ? "M46 85 L60 102 L74 85 Z" : "M48 85 L60 100 L72 85 Z"}
        fill="#FFFFFF"
        opacity="0.9"
      />
      <circle cx="60" cy={isFemale ? "108" : "107"} r="2.8" fill="#FFFFFF" opacity="0.85" />

      {/* ─── 3. NECK ─── */}
      <rect
        x={isFemale ? "52" : "50"}
        y="70"
        width={isFemale ? "16" : "20"}
        height="20"
        rx={isFemale ? "5" : "4"}
        fill={skin.shadow}
      />

      {/* ─── 4. EARS & EARRINGS ─── */}
      <ellipse cx="32" cy="54" rx="4" ry="6.5" fill={skin.shadow} />
      <ellipse cx="88" cy="54" rx="4" ry="6.5" fill={skin.shadow} />
      {isFemale && (
        <>
          <circle cx="32" cy="59" r="1.5" fill="#FACC15" />
          <circle cx="88" cy="59" r="1.5" fill="#FACC15" />
        </>
      )}

      {/* ─── 5. HEAD / FACE SHAPE ─── */}
      {isFemale ? (
        /* Delicate Feminine Face Contour */
        <path
          d="M36 43 C36 28, 84 28, 84 43 C84 62, 74 76, 60 76 C46 76, 36 62, 36 43 Z"
          fill={`url(#skin-grad-${avatar.skin_tone})`}
        />
      ) : avatar.face_shape === "square" ? (
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
        /* Oval Default Male */
        <path
          d="M35 42 C35 27, 85 27, 85 42 C85 64, 76 78, 60 78 C44 78, 35 64, 35 42 Z"
          fill={`url(#skin-grad-${avatar.skin_tone})`}
        />
      )}

      {/* ─── 6. EYES & BROWS ─── */}
      {/* Eyebrows */}
      <path
        d={isFemale ? "M43 43 Q49 39 54 42" : "M42 42 Q49 39 54 42"}
        stroke={hair.color}
        strokeWidth={isFemale ? "1.8" : "2.5"}
        strokeLinecap="round"
      />
      <path
        d={isFemale ? "M66 42 Q71 39 77 43" : "M66 42 Q71 39 78 42"}
        stroke={hair.color}
        strokeWidth={isFemale ? "1.8" : "2.5"}
        strokeLinecap="round"
      />

      {/* Left Eye */}
      <ellipse cx="48" cy="48" rx="4.5" ry={isFemale ? "3.2" : "3"} fill="#FFFFFF" />
      <circle cx="48" cy="48" r="2.2" fill={eye.color} />
      <circle cx="47" cy="47" r="0.8" fill="#FFFFFF" />
      {/* Eyelashes for female */}
      {isFemale && (
        <path
          d="M44 47 L42 45 M52 47 L54 45"
          stroke="#171717"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}

      {/* Right Eye */}
      <ellipse cx="72" cy="48" rx="4.5" ry={isFemale ? "3.2" : "3"} fill="#FFFFFF" />
      <circle cx="72" cy="48" r="2.2" fill={eye.color} />
      <circle cx="71" cy="47" r="0.8" fill="#FFFFFF" />
      {isFemale && (
        <path
          d="M68 47 L66 45 M76 47 L78 45"
          stroke="#171717"
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      )}

      {/* ─── 7. NOSE ─── */}
      {isFemale ? (
        <path
          d="M60 48 L61 56 L59 57"
          stroke={skin.shadow}
          strokeWidth="1.5"
          strokeLinecap="round"
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
      {isFemale ? (
        /* Feminine Tinted Lips */
        <path
          d="M52 65 Q60 70 68 65 Q60 67 52 65"
          fill="#D946EF"
          stroke="#A21CAF"
          strokeWidth="1.2"
        />
      ) : avatar.mouth_type === "smile" ? (
        <path
          d="M52 66 Q60 72 68 66"
          stroke="#8A3838"
          strokeWidth="2.2"
          strokeLinecap="round"
          fill="#FFFFFF"
        />
      ) : (
        <path
          d="M54 66 Q60 67 66 66"
          stroke="#8A3838"
          strokeWidth="2"
          strokeLinecap="round"
        />
      )}

      {/* ─── 9. FACIAL HAIR (Male Only) ─── */}
      {!isFemale && avatar.facial_hair === "stubble" && (
        <path
          d="M48 68 Q60 78 72 68 Q60 74 48 68"
          fill={hair.color}
          opacity="0.25"
        />
      )}
      {!isFemale && avatar.facial_hair === "mustache" && (
        <path
          d="M50 63 Q60 60 70 63 Q60 66 50 63"
          fill={hair.color}
          opacity="0.9"
        />
      )}
      {!isFemale && avatar.facial_hair === "goatee" && (
        <path
          d="M54 64 Q60 63 66 64 L64 74 Q60 76 56 74 Z"
          fill={hair.color}
          opacity="0.85"
        />
      )}
      {!isFemale && avatar.facial_hair === "full_beard" && (
        <path
          d="M34 50 C34 76, 44 82, 60 82 C76 82, 86 76, 86 50 C80 62, 70 74, 60 74 C50 74, 40 62, 34 50 Z"
          fill={hair.color}
          opacity="0.9"
        />
      )}

      {/* ─── 10. FEMALE HAIRSTYLES ─── */}
      {isFemale && avatar.hair_style === "female_ponytail" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <path d="M34 38 C34 18, 86 18, 86 38 C80 26, 40 26, 34 38 Z" />
          {/* Ponytail extension */}
          <path d="M82 28 C96 22, 102 45, 96 68 C92 52, 88 34, 82 28 Z" />
          <circle cx="82" cy="30" r="3" fill="#EC4899" />
        </g>
      )}

      {isFemale && avatar.hair_style === "female_long" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <path d="M34 38 C34 16, 86 16, 86 38 C80 26, 40 26, 34 38 Z" />
          <path d="M34 36 C34 68, 28 84, 38 90 C42 75, 40 50, 36 38 Z" />
          <path d="M86 36 C86 68, 92 84, 82 90 C78 75, 80 50, 84 38 Z" />
        </g>
      )}

      {isFemale && avatar.hair_style === "female_bob" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <path d="M33 38 C33 16, 87 16, 87 38 C75 25, 45 25, 33 38 Z" />
          <path d="M32 36 L32 66 C32 72, 40 68, 40 60 L38 38 Z" />
          <path d="M88 36 L88 66 C88 72, 80 68, 80 60 L82 38 Z" />
        </g>
      )}

      {isFemale && avatar.hair_style === "female_bun" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <circle cx="60" cy="14" r="11" />
          <path d="M34 38 C34 18, 86 18, 86 38 C80 26, 40 26, 34 38 Z" />
          <circle cx="60" cy="22" r="3" fill="#10B981" />
        </g>
      )}

      {isFemale && avatar.hair_style === "female_braids" && (
        <g fill={`url(#hair-grad-${avatar.hair_color})`}>
          <path d="M34 38 C34 16, 86 16, 86 38 C80 26, 40 26, 34 38 Z" />
          {/* Braids left and right */}
          <rect x="30" y="38" width="6" height="42" rx="3" transform="rotate(8 30 38)" />
          <rect x="84" y="38" width="6" height="42" rx="3" transform="rotate(-8 84 38)" />
        </g>
      )}

      {isFemale && avatar.hair_style === "female_pixie" && (
        <path
          d="M34 38 C34 18, 86 18, 86 38 C75 25, 45 25, 34 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {/* ─── 11. MALE HAIRSTYLES ─── */}
      {!isFemale && avatar.hair_style === "buzz" && (
        <path
          d="M35 38 C35 24, 85 24, 85 38 C80 28, 40 28, 35 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
          opacity="0.9"
        />
      )}

      {!isFemale && avatar.hair_style === "short_fade" && (
        <path
          d="M34 38 C34 20, 86 20, 86 38 C82 32, 74 27, 60 27 C46 27, 38 32, 34 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {!isFemale && avatar.hair_style === "curly" && (
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

      {!isFemale && avatar.hair_style === "mohawk" && (
        <path
          d="M50 36 C50 14, 70 14, 70 36 C65 24, 55 24, 50 36 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {!isFemale && avatar.hair_style === "long" && (
        <g>
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

      {!isFemale && avatar.hair_style === "classic" && (
        <path
          d="M33 40 C33 20, 87 20, 87 40 C75 26, 45 28, 33 40 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {!isFemale && avatar.hair_style === "slick" && (
        <path
          d="M34 38 C34 18, 86 18, 86 38 C75 28, 45 28, 34 38 Z"
          fill={`url(#hair-grad-${avatar.hair_color})`}
        />
      )}

      {!isFemale && avatar.hair_style === "dreadlocks" && (
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
  const isFemale = value.gender === "female"
  const hairStylesList = isFemale ? FEMALE_HAIR_STYLES : MALE_HAIR_STYLES

  const handleGenderChange = (newGender: "male" | "female") => {
    const defaultHair = newGender === "female" ? "female_ponytail" : "short_fade"
    onChange({
      ...value,
      gender: newGender,
      hair_style: defaultHair,
      facial_hair: newGender === "female" ? "none" : "stubble"
    })
  }

  const randomize = () => {
    const randomSkin = SKIN_TONES[Math.floor(Math.random() * SKIN_TONES.length)].id
    const randomHair = hairStylesList[Math.floor(Math.random() * hairStylesList.length)].id
    const randomColor = HAIR_COLORS[Math.floor(Math.random() * HAIR_COLORS.length)].id
    const randomEye = EYE_COLORS[Math.floor(Math.random() * EYE_COLORS.length)].id
    const randomBeard = isFemale ? "none" : FACIAL_HAIR[Math.floor(Math.random() * FACIAL_HAIR.length)].id

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
      {/* Gender Selector Bar */}
      <div className="p-1.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleGenderChange("male")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            !isFemale
              ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-950"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-base">👨</span>
          <span>Чоловічий Футбол</span>
        </button>

        <button
          type="button"
          onClick={() => handleGenderChange("female")}
          className={`flex-1 py-2.5 px-4 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            isFemale
              ? "bg-gradient-to-r from-pink-600 to-rose-500 text-white shadow-lg shadow-pink-950"
              : "text-slate-400 hover:text-white"
          }`}
        >
          <span className="text-base">👩</span>
          <span>Жіночий Футбол</span>
        </button>
      </div>

      {/* Top Preview Card */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-slate-950/90 border border-emerald-500/30 shadow-xl">
        <div className="flex items-center gap-4">
          <ProAvatarRenderer avatar={value} club={club} size={105} />
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Попередній перегляд
            </span>
            <h4 className="text-base font-black text-white">
              {isFemale ? "Обличчя футболістки" : "Обличчя футболіста"}
            </h4>
            <p className="text-xs text-slate-400">
              Відображається на 3D картці, в газетах та на табло!
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
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>{st.icon}</span>
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
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {hairStylesList.map((hs) => (
              <button
                key={hs.id}
                type="button"
                onClick={() => onChange({ ...value, hair_style: hs.id })}
                className={`py-2.5 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 text-center cursor-pointer ${
                  value.hair_style === hs.id
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950 ring-2 ring-emerald-400"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>{hs.icon}</span>
                <span className="truncate">{hs.label}</span>
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
                    ? "bg-emerald-600 text-white ring-2 ring-emerald-400 shadow-md"
                    : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                }`}
              >
                <span>{hc.icon}</span>
                <span
                  className="w-3.5 h-3.5 rounded-full border border-black/30 shrink-0"
                  style={{ backgroundColor: hc.color }}
                />
                <span>{hc.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 4. Eyes Color & Facial Hair */}
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
                  <span>{ec.icon}</span>
                  <span
                    className="w-3 h-3 rounded-full border border-black/30 shrink-0"
                    style={{ backgroundColor: ec.color }}
                  />
                  <span>{ec.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Facial Hair (Male only) */}
          {!isFemale && (
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
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      value.facial_hair === fh.id
                        ? "bg-emerald-600 text-white ring-2 ring-emerald-400"
                        : "bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800"
                    }`}
                  >
                    <span>{fh.icon}</span>
                    <span>{fh.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
