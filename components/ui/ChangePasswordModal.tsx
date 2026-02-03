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

        try {
            const { error } = await safeRequest<any>(
                supabase.auth.updateUser({ password: password }),
                30000,
                'O servidor demorou muito para responder. Verifique sua conexão.'
            )
            if (error) throw error
            setLoading(false)
            setIsSuccess(true)
        } catch (err: any) {
            setMessage({ type: 'error', text: 'Erro ao atualizar: ' + err.message })
            setLoading(false)
        }
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
                        <p className="text-gray-600">Sua senha foi atualizada com sucesso.</p>
                    </div>
                    <Button onClick={() => {
                        onClose()
                        setIsSuccess(false)
                        setPassword('')
                        setConfirmPassword('')
                    }} className="w-full bg-green-600 hover:bg-green-700">Fechar</Button>
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
