'use client'

import { useAuth } from '@/context/AuthContext'
import SuperAdminPanel from '@/components/SuperAdminPanel'
import CityAdminPanel from '@/components/CityAdminPanel'
import MonitorPanel from '@/components/MonitorPanel'
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function Home() {
  const { session, role, loading } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorObj, setErrorObj] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorObj(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setErrorObj(error.message === 'Invalid login credentials' ? 'E-mail ou senha incorretos' : error.message)
    }
  }

  if (loading) return <div className="h-screen flex items-center justify-center">Carregando plataforma...</div>

  if (!session) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">Transporte Escolar</h1>

          {errorObj && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded text-sm text-center">
              {errorObj}
            </div>
          )}

          <input
            className="w-full mb-3 p-2 border rounded"
            placeholder="E-mail"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />
          <input
            type="password"
            className="w-full mb-6 p-2 border rounded"
            placeholder="Senha"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <button className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">
            Entrar
          </button>
          <p className="mt-4 text-xs text-center text-gray-500">
            Acesso Restrito. Contate seu administrador.
          </p>
        </form>
      </div>
    )
  }

  // Role-based Routing
  switch (role) {
    case 'super_admin':
      return <SuperAdminPanel />
    case 'city_admin':
      return <CityAdminPanel />
    case 'monitor':
      return <MonitorPanel />
    default:
      return (
        <div className="h-screen flex flex-col items-center justify-center">
          <h1 className="text-xl font-bold text-red-600">Acesso Negado</h1>
          <p>Seu perfil ({role || 'nenhum'}) não tem permissão para acessar este painel.</p>
          <button onClick={() => supabase.auth.signOut()} className="mt-4 underline">Sair</button>
        </div>
      )
  }
}
