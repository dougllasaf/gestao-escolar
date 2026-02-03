'use client'

import { useState } from 'react'
import { Menu, X, LogOut, Key } from 'lucide-react'
import { Button } from './Button'
import { ChangePasswordModal } from './ChangePasswordModal'
import { supabase } from '@/lib/supabaseClient'

export function UserMenu() {
    const [isOpen, setIsOpen] = useState(false)
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false)

    const handleLogout = async () => {
        // Force clear strict Local Storage/Session to prevent stuck sessions
        localStorage.clear()
        sessionStorage.clear()

        await supabase.auth.signOut()
        window.location.href = '/'
    }

    return (
        <>
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-2">
                <Button
                    variant="ghost"
                    onClick={() => setIsPasswordModalOpen(true)}
                    className="text-gray-600 hover:text-blue-600 hover:bg-blue-50"
                    icon={<Key size={16} />}
                >
                    Alterar Senha
                </Button>
                <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="text-red-500 hover:text-red-600 hover:bg-red-50"
                    icon={<LogOut size={16} />}
                >
                    Sair
                </Button>
            </div>

            {/* Mobile Burger Menu */}
            <div className="md:hidden relative">
                <Button
                    variant="ghost"
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </Button>

                {isOpen && (
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-2 origin-top-right">
                        <button
                            onClick={() => { setIsPasswordModalOpen(true); setIsOpen(false) }}
                            className="w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                            <Key size={16} className="text-gray-400" />
                            Alterar Senha
                        </button>
                        <div className="h-px bg-gray-100 my-1" />
                        <button
                            onClick={handleLogout}
                            className="w-full text-left px-4 py-3 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </div>
                )}
            </div>

            {/* Backdrop for closing mobile menu */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-40 md:hidden bg-transparent"
                    onClick={() => setIsOpen(false)}
                />
            )}

            <ChangePasswordModal
                isOpen={isPasswordModalOpen}
                onClose={() => setIsPasswordModalOpen(false)}
            />
        </>
    )
}
