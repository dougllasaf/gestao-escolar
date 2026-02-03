'use client'

interface CardProps {
    children: React.ReactNode
    className?: string
    title?: string
    action?: React.ReactNode
}

export function Card({ children, className = '', title, action }: CardProps) {
    return (
        <div className={`bg-white rounded-xl border border-gray-100 shadow-sm ${className}`}>
            {(title || action) && (
                <div className="px-6 py-4 border-b border-gray-50 flex justify-between items-center">
                    {title && <h3 className="font-semibold text-lg text-gray-800">{title}</h3>}
                    {action && <div>{action}</div>}
                </div>
            )}
            <div className="p-6">
                {children}
            </div>
        </div>
    )
}
