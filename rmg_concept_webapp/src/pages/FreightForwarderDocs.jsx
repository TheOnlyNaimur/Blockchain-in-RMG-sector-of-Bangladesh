import { useState } from 'react'
import AppLayout from '../layouts/AppLayout'
import StatCard from '../components/ui/StatCard'
import StatusBadge from '../components/ui/StatusBadge'

const shipments = [
    { id: 'B-99283', order: 'ORD-2023-001', shipStatus: 'In Transit', shipColor: 'blue', docStatus: 'Pending Upload', docColor: 'yellow', icon: 'qr_code_2', iconBg: 'bg-primary/10 text-primary' },
    { id: 'B-99284', order: 'ORD-2023-005', shipStatus: 'Customs Hold', shipColor: 'red', docStatus: 'Missing BOL', docColor: 'red', icon: 'warning', iconBg: 'bg-red-500/10 text-red-500' },
    { id: 'B-99285', order: 'ORD-2023-012', shipStatus: 'Warehoused', shipColor: 'purple', docStatus: 'Verified', docColor: 'green', icon: 'warehouse', iconBg: 'bg-surface-darker text-text-secondary' },
    { id: 'B-99286', order: 'ORD-2023-018', shipStatus: 'Dispatched', shipColor: 'blue', docStatus: 'Pending Invoice', docColor: 'yellow', icon: 'local_shipping', iconBg: 'bg-surface-darker text-text-secondary' },
    { id: 'B-99287', order: 'ORD-2023-022', shipStatus: 'In Transit', shipColor: 'blue', docStatus: 'Verified', docColor: 'green', icon: 'local_shipping', iconBg: 'bg-surface-darker text-text-secondary' },
]

