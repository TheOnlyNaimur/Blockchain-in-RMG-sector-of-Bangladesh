export default function StatCard({ label, value, change, icon, changeColor = 'text-primary' }) {
    return (
        <div className="p-5 rounded-xl bg-surface-dark border border-border-dark hover:border-primary/30 transition-colors relative overflow-hidden group">
            {icon && (
                <div className="absolute right-0 top-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    <span className="material-symbols-outlined text-6xl text-primary">{icon}</span>
                </div>
            )}
            <p className="text-text-secondary text-sm font-medium mb-1">{label}</p>
            <p className="text-white text-2xl font-bold">{value}</p>
            {change && (
                <span className={`text-xs font-medium ${changeColor} bg-primary/10 px-2 py-1 rounded mt-2 inline-block`}>
                    {change}
                </span>
            )}
        </div>
    )
}
