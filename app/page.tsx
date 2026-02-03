'use client'

import { useAuth } from '@/context/AuthContext'
import SuperAdminPanel from '@/components/SuperAdminPanel'
import CityAdminPanel from '@/components/CityAdminPanel'
import MonitorPanel from '@/components/MonitorPanel'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AccessDenied = () => {
  const handleLogout = () => {
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
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h1>
      <p className="mb-4">Seu perfil não tem permissão para acessar este painel.</p>
      <button
        onClick={handleLogout}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Sair e Fazer Login
      </button>
    </div>
  )
}

const VerifyingPermissions = () => {
  // NO auto-logout timer - just show loading, let the user stay logged in
  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Verificando permissões...</p>
      <p className="text-xs text-gray-400 mt-2">Aguarde um momento...</p>
    </div>
  )
}

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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-blue-700 to-blue-900 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          {/* Header with Bus Logo */}
          <div className="bg-gradient-to-r from-yellow-400 to-yellow-500 px-8 py-6 text-center">
            <img
              src="/bus-icon.svg"
              alt="Logo Ônibus Escolar"
              className="w-20 h-20 mx-auto mb-3 drop-shadow-lg"
            />
            <h1 className="text-2xl font-bold text-gray-800">Gestão Transporte Escolar</h1>
            <p className="text-sm text-gray-700 mt-1">Sistema Municipal de Transporte</p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="p-8">
            {errorObj && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm text-center flex items-center justify-center gap-2">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errorObj}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="seu@email.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <input
                type="password"
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 text-white p-3 rounded-lg hover:bg-blue-700 transition-all font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Entrar no Sistema
            </button>

            <p className="mt-6 text-xs text-center text-gray-500">
              🔒 Acesso Restrito • Contate seu administrador
            </p>
          </form>
        </div>
      </div>
    )
  }

  // Role-based Routing
  // Use cached role as fallback to avoid showing "Verificando" during normal navigation
  const cachedRole = typeof window !== 'undefined' ? localStorage.getItem('cached_role') : null
  const effectiveRole = role || cachedRole // Trust cache if context role is null

  // Only show VerifyingPermissions if we have session but NO role AND NO cached role
  if (session && !effectiveRole) {
    return <VerifyingPermissions />
  }

  switch (effectiveRole) {
    case 'super_admin':
      return <SuperAdminPanel />
    case 'city_admin':
      return <CityAdminPanel />
    case 'monitor':
      return <MonitorPanel />
    default:
      // Only show AccessDenied if we have a session AND no valid role
      return <AccessDenied />
  }
}
