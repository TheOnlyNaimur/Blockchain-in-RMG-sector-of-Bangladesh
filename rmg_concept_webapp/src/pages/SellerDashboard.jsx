import { useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import StatusBadge from '../components/ui/StatusBadge'

const orders = [
    { id: '#ORD-2023-001', buyer: '0x4A...b2C', status: 'Accepted', statusColor: 'green', amount: '5,000.00', action: 'Create Batch' },
    { id: '#ORD-2023-002', buyer: '0x8B...e1F', status: 'Created', statusColor: 'blue', amount: '2,500.00', action: null },
    { id: '#ORD-2023-003', buyer: '0x1C...d9A', status: 'Accepted', statusColor: 'green', amount: '10,000.00', action: 'Create Batch' },
    { id: '#ORD-2023-004', buyer: '0x9E...f3D', status: 'Pending', statusColor: 'yellow', amount: '1,200.00', action: null },
    { id: '#ORD-2023-005', buyer: '0x2F...a9C', status: 'Cancelled', statusColor: 'red', amount: '0.00', action: 'delete' },
]

export default function SellerDashboard() {
    const [showCreateBatch, setShowCreateBatch] = useState(false)
    const [showCertificate, setShowCertificate] = useState(false)
    const [showEditProfile, setShowEditProfile] = useState(false)
    const [batchOrder, setBatchOrder] = useState(null)

    return (
        <AppLayout title="Seller Dashboard">
            {/* Profile */}
            <section className="mb-8 bg-surface-dark border border-border-dark rounded-xl p-6 shadow-sm">
                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="relative">
                            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/30 to-blue-500/30 border-4 border-border-dark flex items-center justify-center">
                                <span className="material-symbols-outlined text-4xl text-primary">storefront</span>
                            </div>
                            <div className="absolute -bottom-1 -right-1 bg-primary text-background-dark rounded-full p-1 border-2 border-surface-dark">
                                <span className="material-symbols-outlined text-[16px] font-bold block">verified</span>
                            </div>
                        </div>
                        <div className="flex flex-col justify-center gap-1">
                            <div className="flex items-center gap-3">
                                <h1 className="text-white text-2xl md:text-[28px] font-bold leading-tight tracking-[-0.015em]">Acme Global Exports</h1>
                                <span className="bg-primary/20 text-primary text-xs font-bold px-2 py-1 rounded uppercase tracking-wider border border-primary/30">Approved</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-text-secondary text-sm">
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px]">account_balance_wallet</span>
                                    <span className="font-mono">0x71C...9A2</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                                    <span className="font-mono">Cert: 0x3dF...4b1</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex w-full md:w-auto gap-3">
                        <button onClick={() => setShowCertificate(true)} className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-border-dark hover:bg-[#34463b] text-white text-sm font-bold transition-colors flex-1 md:flex-none">
                            <span className="material-symbols-outlined text-[18px]">visibility</span>
                            View Certificate
                        </button>
                        <button onClick={() => setShowEditProfile(true)} className="flex items-center justify-center gap-2 rounded-lg h-10 px-4 bg-border-dark hover:bg-[#34463b] text-white text-sm font-bold transition-colors flex-1 md:flex-none">
                            <span className="material-symbols-outlined text-[18px]">edit</span>
                            Edit Profile
                        </button>
                    </div>
                </div>
            </section>

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Orders Table */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-white text-xl font-bold">Orders Created</h2>
                        <select className="bg-border-dark text-white text-sm border-none rounded-lg focus:ring-1 focus:ring-primary py-2 pl-3 pr-8">
                            <option>All Status</option>
                            <option>Accepted</option>
                            <option>Created</option>
                            <option>Pending</option>
                        </select>
                    </div>

                    <div className="overflow-hidden rounded-xl border border-border-dark bg-surface-dark shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-border-dark/50 border-b border-border-dark">
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Order ID</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Buyer Address</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-right">Escrowed USDT</th>
                                        <th className="px-6 py-4 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-dark">
                                    {orders.map((order) => (
                                        <tr key={order.id} className="group hover:bg-border-dark/30 transition-colors">
                                            <td className="px-6 py-4 text-sm font-medium text-white font-mono">{order.id}</td>
                                            <td className="px-6 py-4 text-sm text-text-secondary font-mono">{order.buyer}</td>
                                            <td className="px-6 py-4">
                                                <StatusBadge label={order.status} color={order.statusColor} />
                                            </td>
                                            <td className="px-6 py-4 text-sm text-white font-medium text-right">{order.amount}</td>
                                            <td className="px-6 py-4 text-center">
                                                {order.action === 'Create Batch' ? (
                                                    <button
                                                        onClick={() => { setBatchOrder(order); setShowCreateBatch(true); }}
                                                        className="inline-flex items-center justify-center rounded-lg px-3 py-1.5 bg-primary text-background-dark text-xs font-bold hover:bg-primary-hover transition-colors shadow-sm shadow-primary/20"
                                                    >
                                                        Create Batch
                                                    </button>
                                                ) : order.action === 'delete' ? (
                                                    <button className="text-text-secondary hover:text-white transition-colors">
                                                        <span className="material-symbols-outlined text-[18px]">delete</span>
                                                    </button>
                                                ) : (
                                                    <span className="text-xs text-text-secondary italic">
                                                        {order.statusColor === 'blue' ? 'Waiting for Buyer' : 'Escrow Processing'}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div className="px-6 py-4 border-t border-border-dark flex items-center justify-between">
                            <span className="text-sm text-text-secondary">Showing 1 to 5 of 24 entries</span>
                            <div className="flex gap-2">
                                <button className="px-3 py-1 rounded bg-border-dark text-white text-sm hover:bg-[#34463b] disabled:opacity-50" disabled>Prev</button>
                                <button className="px-3 py-1 rounded bg-border-dark text-white text-sm hover:bg-[#34463b]">Next</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Create Order Form */}
                <div className="lg:col-span-4">
                    <div className="bg-surface-dark border border-border-dark rounded-xl p-6 sticky top-24 shadow-lg shadow-black/20">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                <span className="material-symbols-outlined">add_shopping_cart</span>
                            </div>
                            <h3 className="text-white text-lg font-bold">Create New Order</h3>
                        </div>
                        <form className="flex flex-col gap-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Buyer Wallet Address</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-secondary">
                                        <span className="material-symbols-outlined text-[18px]">wallet</span>
                                    </span>
                                    <input className="w-full bg-border-dark border-none rounded-lg py-2.5 pl-10 pr-4 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm font-mono" placeholder="0x..." />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Order Details</label>
                                <textarea className="w-full bg-border-dark border-none rounded-lg p-3 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm resize-none" placeholder="Describe the goods, quantity, and delivery terms..." rows="4"></textarea>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-white">Total Amount</label>
                                    <div className="relative">
                                        <input className="w-full bg-border-dark border-none rounded-lg py-2.5 pl-3 pr-12 text-white placeholder:text-text-secondary focus:ring-1 focus:ring-primary text-sm" placeholder="0.00" type="number" />
                                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary text-xs font-bold">USDT</span>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-white">Deadline</label>
                                    <input className="w-full bg-border-dark border-none rounded-lg py-2.5 px-3 text-white focus:ring-1 focus:ring-primary text-sm [color-scheme:dark]" type="date" />
                                </div>
                            </div>
                            <div className="h-px bg-border-dark my-2"></div>
                            <button className="flex w-full items-center justify-center rounded-lg h-11 px-4 bg-primary hover:bg-primary-hover text-background-dark text-sm font-bold transition-colors shadow-lg shadow-primary/20" type="button">
                                Submit Order Proposal
                            </button>
                        </form>
                        <div className="mt-6 pt-6 border-t border-border-dark">
                            <div className="flex items-start gap-3 p-3 rounded-lg bg-border-dark/30 border border-border-dark">
                                <span className="material-symbols-outlined text-text-secondary text-[20px] mt-0.5">info</span>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    Once submitted, the buyer must accept the order and escrow funds before shipment tracking begins.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── CREATE BATCH MODAL ── */}
            {showCreateBatch && batchOrder && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowCreateBatch(false)}>
                    <div className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">inventory_2</span>
                                    Create Production Batch
                                </h3>
                                <p className="text-text-secondary text-sm mt-1">Create a new batch for order {batchOrder.id}</p>
                            </div>
                            <button onClick={() => setShowCreateBatch(false)} className="text-text-secondary hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Order</span>
                                        <p className="text-white font-mono font-medium">{batchOrder.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Buyer</span>
                                        <p className="text-white font-mono">{batchOrder.buyer}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Escrowed</span>
                                        <p className="text-white font-bold">{batchOrder.amount} USDT</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Status</span>
                                        <StatusBadge label={batchOrder.status} color={batchOrder.statusColor} />
                                    </div>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Batch Description</label>
                                <textarea
                                    className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none"
                                    placeholder="Describe the production batch, materials used, and quality specifications..."
                                    rows="3"
                                ></textarea>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-white">Quantity</label>
                                    <input
                                        className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                                        placeholder="e.g. 5000 units"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-sm font-medium text-white">Unit Weight (KG)</label>
                                    <input
                                        className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263]"
                                        placeholder="e.g. 0.5"
                                        type="number"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Production Date</label>
                                <input className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 [color-scheme:dark]" type="date" />
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Quality Grade</label>
                                <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                                    <option>Grade A — Premium Export Quality</option>
                                    <option>Grade B — Standard Commercial</option>
                                    <option>Grade C — Economy</option>
                                </select>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center">
                            <p className="text-xs text-text-secondary flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Batch will be sent to QC for review
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowCreateBatch(false)} className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors">Cancel</button>
                                <button className="px-5 py-2 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2">
                                    <span className="material-symbols-outlined text-[18px]">add</span>
                                    Create Batch
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── VIEW CERTIFICATE MODAL ── */}
            {showCertificate && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowCertificate(false)}>
                    <div className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">verified</span>
                                    On-Chain Certificate
                                </h3>
                                <p className="text-text-secondary text-sm mt-1">Blockchain-verified seller credentials</p>
                            </div>
                            <button onClick={() => setShowCertificate(false)} className="text-text-secondary hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Certificate Visual */}
                            <div className="relative border-2 border-primary/30 rounded-xl p-8 bg-gradient-to-br from-primary/5 to-transparent text-center overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent"></div>
                                <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                                    <span className="material-symbols-outlined text-4xl text-primary">workspace_premium</span>
                                </div>
                                <h4 className="text-white text-xl font-bold mb-1">Acme Global Exports</h4>
                                <p className="text-primary text-sm font-semibold mb-4">Certified Seller — TradeChain Network</p>
                                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold border border-primary/20">
                                    <span className="material-symbols-outlined text-[14px]">check_circle</span> VALID
                                </div>
                            </div>

                            {/* Details */}
                            <div className="space-y-3">
                                {[
                                    ['Certificate Hash', '0x3dF7...4b1a8c', true],
                                    ['Issued By', '0x9A2...71C (Certifier)', false],
                                    ['Issue Date', 'Oct 15, 2023 at 14:32 UTC', false],
                                    ['Tax ID (TIN)', 'US-12-3456789', false],
                                    ['Block Number', '#18,245,901', false],
                                    ['Gas Used', '0.0042 ETH', false],
                                ].map(([label, value, isMono]) => (
                                    <div key={label} className="flex justify-between items-center py-2.5 border-b border-border-dark/50">
                                        <span className="text-sm text-text-secondary">{label}</span>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm ${isMono ? 'font-mono text-primary' : 'text-white'} font-medium`}>{value}</span>
                                            {isMono && (
                                                <button className="text-text-secondary hover:text-white transition-colors">
                                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="p-6 border-t border-border-dark bg-surface-darker flex gap-3">
                            <button className="flex-1 px-4 py-2.5 bg-border-dark text-white rounded-lg text-sm font-medium hover:bg-[#34463b] transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">open_in_new</span> View on Etherscan
                            </button>
                            <button className="flex-1 px-4 py-2.5 bg-primary/10 text-primary border border-primary/20 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">download</span> Download PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── EDIT PROFILE MODAL ── */}
            {showEditProfile && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowEditProfile(false)}>
                    <div className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">edit</span>
                                    Edit Seller Profile
                                </h3>
                                <p className="text-text-secondary text-sm mt-1">Update your on-chain business information</p>
                            </div>
                            <button onClick={() => setShowEditProfile(false)} className="text-text-secondary hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Business Name</label>
                                <input className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3" defaultValue="Acme Global Exports" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Contact Email</label>
                                <input className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3" defaultValue="admin@acmeglobal.com" type="email" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Contact Phone</label>
                                <input className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3" defaultValue="+1 (555) 123-4567" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Business Address</label>
                                <textarea className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 resize-none" rows="2" defaultValue="123 Trade Avenue, Suite 500, New York, NY 10001" />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Product Categories</label>
                                <div className="flex flex-wrap gap-2">
                                    {['Electronics', 'Textiles', 'Agriculture', 'Manufacturing'].map((cat) => (
                                        <label key={cat} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background-dark border border-border-dark text-sm cursor-pointer hover:border-primary/40 transition-colors">
                                            <input type="checkbox" className="w-3.5 h-3.5 text-primary bg-background-dark border-border-dark rounded focus:ring-primary" defaultChecked={cat === 'Electronics' || cat === 'Manufacturing'} />
                                            <span className="text-text-secondary">{cat}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-lg bg-yellow-500/5 border border-yellow-500/20 p-3 flex items-start gap-3">
                                <span className="material-symbols-outlined text-yellow-500 text-[20px] mt-0.5">info</span>
                                <p className="text-xs text-yellow-500/80">Profile updates require a blockchain transaction (est. 0.001 ETH gas fee). Your TIN and wallet address cannot be changed.</p>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-end gap-3">
                            <button onClick={() => setShowEditProfile(false)} className="px-5 py-2.5 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors">Cancel</button>
                            <button className="px-5 py-2.5 text-sm font-bold text-background-dark bg-primary hover:bg-primary-hover rounded-lg transition-colors flex items-center gap-2">
                                <span className="material-symbols-outlined text-[18px]">save</span>
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}
