interface TeamDisplayProps {
  teamName: string
  teamLogo?: string
  size?: "sm" | "md" | "lg"
  showName?: boolean
  className?: string
}

export function TeamDisplay({ teamName, teamLogo, size = "md", showName = true, className = "" }: TeamDisplayProps) {
  const sizeClasses = {
    sm: "w-6 h-6",
    md: "w-8 h-8",
    lg: "w-12 h-12",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        className={`${sizeClasses[size]} bg-white rounded-full flex items-center justify-center shadow-md border-2 border-blue-400/30`}
      >
        {teamLogo ? (
          <img
            src={teamLogo || "/placeholder.svg"}
            alt={`${teamName} logo`}
            className={`${sizeClasses[size]} object-contain rounded-full`}
          />
        ) : (
          <div
            className={`${sizeClasses[size]} bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center`}
          >
            <span className="text-white font-bold text-xs">{teamName.charAt(0)}</span>
          </div>
        )}
      </div>
      {showName && <span className={`font-semibold text-slate-700 dark:text-slate-200 ${textSizeClasses[size]}`}>{teamName}</span>}
    </div>
  )
}
