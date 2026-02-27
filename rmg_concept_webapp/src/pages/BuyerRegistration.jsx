import { useState } from 'react'
import { Link } from 'react-router-dom'

export default function BuyerRegistration() {
    const [name, setName] = useState('')
    const [license, setLicense] = useState('')
    const [contact, setContact] = useState('')
    const [terms, setTerms] = useState(false)

    return (
        <div className="relative flex h-screen w-full flex-col overflow-hidden">
            {/* Blurred Background */}
            <div className="flex h-full w-full flex-row filter blur-[6px] opacity-40 pointer-events-none select-none">
                <div className="w-64 flex-shrink-0 flex flex-col border-r border-border-dark bg-background-dark p-4">
                    <div className="flex items-center gap-3 mb-8 px-2">
                        <div className="w-10 h-10 rounded-full bg-surface-dark"></div>
                        <div>
                            <p className="text-white text-base font-medium">ChainTrade</p>
                            <p className="text-text-secondary text-xs">Supply Chain Platform</p>
                        </div>
                    </div>
                    <div className="flex flex-col gap-2 flex-1">
                        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-border-dark text-white">
                            <span className="material-symbols-outlined">dashboard</span>
                            <p className="text-sm font-medium">Dashboard</p>
                        </div>
                    </div>
                </div>
                <div className="flex-1 flex flex-col h-full overflow-y-auto bg-background-dark">
                    <header className="flex items-center justify-between border-b border-border-dark px-8 py-4">
                        <h2 className="text-white text-lg font-bold">Dashboard</h2>
                    </header>
                    <main className="flex-1 p-8">
                        <h2 className="text-white text-3xl font-bold mb-2">Buyer Dashboard</h2>
                        <div className="grid grid-cols-4 gap-6 mb-8">
                            {[1, 2, 3, 4].map(i => (
                                <div key={i} className="bg-surface-dark p-6 rounded-xl border border-border-dark">
                                    <p className="text-text-secondary text-sm mb-2">Stat {i}</p>
                                    <h3 className="text-white text-2xl font-bold">0</h3>
                                </div>
                            ))}
                        </div>
                    </main>
                </div>
            </div>

            {/* Modal */}
            <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <div className="bg-surface-dark w-full max-w-xl rounded-2xl border border-border-dark shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-border-dark flex justify-between items-center bg-surface-darker">
                        <div>
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <span className="material-symbols-outlined text-primary">shopping_cart</span>
                                Buyer Registration
                            </h2>
                            <p className="text-text-secondary text-sm mt-1">Complete your profile to start purchasing on the blockchain network.</p>
                        </div>
                        <Link to="/" className="h-8 w-8 rounded-full bg-border-dark flex items-center justify-center text-text-secondary cursor-pointer hover:text-white hover:bg-[#3b5443] transition-colors">
                            <span className="material-symbols-outlined text-lg">close</span>
                        </Link>
                    </div>

                    <div className="p-8 overflow-y-auto">
                        <form className="flex flex-col gap-6">
                            <div className="p-4 rounded-lg bg-[#111813] border border-border-dark flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary mt-1">account_balance_wallet</span>
                                <div>
                                    <p className="text-xs text-text-secondary uppercase font-bold tracking-wider mb-1">Connected Wallet</p>
                                    <p className="text-white font-mono text-sm break-all">0x71C...39A2</p>
                                    <div className="flex items-center gap-1 mt-2">
                                        <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                                        <span className="text-primary text-xs">Network Active</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white flex justify-between">
                                    Business / Organization Name
                                    <span className="text-text-secondary text-xs font-normal">Publicly visible</span>
                                </label>
                                <input
                                    className="w-full bg-[#111813] border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 placeholder-[#5c7263]"
                                    placeholder="Enter your organization name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Import License Number</label>
                                <input
                                    className="w-full bg-[#111813] border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 placeholder-[#5c7263]"
                                    placeholder="e.g. IMP-2024-001234"
                                    value={license}
                                    onChange={(e) => setLicense(e.target.value)}
                                />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Contact Number</label>
                                <div className="relative group">
                                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                        <span className="material-symbols-outlined text-text-secondary text-lg group-focus-within:text-primary">call</span>
                                    </div>
                                    <input
                                        className="w-full bg-[#111813] border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-3 pl-10 placeholder-[#5c7263]"
                                        placeholder="+1 (555) 000-0000"
                                        value={contact}
                                        onChange={(e) => setContact(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Preferred Trade Currency</label>
                                <select className="w-full bg-[#111813] border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary block p-3">
                                    <option>USDT (Tether)</option>
                                    <option>USDC (Circle)</option>
                                    <option>DAI</option>
                                </select>
                            </div>

                            <div className="flex items-start gap-3 mt-2 p-3 rounded-lg bg-border-dark/30 border border-border-dark">
                                <input
                                    className="w-4 h-4 border border-[#5c7263] rounded bg-[#111813] focus:ring-3 focus:ring-primary/20 text-primary mt-0.5"
                                    type="checkbox"
                                    checked={terms}
                                    onChange={(e) => setTerms(e.target.checked)}
                                />
                                <label className="text-xs font-normal text-text-secondary">
                                    I agree to the <a className="text-primary hover:underline" href="#">Smart Contract Terms</a> and consent to on-chain identity verification.
                                </label>
                            </div>
                        </form>
                    </div>

                    <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center">
                        <div className="text-xs text-[#5c7263] font-medium">Step 1 of 3</div>
                        <div className="flex gap-3">
                            <Link to="/" className="px-5 py-2.5 text-sm font-medium text-white bg-transparent border border-border-dark rounded-lg hover:bg-border-dark transition-colors">
                                Cancel
                            </Link>
                            <button
                                className={`px-5 py-2.5 text-sm font-bold rounded-lg flex items-center gap-2 transition-colors ${name && license && contact && terms
                                        ? 'text-[#102216] bg-primary hover:bg-primary-hover cursor-pointer'
                                        : 'text-[#102216] bg-[#5c7263] cursor-not-allowed opacity-70'
                                    }`}
                                disabled={!(name && license && contact && terms)}
                            >
                                Submit Registration
                                <span className="material-symbols-outlined text-lg">arrow_forward</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
