import { useState, useEffect } from 'react'

export default function Toast({ message, icon = 'check_circle', type = 'success', onClose }) {
    const [visible, setVisible] = useState(true)

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false)
            setTimeout(onClose, 300)
        }, 3000)
        return () => clearTimeout(timer)
    }, [onClose])

    const colors = {
        success: 'bg-primary/10 border-primary/30 text-primary',
        error: 'bg-red-500/10 border-red-500/30 text-red-400',
        info: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
    }

    return (
        <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-3 rounded-xl border shadow-xl backdrop-blur-sm transition-all duration-300 ${colors[type]} ${visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'}`}>
            <span className="material-symbols-outlined text-[20px]">{icon}</span>
            <span className="text-sm font-medium text-white">{message}</span>
            <button onClick={() => { setVisible(false); setTimeout(onClose, 300) }} className="ml-2 text-text-secondary hover:text-white transition-colors">
                <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
        </div>
    )
}