export default function FreightForwarderDocs() {
    const [showUploadModal, setShowUploadModal] = useState(false)
    const [uploadBatch, setUploadBatch] = useState(null)
    const [fileName, setFileName] = useState('')

    const handleUpload = (shipment) => { setUploadBatch(shipment); setShowUploadModal(true); setFileName(''); }

    return (
        <AppLayout title="Freight Forwarder">
            {/* Breadcrumb & Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-text-secondary text-sm">Shipments</span>
                        <span className="text-text-secondary text-sm">/</span>
                        <span className="text-primary text-sm font-medium">Documentation</span>
                    </div>
                    <h1 className="text-white text-3xl font-black tracking-tight mb-2">Shipment Documentation</h1>
                    <p className="text-text-secondary max-w-2xl">Manage pending documentation and verify shipment data hashes before blockchain submission.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center justify-center h-10 px-4 rounded-lg border border-border-dark bg-surface-dark text-white text-sm font-medium hover:bg-border-dark transition-colors">
                        <span className="material-symbols-outlined text-[20px] mr-2">filter_list</span> Filter
                    </button>
                    <button className="flex items-center justify-center h-10 px-4 rounded-lg bg-primary text-background-dark text-sm font-bold hover:bg-primary-hover transition-colors shadow-[0_0_15px_rgba(19,236,91,0.3)]">
                        <span className="material-symbols-outlined text-[20px] mr-2">add</span> New Shipment
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
                <StatCard label="Pending Uploads" value="12" change="+2%" icon="upload_file" />
                <StatCard label="Verified Hashes" value="45" change="+12%" icon="fact_check" />
                <StatCard label="Active Shipments" value="8" icon="local_shipping" />
                <StatCard label="Completed Batches" value="156" change="+5%" icon="inventory_2" />
            </div>

            {/* Two Column */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Table */}
                <div className="xl:col-span-2 flex flex-col rounded-xl border border-border-dark bg-surface-dark overflow-hidden">
                    <div className="p-5 border-b border-border-dark flex justify-between items-center bg-surface-darker">
                        <h3 className="text-white text-lg font-bold">Active Shipments</h3>
                        <button className="text-text-secondary hover:text-primary text-sm font-medium transition-colors">View All</button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-surface-darker/50 border-b border-border-dark">
                                    <th className="p-4 text-xs uppercase tracking-wider text-text-secondary font-semibold">Batch ID</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-text-secondary font-semibold">Order ID</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-text-secondary font-semibold">Status</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-text-secondary font-semibold">Doc Status</th>
                                    <th className="p-4 text-xs uppercase tracking-wider text-text-secondary font-semibold text-right">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-dark">
                                {shipments.map((s) => (
                                    <tr key={s.id} className="group hover:bg-surface-darker transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`${s.iconBg} p-2 rounded`}>
                                                    <span className="material-symbols-outlined text-[20px]">{s.icon}</span>
                                                </div>
                                                <span className="text-white font-medium text-sm">{s.id}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 text-text-secondary text-sm">{s.order}</td>
                                        <td className="p-4"><StatusBadge label={s.shipStatus} color={s.shipColor} /></td>
                                        <td className="p-4"><StatusBadge label={s.docStatus} color={s.docColor} icon={s.docColor === 'green' ? 'check' : null} /></td>
                                        <td className="p-4 text-right">
                                            {s.docColor === 'green' ? (
                                                <button className="text-text-secondary hover:text-white font-medium text-sm flex items-center gap-1 ml-auto">
                                                    <span className="material-symbols-outlined text-[16px]">visibility</span> View
                                                </button>
                                            ) : (
                                                <button
                                                    onClick={() => handleUpload(s)}
                                                    className="text-primary hover:text-primary-hover font-medium text-sm flex items-center gap-1 ml-auto"
                                                >
                                                    <span className="material-symbols-outlined text-[16px]">cloud_upload</span> Upload
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 border-t border-border-dark bg-surface-dark flex justify-between items-center text-sm text-text-secondary">
                        <span>Showing 5 of 12 pending items</span>
                        <div className="flex gap-2">
                            <button className="p-1 rounded hover:bg-surface-darker disabled:opacity-50" disabled><span className="material-symbols-outlined">chevron_left</span></button>
                            <button className="p-1 rounded hover:bg-surface-darker text-white"><span className="material-symbols-outlined">chevron_right</span></button>
                        </div>
                    </div>
                </div>

                {/* Side Panel */}
                <div className="xl:col-span-1 flex flex-col gap-6">
                    <div className="rounded-xl border border-border-dark bg-surface-dark p-6">
                        <h3 className="text-white text-lg font-bold mb-1">Document Verification</h3>
                        <p className="text-text-secondary text-sm mb-6">Upload shipment documents to generate a cryptographic hash for blockchain entry.</p>

                        <div className="bg-surface-darker rounded-lg p-3 border border-border-dark mb-6 flex items-start gap-3">
                            <div className="bg-primary/20 p-2 rounded text-primary mt-0.5">
                                <span className="material-symbols-outlined text-[20px]">qr_code_2</span>
                            </div>
                            <div>
                                <p className="text-xs text-text-secondary uppercase font-semibold">Selected Batch</p>
                                <p className="text-white font-medium">B-99283 (ORD-2023-001)</p>
                                <p className="text-xs text-yellow-500 mt-1">Required: Bill of Lading</p>
                            </div>
                        </div>

                        {/* Dropzone */}
                        <div
                            onClick={() => handleUpload(shipments[0])}
                            className="border-2 border-dashed border-border-dark rounded-xl p-8 flex flex-col items-center justify-center text-center bg-surface-darker/50 hover:bg-surface-darker hover:border-primary/50 transition-all duration-200 cursor-pointer group"
                        >
                            <div className="bg-background-dark p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg border border-border-dark">
                                <span className="material-symbols-outlined text-4xl text-primary">cloud_upload</span>
                            </div>
                            <p className="text-white font-medium mb-1">Click to upload or drag and drop</p>
                            <p className="text-text-secondary text-xs">PDF, JPG or PNG (max. 10MB)</p>
                        </div>

                        {/* Hash Result */}
                        <div className="mt-6">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs uppercase text-text-secondary font-bold tracking-wider">Generated SHA-256 Hash</span>
                                <span className="text-xs text-primary flex items-center gap-1">
                                    <span className="material-symbols-outlined text-[14px]">lock</span> Secure
                                </span>
                            </div>
                            <div className="bg-surface-darker p-3 rounded-lg border border-border-dark font-mono text-xs text-text-secondary break-all mb-4 relative group/hash">
                                7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                                <button className="absolute right-2 top-2 p-1 bg-surface-dark text-white rounded opacity-0 group-hover/hash:opacity-100 transition-opacity border border-border-dark">
                                    <span className="material-symbols-outlined text-[14px]">content_copy</span>
                                </button>
                            </div>
                            <button className="w-full h-11 bg-primary hover:bg-primary-hover text-background-dark font-bold rounded-lg transition-colors flex items-center justify-center gap-2">
                                <span className="material-symbols-outlined">send</span>
                                Submit Hash to Blockchain
                            </button>
                            <p className="text-[10px] text-center text-text-secondary mt-3">
                                Only the cryptographic hash is submitted. The original file remains on your local device.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl bg-gradient-to-br from-surface-dark to-surface-darker border border-border-dark p-6">
                        <div className="flex items-start gap-4">
                            <div className="bg-blue-500/20 p-2.5 rounded-lg text-blue-400 shrink-0">
                                <span className="material-symbols-outlined">info</span>
                            </div>
                            <div>
                                <h4 className="text-white font-bold text-sm mb-1">Why Hash Verification?</h4>
                                <p className="text-text-secondary text-xs leading-relaxed">
                                    Hashing creates a unique digital fingerprint of your document. By storing this on the blockchain, partners can verify document authenticity without exposing sensitive data publicly.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── UPLOAD DOCUMENT MODAL ── */}
            {showUploadModal && uploadBatch && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setShowUploadModal(false)}>
                    <div className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6 border-b border-border-dark bg-surface-darker flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                    <span className="material-symbols-outlined text-primary">cloud_upload</span>
                                    Upload Documents
                                </h3>
                                <p className="text-text-secondary text-sm mt-1">Upload shipment documentation for batch {uploadBatch.id}</p>
                            </div>
                            <button onClick={() => setShowUploadModal(false)} className="text-text-secondary hover:text-white transition-colors">
                                <span className="material-symbols-outlined">close</span>
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Batch Info */}
                            <div className="p-4 rounded-lg bg-background-dark border border-border-dark">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Batch</span>
                                        <p className="text-white font-mono font-medium">{uploadBatch.id}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Order</span>
                                        <p className="text-white font-mono">{uploadBatch.order}</p>
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Shipment</span>
                                        <StatusBadge label={uploadBatch.shipStatus} color={uploadBatch.shipColor} />
                                    </div>
                                    <div>
                                        <span className="text-xs text-text-secondary uppercase tracking-wider">Docs</span>
                                        <StatusBadge label={uploadBatch.docStatus} color={uploadBatch.docColor} />
                                    </div>
                                </div>
                            </div>

                            {/* Document Type */}
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Document Type</label>
                                <select className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3">
                                    <option>Bill of Lading (BOL)</option>
                                    <option>Commercial Invoice</option>
                                    <option>Packing List</option>
                                    <option>Certificate of Origin</option>
                                    <option>Insurance Certificate</option>
                                    <option>Customs Declaration</option>
                                </select>
                            </div>

                            {/* Dropzone */}
                            <div className="border-2 border-dashed border-border-dark rounded-xl p-8 flex flex-col items-center justify-center text-center bg-surface-darker/50 hover:bg-surface-darker hover:border-primary/50 transition-all duration-200 cursor-pointer group relative">
                                <input
                                    type="file"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setFileName(e.target.files?.[0]?.name || '')}
                                />
                                <div className="bg-background-dark p-4 rounded-full mb-4 group-hover:scale-110 transition-transform shadow-lg border border-border-dark">
                                    <span className="material-symbols-outlined text-4xl text-primary">{fileName ? 'description' : 'cloud_upload'}</span>
                                </div>
                                {fileName ? (
                                    <>
                                        <p className="text-white font-medium mb-1">{fileName}</p>
                                        <p className="text-primary text-xs">File ready — click to change</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="text-white font-medium mb-1">Click to select file or drag and drop</p>
                                        <p className="text-text-secondary text-xs">PDF, JPG or PNG (max. 10MB)</p>
                                    </>
                                )}
                            </div>

                            {/* Hash Preview */}
                            {fileName && (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-xs uppercase text-text-secondary font-bold tracking-wider">SHA-256 Hash Preview</span>
                                        <span className="text-xs text-primary flex items-center gap-1">
                                            <span className="material-symbols-outlined text-[14px]">lock</span> Generated
                                        </span>
                                    </div>
                                    <div className="bg-surface-darker p-3 rounded-lg border border-border-dark font-mono text-xs text-primary break-all">
                                        7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069
                                    </div>
                                </div>
                            )}

                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-medium text-white">Notes (optional)</label>
                                <textarea className="w-full bg-background-dark border border-border-dark text-white text-sm rounded-lg focus:ring-primary focus:border-primary p-3 placeholder-[#5c7263] resize-none" placeholder="Add any additional notes about this document..." rows="2"></textarea>
                            </div>
                        </div>

                        <div className="p-6 border-t border-border-dark bg-surface-darker flex justify-between items-center">
                            <p className="text-xs text-text-secondary flex items-center gap-1.5">
                                <span className="material-symbols-outlined text-[14px]">info</span>
                                Only the hash is stored on-chain
                            </p>
                            <div className="flex gap-3">
                                <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-sm font-medium text-white border border-border-dark rounded-lg hover:bg-border-dark transition-colors">Cancel</button>
                                <button className={`px-5 py-2 text-sm font-bold rounded-lg transition-colors flex items-center gap-2 ${fileName ? 'bg-primary text-background-dark hover:bg-primary-hover' : 'bg-[#5c7263] text-[#102216] cursor-not-allowed opacity-70'}`} disabled={!fileName}>
                                    <span className="material-symbols-outlined text-[18px]">send</span>
                                    Upload & Hash
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    )
}
