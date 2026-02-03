'use client'

import { Loader2 } from 'lucide-react'
import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline'
    isLoading?: boolean
    icon?: React.ReactNode
}

export function Button({
    children,
    variant = 'primary',
    isLoading = false,
    icon,
    className = '',
    disabled,
    ...props
}: ButtonProps) {

    const baseCurrent = "flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 text-sm focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed"

    const variants = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20 focus:ring-blue-500",
        secondary: "bg-gray-800 hover:bg-gray-900 text-white shadow-md shadow-gray-500/20 focus:ring-gray-800",
        danger: "bg-red-500 hover:bg-red-600 text-white shadow-md shadow-red-500/20 focus:ring-red-500",
        outline: "border-2 border-gray-200 text-gray-700 hover:border-blue-500 hover:text-blue-600 bg-white",
        ghost: "text-gray-500 hover:text-gray-800 hover:bg-gray-100 bg-transparent"
    }

    return (
        <button
            className={`${baseCurrent} ${variants[variant]} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {!isLoading && icon && <span>{icon}</span>}
            {children}
        </button>
    )
}
