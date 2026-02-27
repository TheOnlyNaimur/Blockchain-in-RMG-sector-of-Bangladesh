import { useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import StatCard from '../components/ui/StatCard'

const pendingRows = [
    { address: '0x71C...9A2', name: 'Global Trade Co.', tin: 'US-98-123456', submitted: '2 hours ago', gradient: 'from-blue-500 to-cyan-400' },
    { address: '0x3E4...B1F', name: 'AgriExport Ltd.', tin: 'BR-12.345.678', submitted: '4 hours ago', gradient: 'from-green-500 to-lime-400' },
    { address: '0x9A2...71C', name: 'TechComponents Inc.', tin: 'CN-91310000', submitted: '5 hours ago', gradient: 'from-purple-500 to-pink-400' },
    { address: '0x1F2...8E9', name: 'Logistics Hub', tin: 'DE-811111111', submitted: '1 day ago', gradient: 'from-orange-500 to-red-400' },
]

const approvedRows = [
    { address: '0xA1B...2C3', name: 'Pacific Rim Trading', tin: 'JP-1234567890', date: 'Oct 26, 2023', certHash: '0x7f83...d906', gradient: 'from-sky-500 to-indigo-400', gasUsed: '0.0042 ETH' },
    { address: '0xD4E...5F6', name: 'EuroTextiles GmbH', tin: 'DE-987654321', date: 'Oct 25, 2023', certHash: '0x3a19...c7b2', gradient: 'from-emerald-500 to-teal-400', gasUsed: '0.0039 ETH' },
    { address: '0xG7H...8I9', name: 'AgroNord SA', tin: 'FR-76543210987', date: 'Oct 24, 2023', certHash: '0x9d42...e5f1', gradient: 'from-amber-500 to-yellow-400', gasUsed: '0.0045 ETH' },
    { address: '0xJ1K...2L3', name: 'SilkRoad Exports', tin: 'IN-AABCU9603E', date: 'Oct 23, 2023', certHash: '0x1b78...a3d4', gradient: 'from-pink-500 to-rose-400', gasUsed: '0.0041 ETH' },
    { address: '0xM4N...5O6', name: 'CapeGood Produce', tin: 'ZA-4740239', date: 'Oct 22, 2023', certHash: '0x5e9c...f2b7', gradient: 'from-lime-500 to-green-400', gasUsed: '0.0038 ETH' },
]

const rejectedRows = [
    { address: '0xP7Q...8R9', name: 'ShadowTrade LLC', tin: 'INVALID-000', date: 'Oct 26, 2023', reason: 'Invalid TIN / Tax ID — document could not be verified against government registry.', gradient: 'from-red-500 to-orange-400', reviewer: 'Auto-reject (AI)' },
    { address: '0xS1T...2U3', name: 'QuickShip Corp', tin: 'US-00-000000', date: 'Oct 24, 2023', reason: 'Duplicate registration detected — wallet already associated with another entity.', gradient: 'from-gray-500 to-slate-400', reviewer: 'Reviewer: M. Chen' },
    { address: '0xV4W...5X6', name: 'UnknownVentures', tin: 'XX-??-??????', date: 'Oct 21, 2023', reason: 'Incomplete documentation — missing business license and proof of address.', gradient: 'from-rose-500 to-pink-400', reviewer: 'Reviewer: A. Patel' },
]

export default function CertifierPanel() {
    const [activeTab, setActiveTab] = useState('pending')
    const [selectedPending, setSelectedPending] = useState(pendingRows[1])

    const tabs = [
        { id: 'pending', label: 'Pending Requests', count: 24 },
        { id: 'approved', label: 'Approved History', count: 156 },
        { id: 'rejected', label: 'Rejected Log', count: 18 },
    ]

    return (
        <AppLayout title="Certifier Panel">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <h2 className="text-3xl font-bold text-white mb-2">
                        {activeTab === 'pending' ? 'Pending Certifications' : activeTab === 'approved' ? 'Approved History' : 'Rejected Log'}
                    </h2>
                    <p className="text-text-secondary max-w-2xl">
                        {activeTab === 'pending' && 'Review and validate seller credentials before they are immutably recorded on the blockchain.'}
                        {activeTab === 'approved' && 'Complete history of all approved certifications with on-chain certificate hashes.'}
                        {activeTab === 'rejected' && 'Record of all rejected certification requests with reasons and reviewer notes.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 bg-surface-dark border border-border-dark text-white px-4 py-2 rounded-lg hover:bg-surface-darker transition-colors">
                        <span className="material-symbols-outlined text-lg">filter_list</span>
                        <span className="text-sm font-medium">Filter</span>
                    </button>
                    <button className="flex items-center gap-2 bg-primary text-background-dark px-4 py-2 rounded-lg hover:bg-primary-hover font-semibold transition-colors">
                        <span className="material-symbols-outlined text-lg">download</span>
                        <span className="text-sm">Export CSV</span>
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                <StatCard label="Pending Review" value="24" icon="pending_actions" />
                <StatCard label="Approved Today" value="12" icon="verified" />
                <StatCard label="Rejected" value="3" icon="block" />
                <StatCard label="Avg. Wait Time" value="4h 12m" icon="schedule" />
            </div>

            {/* Tabs + Table */}
            <div className="bg-surface-dark border border-border-dark rounded-xl overflow-hidden shadow-sm mb-8">
                <div className="flex border-b border-border-dark px-2">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-4 text-sm font-medium transition-colors ${activeTab === tab.id
                                    ? 'text-white border-b-2 border-primary'
                                    : 'text-text-secondary hover:text-white'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* ── PENDING TAB ── */}
                {activeTab === 'pending' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                                        <th className="px-6 py-4">Seller Address</th>
                                        <th className="px-6 py-4">Company Name</th>
                                        <th className="px-6 py-4">TIN / Tax ID</th>
                                        <th className="px-6 py-4">Submitted</th>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {pendingRows.map((row, i) => (
                                        <tr
                                            key={i}
                                            onClick={() => setSelectedPending(row)}
                                            className={`hover:bg-surface-darker/30 transition-colors group cursor-pointer ${selectedPending?.address === row.address ? 'bg-primary/5' : ''}`}
                                        >
                                            <td className="px-6 py-4 font-mono text-sm text-primary">{row.address}</td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}></div>
                                                    {row.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.tin}</td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.submitted}</td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                                                    Pending Review
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="text-text-secondary hover:text-red-400 p-1 rounded hover:bg-red-400/10 transition-colors">
                                                        <span className="material-symbols-outlined text-xl">close</span>
                                                    </button>
                                                    <button className="text-text-secondary hover:text-primary p-1 rounded hover:bg-primary/10 transition-colors">
                                                        <span className="material-symbols-outlined text-xl">check</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                            <span className="text-sm text-text-secondary">Showing 1 to 4 of 24 results</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Previous</button>
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Next</button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── APPROVED HISTORY TAB ── */}
                {activeTab === 'approved' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                                        <th className="px-6 py-4">Seller Address</th>
                                        <th className="px-6 py-4">Company Name</th>
                                        <th className="px-6 py-4">TIN / Tax ID</th>
                                        <th className="px-6 py-4">Approved Date</th>
                                        <th className="px-6 py-4">Certificate Hash</th>
                                        <th className="px-6 py-4">Gas Used</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {approvedRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-surface-darker/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-sm text-primary">{row.address}</td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}></div>
                                                    {row.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.tin}</td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.date}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs text-primary bg-primary/10 px-2 py-1 rounded border border-primary/20">{row.certHash}</span>
                                                    <button className="text-text-secondary hover:text-white transition-colors">
                                                        <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                    </button>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-xs font-mono">{row.gasUsed}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="text-text-secondary hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-surface-darker transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">visibility</span>
                                                    </button>
                                                    <button className="text-text-secondary hover:text-white text-sm font-medium px-2 py-1 rounded hover:bg-surface-darker transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                            <span className="text-sm text-text-secondary">Showing 1 to 5 of 156 results</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Previous</button>
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Next</button>
                            </div>
                        </div>
                    </>
                )}

                {/* ── REJECTED LOG TAB ── */}
                {activeTab === 'rejected' && (
                    <>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-surface-darker/50 text-text-secondary text-xs uppercase tracking-wider font-semibold border-b border-border-dark">
                                        <th className="px-6 py-4">Seller Address</th>
                                        <th className="px-6 py-4">Company Name</th>
                                        <th className="px-6 py-4">TIN / Tax ID</th>
                                        <th className="px-6 py-4">Rejected Date</th>
                                        <th className="px-6 py-4">Reason</th>
                                        <th className="px-6 py-4">Reviewer</th>
                                        <th className="px-6 py-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {rejectedRows.map((row, i) => (
                                        <tr key={i} className="hover:bg-surface-darker/30 transition-colors group">
                                            <td className="px-6 py-4 font-mono text-sm text-red-400">{row.address}</td>
                                            <td className="px-6 py-4 text-white font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-6 h-6 rounded-full bg-gradient-to-tr ${row.gradient}`}></div>
                                                    {row.name}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.tin}</td>
                                            <td className="px-6 py-4 text-text-secondary text-sm">{row.date}</td>
                                            <td className="px-6 py-4 max-w-xs">
                                                <p className="text-red-400/80 text-xs leading-relaxed line-clamp-2">{row.reason}</p>
                                            </td>
                                            <td className="px-6 py-4 text-text-secondary text-xs">{row.reviewer}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <button className="text-text-secondary hover:text-yellow-400 text-xs font-medium px-2 py-1 rounded hover:bg-yellow-400/10 transition-colors flex items-center gap-1">
                                                        <span className="material-symbols-outlined text-[16px]">replay</span> Re-review
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between px-6 py-4 border-t border-border-dark bg-surface-darker/30">
                            <span className="text-sm text-text-secondary">Showing 1 to 3 of 18 results</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Previous</button>
                                <button className="px-3 py-1 text-sm border border-border-dark rounded-lg text-text-secondary hover:text-white hover:bg-surface-dark transition-colors">Next</button>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Action Area – only on pending tab */}
            {activeTab === 'pending' && selectedPending && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 bg-surface-dark border border-border-dark rounded-xl p-6">
                        <div className="flex justify-between items-start mb-4">
                            <h3 className="text-lg font-bold text-white">Document Verification: <span className="text-primary font-normal">{selectedPending.name}</span></h3>
                            <button className="text-sm text-text-secondary hover:text-white underline">View Full Document</button>
                        </div>
                        <div className="bg-surface-darker border border-border-dark rounded-lg p-8 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-surface-dark rounded-full flex items-center justify-center mb-4 border border-border-dark">
                                <span className="material-symbols-outlined text-3xl text-text-secondary">description</span>
                            </div>
                            <p className="text-white font-medium mb-1">Business_License_2024.pdf</p>
                            <p className="text-sm text-text-secondary mb-4">Verified by AI OCR System • 98% Match Confidence</p>
                            <div className="w-full max-w-md h-2 bg-surface-dark rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-[98%]"></div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-surface-dark border-l-4 border-l-primary border border-border-dark rounded-xl p-6 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <span className="material-symbols-outlined text-9xl text-primary">gavel</span>
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2 relative z-10">Confirmation Required</h3>
                        <p className="text-text-secondary text-sm mb-6 relative z-10">
                            You are about to approve <strong className="text-white">{selectedPending.name}</strong>. This action is irreversible. A unique certificate hash will be generated and stored on the blockchain.
                        </p>
                        <div className="bg-surface-darker/50 rounded-lg p-3 mb-6 border border-border-dark relative z-10">
                            <div className="flex justify-between text-xs mb-1">
                                <span className="text-text-secondary">Gas Fee Est.</span>
                                <span className="text-white font-mono">0.0042 ETH</span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-text-secondary">Hash Generation</span>
                                <span className="text-primary font-mono">Wait ~12s</span>
                            </div>
                        </div>
                        <div className="flex gap-3 relative z-10">
                            <button className="flex-1 px-4 py-2 border border-border-dark text-text-secondary hover:text-white rounded-lg text-sm font-medium hover:bg-surface-darker transition-colors">Cancel</button>
                            <button className="flex-1 bg-primary text-background-dark hover:bg-primary-hover rounded-lg text-sm font-bold py-2 transition-shadow shadow-[0_0_15px_-3px_rgba(19,236,91,0.3)]">Confirm Approval</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Approved summary stats – only on approved tab */}
            {activeTab === 'approved' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Certification Summary</h4>
                        <div className="space-y-4">
                            {[
                                { label: 'Total Approved', value: '156', icon: 'verified' },
                                { label: 'This Month', value: '34', icon: 'calendar_month' },
                                { label: 'Total Gas Spent', value: '0.672 ETH', icon: 'local_gas_station' },
                            ].map((s) => (
                                <div key={s.label} className="flex items-center justify-between py-3 border-b border-border-dark/50">
                                    <div className="flex items-center gap-2">
                                        <span className="material-symbols-outlined text-primary text-[18px]">{s.icon}</span>
                                        <span className="text-sm text-text-secondary">{s.label}</span>
                                    </div>
                                    <span className="text-white font-bold">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2 bg-surface-dark border border-border-dark rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Recent Certificate Verification</h4>
                        <div className="bg-surface-darker border border-border-dark rounded-lg p-6 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                                <span className="material-symbols-outlined text-4xl text-primary">verified</span>
                            </div>
                            <h3 className="text-white font-bold text-lg mb-1">Certificate Valid</h3>
                            <p className="text-text-secondary text-sm mb-4">Pacific Rim Trading — Cert Hash: <code className="text-primary font-mono text-xs">0x7f83...d906</code></p>
                            <div className="flex gap-3">
                                <button className="px-4 py-2 bg-border-dark text-white rounded-lg text-sm font-medium hover:bg-[#34463b] transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">open_in_new</span> View on Etherscan
                                </button>
                                <button className="px-4 py-2 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[16px]">download</span> Download Certificate
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejected summary – only on rejected tab */}
            {activeTab === 'rejected' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Rejection Reasons Breakdown</h4>
                        <div className="space-y-4">
                            {[
                                { reason: 'Invalid TIN / Tax ID', count: 8, pct: 44 },
                                { reason: 'Duplicate Registration', count: 5, pct: 28 },
                                { reason: 'Incomplete Documentation', count: 3, pct: 17 },
                                { reason: 'Suspicious Activity', count: 2, pct: 11 },
                            ].map((r) => (
                                <div key={r.reason}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-text-secondary">{r.reason}</span>
                                        <span className="text-white font-medium">{r.count} ({r.pct}%)</span>
                                    </div>
                                    <div className="w-full h-2 bg-border-dark rounded-full overflow-hidden">
                                        <div className="h-full bg-red-500/60 rounded-full" style={{ width: `${r.pct}%` }}></div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6">
                        <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Appeal Process</h4>
                        <div className="bg-surface-darker border border-border-dark rounded-lg p-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-yellow-500/10 p-3 rounded-lg text-yellow-500">
                                    <span className="material-symbols-outlined text-2xl">info</span>
                                </div>
                                <div>
                                    <h5 className="text-white font-bold mb-2">How Appeals Work</h5>
                                    <ul className="text-text-secondary text-sm space-y-2">
                                        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[14px] text-primary mt-0.5">chevron_right</span> Rejected sellers can submit updated documents within 30 days</li>
                                        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[14px] text-primary mt-0.5">chevron_right</span> Appeals are reviewed by a different certifier for fairness</li>
                                        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[14px] text-primary mt-0.5">chevron_right</span> Re-review button allows manual re-evaluation</li>
                                        <li className="flex items-start gap-2"><span className="material-symbols-outlined text-[14px] text-primary mt-0.5">chevron_right</span> All decisions are logged on-chain for auditability</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}
