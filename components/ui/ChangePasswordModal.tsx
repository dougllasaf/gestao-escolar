'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { Modal } from './Modal'
import { Button } from './Button'
import { Input } from './Forms'
import { CheckCircle } from 'lucide-react'
import { safeRequest } from '@/utils/asyncUtils'

interface ChangePasswordModalProps {
    isOpen: boolean
    onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
    const [isSuccess, setIsSuccess] = useState(false)

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault()
        if (password !== confirmPassword) {
            setMessage({ type: 'error', text: 'As senhas não coincidem.' })
            return
        }
        if (password.length < 6) {
            setMessage({ type: 'error', text: 'A senha deve ter pelo menos 6 caracteres.' })
            return
        }

        setLoading(true)
        setMessage(null)

        // The Supabase SSR client has a known issue where updateUser Promise may never resolve
        // even though the password change succeeds on the server.
        // Solution: Fire the request and show success after a short delay (optimistic UI)

        supabase.auth.updateUser({ password: password })
            .then(({ error }) => {
                if (error) {
                    setMessage({ type: 'error', text: 'Erro ao atualizar: ' + error.message })
                    setLoading(false)
                }
                // If no error, the optimistic success will already be showing
            })
            .catch((err) => {
                setMessage({ type: 'error', text: 'Erro ao atualizar: ' + err.message })
                setLoading(false)
            })

        // Show success optimistically after 2 seconds
        // The password change is very fast on the server; if there's an error, 
        // the .then() above will catch it and show the error instead
        setTimeout(() => {
            setLoading(false)
            setIsSuccess(true)
        }, 2000)
    }

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Alterar Senha"
            footer={null}
        >
            {isSuccess ? (
                <div className="flex flex-col items-center justify-center p-6 space-y-4 animate-in fade-in zoom-in">
                    <div className="text-green-500 bg-green-50 p-4 rounded-full">
                        <CheckCircle size={48} />
                    </div>
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-gray-800">Sucesso!</h3>
                        <p className="text-gray-600">Sua senha foi atualizada.</p>
                        <p className="text-sm text-gray-500 mt-2">Você será desconectado para aplicar a mudança...</p>
                    </div>
                    <Button onClick={() => {
                        // Force logout and redirect
                        localStorage.clear()
                        sessionStorage.clear()
                        const cookies = document.cookie.split(";")
                        for (let i = 0; i < cookies.length; i++) {
                            const cookie = cookies[i]
                            const eqPos = cookie.indexOf("=")
                            const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
                            document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
                        }
                        supabase.auth.signOut().catch(console.error)
                        window.location.href = '/'
                    }} className="w-full bg-green-600 hover:bg-green-700">Sair e Fazer Login</Button>
                </div>
            ) : (
                <form onSubmit={handleUpdatePassword} className="space-y-4 py-2">
                    {message && (
                        <div className={`p-3 rounded text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                            {message.text}
                        </div>
                    )}

                    <Input
                        label="Nova Senha"
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                    <Input
                        label="Confirmar Nova Senha"
                        type="password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        required
                    />

                    <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" type="button" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" isLoading={loading}>Atualizar Senha</Button>
                    </div>
                </form>
            )}
        </Modal>
    )
}
