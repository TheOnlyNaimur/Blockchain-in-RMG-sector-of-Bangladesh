import { Link, useLocation } from 'react-router-dom'

const navItems = [
    { path: '/seller/dashboard', label: 'Seller Dashboard', icon: 'storefront' },
    { path: '/buyer/dashboard', label: 'Buyer Dashboard', icon: 'shopping_cart' },
    { path: '/certifier', label: 'Certifier Panel', icon: 'verified_user' },
    { path: '/qc', label: 'Quality Control', icon: 'fact_check' },
    { path: '/freight', label: 'Freight Docs', icon: 'local_shipping' },
    { path: '/tracking', label: 'Shipment Tracking', icon: 'timeline' },
    { path: '/customs', label: 'Customs Clearance', icon: 'gavel' },
    { path: '/settings', label: 'Settings', icon: 'settings' },
]

export default function AppLayout({ children, title = 'Dashboard' }) {
    const location = useLocation()

    return (
        <div className="flex h-screen w-full overflow-hidden">
            {/* Sidebar */}
            <aside className="hidden lg:flex w-72 flex-shrink-0 flex-col border-r border-border-dark bg-[#111813]">
                <div className="flex flex-col h-full p-4">
                    {/* Header */}
                    <div className="mb-8 px-2">
                        <Link to="/" className="flex items-center gap-2 mb-1">
                            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">token</span>
                            </div>
                            <h1 className="text-white text-lg font-bold tracking-tight">TradeChain</h1>
                        </Link>
                        <p className="text-text-secondary text-xs font-normal">Blockchain Supply Chain</p>
                    </div>

                    {/* Navigation */}
                    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/')
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${isActive
                                            ? 'bg-surface-dark text-white border border-border-dark/50'
                                            : 'text-text-secondary hover:bg-surface-dark hover:text-white'
                                        }`}
                                >
                                    <span className={`material-symbols-outlined ${isActive ? 'text-primary' : ''}`}>
                                        {item.icon}
                                    </span>
                                    <span className="text-sm font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Stats */}
                    <div className="mt-auto flex flex-col gap-3 py-4 border-t border-border-dark">
                        <h3 className="text-xs font-semibold text-text-secondary uppercase tracking-wider px-2 mb-1">
                            Live Metrics
                        </h3>
                        <div className="p-3 rounded-lg bg-surface-dark border border-border-dark">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-text-secondary">Total Volume</span>
                                <span className="text-xs text-primary font-medium">+12%</span>
                            </div>
                            <p className="text-white text-lg font-bold">$4.2B</p>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-dark border border-border-dark">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-text-secondary">Active Nodes</span>
                                <span className="text-xs text-primary font-medium">+5%</span>
                            </div>
                            <p className="text-white text-lg font-bold">1,240</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col h-full overflow-y-auto bg-background-dark">
                {/* Top Header */}
                <header className="flex items-center justify-between border-b border-border-dark px-4 lg:px-8 py-3 bg-background-dark sticky top-0 z-50 backdrop-blur">
                    <div className="flex items-center gap-4">
                        <Link to="/" className="lg:hidden flex items-center gap-2 text-white">
                            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary">
                                <span className="material-symbols-outlined">token</span>
                            </div>
                            <h2 className="text-white text-lg font-bold">TradeChain</h2>
                        </Link>
                        <h2 className="hidden lg:block text-white text-lg font-bold">{title}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="hidden md:flex items-center gap-2 rounded-full border border-border-dark bg-surface-dark px-3 py-1.5 text-xs font-medium text-slate-300">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                            </span>
                            Sepolia Testnet
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg text-sm font-bold transition-all">
                            <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                            <span className="hidden sm:inline">0x71...8A2</span>
                        </button>
                        <div className="w-10 h-10 rounded-full bg-surface-dark border-2 border-border-dark flex items-center justify-center text-text-secondary">
                            <span className="material-symbols-outlined">person</span>
                        </div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="flex-1 p-4 lg:p-8">
                    {children}
                </div>
            </main>
        </div>
    )
}
