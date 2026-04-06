import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useRoleDetection, getRoleLabel } from '../hooks/useRoleDetection'
import { useWallet } from '../hooks/useWallet'

// Each nav item has a `roles` array — only shown if user's detected role is in it
const navItems = [
    {
        path: '/seller/dashboard',
        label: 'Seller Dashboard',
        icon: 'storefront',
        roles: ['seller'],
    },
    {
        path: '/buyer/dashboard',
        label: 'Buyer Dashboard',
        icon: 'shopping_cart',
        roles: ['buyer'],
    },
    {
        path: '/compliance',
        label: 'Compliance Panel',
        icon: 'verified_user',
        roles: ['complianceChecker'],
    },
    {
        path: '/certifier',
        label: 'Certifier Panel',
        icon: 'workspace_premium',
        roles: ['certifier'],
    },
    {
        path: '/qc',
        label: 'Quality Control',
        icon: 'fact_check',
        roles: ['qualityChecker'],
    },
    {
        path: '/freight',
        label: 'Freight Docs',
        icon: 'local_shipping',
        roles: ['freightForwarder'],
    },
    {
        path: '/traceability',
        label: 'Traceability Audit',
        icon: 'verified',
        roles: ['seller', 'buyer', 'certifier', 'qualityChecker', 'freightForwarder', 'exportCustoms', 'importCustoms', 'complianceChecker'],
    },
    {
        path: '/customs',
        label: 'Customs Clearance',
        icon: 'gavel',
        roles: ['exportCustoms', 'importCustoms'],
    },
    {
        path: '/ledger',
        label: 'Transaction Ledger',
        icon: 'receipt_long',
        roles: ['seller', 'buyer', 'certifier', 'qualityChecker', 'freightForwarder', 'exportCustoms', 'importCustoms', 'complianceChecker'],
    },
    {
        path: '/settings',
        label: 'Settings',
        icon: 'settings',
        roles: ['seller', 'buyer', 'certifier', 'qualityChecker', 'freightForwarder', 'exportCustoms', 'importCustoms', 'complianceChecker'],
    },
]

export default function AppLayout({ children, title = 'Dashboard' }) {
    const location = useLocation()
    const { detectedRole } = useRoleDetection()
    const { disconnect } = useWallet()
    const navigate = useNavigate()

    // Filter nav items based on user's detected role
    const visibleNavItems = navItems.filter(
        (item) => !detectedRole || item.roles.includes(detectedRole)
    )

    const handleDisconnect = () => {
        disconnect()
        navigate('/')
    }

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

                    {/* Role indicator */}
                    {detectedRole && (
                        <div className="mb-4 mx-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/20">
                            <p className="text-[10px] uppercase tracking-wider text-text-secondary mb-0.5">Logged in as</p>
                            <p className="text-sm font-semibold text-primary">{getRoleLabel(detectedRole)}</p>
                        </div>
                    )}

                    {/* Navigation — filtered by role */}
                    <nav className="flex flex-col gap-1 flex-1 overflow-y-auto">
                        {visibleNavItems.map((item) => {
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
                            Network Status
                        </h3>
                        <div className="p-3 rounded-lg bg-surface-dark border border-border-dark">
                            <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-text-secondary">Chain</span>
                                <span className="relative flex h-2 w-2 mt-1">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                                </span>
                            </div>
                            <p className="text-white text-sm font-bold">Anvil (Local)</p>
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
                            Anvil Local
                        </div>
                        {detectedRole && (
                            <span className="hidden sm:inline px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-full text-xs font-semibold">
                                {getRoleLabel(detectedRole)}
                            </span>
                        )}
                        <button 
                            onClick={handleDisconnect}
                            title="Disconnect Wallet"
                            className="w-10 h-10 rounded-full bg-surface-dark border-2 border-border-dark flex items-center justify-center text-text-secondary hover:text-red-500 hover:border-red-500/50 transition-colors"
                        >
                            <span className="material-symbols-outlined">logout</span>
                        </button>
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
