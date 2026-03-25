import { useState } from 'react'

export default function Modal({ isOpen, onClose, title, subtitle, icon, children, footer }) {
    if (!isOpen) return null

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
            <div
                className="w-full max-w-lg bg-surface-dark border border-border-dark rounded-2xl shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Close */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-text-secondary hover:text-white transition-colors z-10"
                >
                    <span className="material-symbols-outlined">close</span>
                </button>

                {/* Header */}
                <div className="p-6 border-b border-border-dark bg-surface-darker">
                    <div className="flex items-center gap-3 mb-2">
                        {icon && <span className="material-symbols-outlined text-primary">{icon}</span>}
                        <h3 className="text-xl font-bold text-white">{title}</h3>
                    </div>
                    {subtitle && <p className="text-text-secondary text-sm">{subtitle}</p>}
                </div>

                {/* Body */}
                <div className="p-6 flex flex-col gap-6 overflow-y-auto">
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="p-6 border-t border-border-dark bg-surface-darker">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
