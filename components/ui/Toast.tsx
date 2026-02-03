'use client'

import { useEffect } from 'react'
import { CheckCircle, XCircle, X, AlertCircle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
    message: string
    type?: ToastType
    onClose: () => void
    duration?: number
}

export const Toast = ({ message, type = 'success', onClose, duration = 3000 }: ToastProps) => {
    useEffect(() => {
        const timer = setTimeout(onClose, duration)
        return () => clearTimeout(timer)
    }, [duration, onClose])

    const styles = {
        success: {
            bg: 'bg-green-50 border-green-200',
            text: 'text-green-800',
            icon: <CheckCircle className="w-5 h-5 text-green-500" />
        },
        error: {
            bg: 'bg-red-50 border-red-200',
            text: 'text-red-800',
            icon: <XCircle className="w-5 h-5 text-red-500" />
        },
        info: {
            bg: 'bg-blue-50 border-blue-200',
            text: 'text-blue-800',
            icon: <AlertCircle className="w-5 h-5 text-blue-500" />
        }
    }

    const style = styles[type]

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
            <div
                className={`pointer-events-auto ${style.bg} border rounded-xl shadow-2xl px-6 py-4 max-w-sm w-full flex items-center gap-3 animate-fade-in`}
                role="alert"
            >
                {style.icon}
                <p className={`flex-1 ${style.text} font-medium text-sm`}>{message}</p>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
