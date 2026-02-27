import { useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import StatCard from '../components/ui/StatCard'

const batches = [
    { id: '#B-9021', order: 'ORD-5542', seller: 'AgroExports Ltd.', initials: 'AE', product: 'Premium Coffee Beans (Type A)', qty: '5,000 KG', time: '2023-10-27 09:30', status: 'Pending', hash: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F' },
    { id: '#B-9022', order: 'ORD-5543', seller: 'TechComp Inc.', initials: 'TC', product: 'Microchips X7 Processors', qty: '10,000 Units', time: '2023-10-27 10:15', status: 'Queued', hash: '0x3E4B1F9A2C71D885EC7ab98bdef751B7401B5d6F' },
    { id: '#B-9023', order: 'ORD-5544', seller: 'SteelWorks Co.', initials: 'SW', product: 'Industrial Steel Rods', qty: '200 Tons', time: '2023-10-27 11:00', status: 'Queued', hash: '0x9A271C3E4B1F885EC7ab88b098defB751B7401B5' },
    { id: '#B-9024', order: 'ORD-5545', seller: 'GreenValley', initials: 'GV', product: 'Organic Soybeans', qty: '8,000 KG', time: '2023-10-27 11:45', status: 'Queued', hash: '0x1F28E9D4C5A6B7885EC7ab88b098defB751B7401' },
    { id: '#B-9025', order: 'ORD-5546', seller: 'PharmaCare', initials: 'PC', product: 'Vaccine Batch V-22', qty: '2,500 Vials', time: '2023-10-27 12:30', status: 'Queued', hash: '0x5F6G7H8I9J0K1L885EC7ab88b098defB751B7401' },
]

export default function QCBatchReview() {
    const [selectedBatch, setSelectedBatch] = useState(batches[0])

    return (
        <AppLayout title="Quality Control">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-border-dark pb-6 mb-8">
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-semibold text-primary ring-1 ring-inset ring-primary/20">
                            <span className="material-symbols-outlined text-[14px]">verified_user</span> Authorized Personnel Only
                        </span>
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-800 px-2 py-1 text-xs font-medium text-slate-400">
                            Node: QC-US-EAST-04
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">Batch Review Console</h1>
                    <p className="text-text-secondary max-w-2xl">Validate product quality against smart contract specifications before authorizing shipment release.</p>
                </div>
                <div className="flex gap-3">
                    <button className="inline-flex items-center gap-2 rounded-lg bg-surface-dark px-4 py-2.5 text-sm font-semibold text-white ring-1 ring-border-dark hover:bg-border-dark transition-all">
                        <span className="material-symbols-outlined text-[18px]">history</span> Review History
                    </button>
                    <button className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-background-dark hover:bg-primary/90 transition-all">
                        <span className="material-symbols-outlined text-[20px]">refresh</span> Sync Contract State
                    </button>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard label="Pending Reviews" value="12" change="3 high priority" icon="pending_actions" changeColor="text-orange-500" />
                <StatCard label="Approved Today" value="45" change="+12% vs yesterday" icon="check_circle" />
                <StatCard label="Rejected Today" value="2" icon="cancel" />
                <StatCard label="Avg. Processing Time" value="14m" change="Optimal efficiency" icon="timer" />
            </div>

            {/* Main Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 items-start">
                {/* Table */}
                <div className="xl:col-span-2 flex flex-col gap-4">
                    <div className="flex items-center justify-between px-1">
                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                            Pending Batches
                            <span className="bg-primary/20 text-primary text-xs px-2 py-0.5 rounded-full border border-primary/20">Live Feed</span>
                        </h3>
                    </div>
                    <div className="overflow-hidden rounded-xl border border-border-dark bg-surface-dark shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm whitespace-nowrap">
                                <thead className="bg-surface-darker border-b border-border-dark">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-white">Batch ID</th>
                                        <th className="px-6 py-4 font-semibold text-white">Order ID</th>
                                        <th className="px-6 py-4 font-semibold text-white">Seller</th>
                                        <th className="px-6 py-4 font-semibold text-white">Product Info</th>
                                        <th className="px-6 py-4 font-semibold text-white">Timestamp</th>
                                        <th className="px-6 py-4 font-semibold text-white">Status</th>
                                        <th className="px-6 py-4 font-semibold text-white text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {batches.map((b) => {
                                        const isActive = selectedBatch?.id === b.id
                                        return (
                                            <tr
                                                key={b.id}
                                                onClick={() => setSelectedBatch(b)}
                                                className={`${isActive ? 'bg-primary/5' : 'hover:bg-border-dark/30'} transition-colors cursor-pointer group`}
                                            >
                                                <td className={`px-6 py-4 font-medium ${isActive ? 'text-primary' : 'text-white group-hover:text-primary'} transition-colors`}>{b.id}</td>
                                                <td className="px-6 py-4 text-slate-300">{b.order}</td>
                                                <td className="px-6 py-4 text-slate-300">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-bold">{b.initials}</div>
                                                        {b.seller}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-300">{b.product}</td>
                                                <td className="px-6 py-4 text-slate-400 font-mono text-xs">{b.time}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${isActive ? 'bg-yellow-900/30 text-yellow-500' : 'bg-slate-800 text-slate-400'}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-yellow-500' : 'bg-slate-500'}`}></span>
                                                        {isActive ? 'Reviewing' : b.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button className={`${isActive ? 'text-primary font-bold' : 'text-slate-400 group-hover:text-primary'} font-medium text-sm transition-colors flex items-center gap-1 ml-auto`}>
                                                        <span className="material-symbols-outlined text-[16px]">{isActive ? 'visibility' : 'preview'}</span>
                                                        {isActive ? 'Active' : 'Review'}
                                                    </button>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <div className="flex items-center justify-between border-t border-border-dark px-6 py-3 bg-surface-darker">
                            <p className="text-xs text-slate-400">Showing 1-5 of 24 pending items</p>
                            <div className="flex gap-2">
                                <button className="p-1 rounded hover:bg-border-dark text-slate-500"><span className="material-symbols-outlined text-[18px]">chevron_left</span></button>
                                <button className="p-1 rounded hover:bg-border-dark text-slate-500"><span className="material-symbols-outlined text-[18px]">chevron_right</span></button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detail Panel — dynamically updates */}
                <div className="xl:col-span-1 flex flex-col gap-6 sticky top-24">
                    {selectedBatch ? (
                        <>
                            <div className="rounded-xl border border-primary/30 bg-surface-dark shadow-lg ring-1 ring-primary/20 overflow-hidden">
                                <div className="h-1 w-full bg-border-dark">
                                    <div className="h-full bg-primary w-2/3 relative"><div className="absolute right-0 top-0 bottom-0 w-2 bg-white/50 animate-pulse"></div></div>
                                </div>
                                <div className="p-6 flex flex-col gap-6">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-lg font-bold text-white">Batch {selectedBatch.id}</h3>
                                            <p className="text-sm text-slate-400">{selectedBatch.seller}</p>
                                        </div>
                                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-900/20 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-700/10">QC Stage 2</span>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                        <div className="p-3 rounded-lg bg-background-dark border border-border-dark">
                                            <p className="text-xs text-slate-400 mb-1">Product Type</p>
                                            <p className="font-medium text-white">{selectedBatch.product}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background-dark border border-border-dark">
                                            <p className="text-xs text-slate-400 mb-1">Quantity</p>
                                            <p className="font-medium text-white">{selectedBatch.qty}</p>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background-dark border border-border-dark col-span-2">
                                            <p className="text-xs text-slate-400 mb-1">Origin Hash</p>
                                            <p className="font-mono text-xs text-slate-300 truncate">{selectedBatch.hash}</p>
                                        </div>
                                    </div>

                                    <div className="rounded-md bg-yellow-900/20 p-4 border border-yellow-900/50">
                                        <div className="flex">
                                            <span className="material-symbols-outlined text-yellow-500 text-[20px] mr-3">warning</span>
                                            <div>
                                                <h3 className="text-sm font-medium text-yellow-500">Irreversible Action</h3>
                                                <p className="mt-1 text-xs text-yellow-400/80">Approval immediately triggers shipment eligibility on the blockchain.</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <button className="flex items-center justify-center gap-2 rounded-lg border-2 border-red-500/30 bg-transparent py-3 text-sm font-bold text-red-400 hover:bg-red-900/20 hover:border-red-500 transition-all">
                                            <span className="material-symbols-outlined text-[20px]">thumb_down</span> Reject
                                        </button>
                                        <button className="flex items-center justify-center gap-2 rounded-lg bg-primary py-3 text-sm font-bold text-background-dark shadow-lg shadow-primary/20 hover:bg-primary/90 transition-all">
                                            <span className="material-symbols-outlined text-[20px]">verified</span> Approve Batch
                                        </button>
                                    </div>
                                </div>
                                <div className="bg-surface-darker px-6 py-3 border-t border-border-dark flex items-center justify-between text-xs text-slate-400">
                                    <span>Smart Contract: <span className="font-mono">v2.4.1</span></span>
                                    <span className="flex items-center gap-1"><span className="block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> Network Active</span>
                                </div>
                            </div>

                            <div className="rounded-xl bg-surface-dark p-4 border border-border-dark">
                                <h4 className="text-sm font-semibold text-white mb-2">Quality Standards Reference</h4>
                                <ul className="space-y-2">
                                    {['Moisture content must be < 12%', 'Zero insect damage tolerance', 'Packaging integrity > 98%'].map((s, i) => (
                                        <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                            <span className="material-symbols-outlined text-[16px] text-primary mt-0.5">check_circle</span> {s}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </>
                    ) : (
                        <div className="rounded-xl border border-border-dark bg-surface-dark p-8 flex flex-col items-center text-center">
                            <span className="material-symbols-outlined text-5xl text-text-secondary mb-4">touch_app</span>
                            <p className="text-white font-medium">Select a batch</p>
                            <p className="text-text-secondary text-sm">Click a row in the table to review its details.</p>
                        </div>
                    )}
                </div>
            </div>
        </AppLayout>
    )
}
