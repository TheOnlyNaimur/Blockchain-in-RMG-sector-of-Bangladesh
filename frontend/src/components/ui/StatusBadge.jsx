const colorMap = {
    green: 'bg-primary/10 text-primary border-primary/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    yellow: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    red: 'bg-red-500/10 text-red-400 border-red-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    gray: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400',
}

const dotColorMap = {
    green: 'bg-primary',
    blue: 'bg-blue-400',
    yellow: 'bg-yellow-500',
    red: 'bg-red-400',
    purple: 'bg-purple-400',
    gray: 'bg-slate-500',
}

export default function StatusBadge({ label, color = 'green', pulse = false, icon = null }) {
    return (
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${colorMap[color] || colorMap.green}`}>
            {icon ? (
                <span className="material-symbols-outlined text-[14px]">{icon}</span>
            ) : (
                <span className={`size-1.5 rounded-full ${dotColorMap[color] || dotColorMap.green} ${pulse ? 'animate-pulse' : ''}`}></span>
            )}
            {label}
        </span>
    )
}
