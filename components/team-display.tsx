interface TeamDisplayProps {
  teamName: string
  teamLogo?: string
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

export function TeamDisplay({ teamName, teamLogo, size = "md", showName = true, className = "" }: TeamDisplayProps) {
  const sizeClasses = {
    sm: "w-6 h-6 p-0.5",
    md: "w-8 h-8 p-1",
    lg: "w-12 h-12 p-1.5",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-white rounded-md flex items-center justify-center shadow-xs border border-slate-200/80 shrink-0`}
      >
        {teamLogo ? (
          <img
            src={teamLogo || "/placeholder.svg"}
            alt={`${teamName} logo`}
            className="w-full h-full object-contain"
          />
        ) : (
          <div
            className="w-full h-full bg-gradient-to-br from-blue-600 to-blue-800 rounded flex items-center justify-center"
          >
            <span className="text-white font-bold text-xs">{teamName.charAt(0)}</span>
          </div>
        )}
      </div>
      {showName && <span className={`font-bold text-slate-900 ${textSizeClasses[size]}`}>{teamName}</span>}
    </div>
  )
}
