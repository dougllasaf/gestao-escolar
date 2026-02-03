'use client'

import { useAuth } from '@/context/AuthContext'
import SuperAdminPanel from '@/components/SuperAdminPanel'
import CityAdminPanel from '@/components/CityAdminPanel'
import MonitorPanel from '@/components/MonitorPanel'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'

const AccessDenied = () => {
  useEffect(() => {
    const timer = setTimeout(() => {
      // Clear Local Storage & Session Storage
      localStorage.clear()
      sessionStorage.clear()

      // Clear Cookies (Crucial for @supabase/ssr)
      const cookies = document.cookie.split(";")
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i]
        const eqPos = cookie.indexOf("=")
        const name = eqPos > -1 ? cookie.substr(0, eqPos) : cookie
        document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/"
      }

      // Try to sign out
      supabase.auth.signOut().catch(console.error)

      // Force redirect
      window.location.href = '/'
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-screen flex flex-col items-center justify-center text-center p-4">
      <h1 className="text-xl font-bold text-red-600 mb-2">Acesso Negado</h1>
      <p className="mb-2">Seu perfil não tem permissão para acessar este painel.</p>
      <p className="text-sm text-gray-500 mb-4">Você será desconectado automaticamente em 3 segundos...</p>
      <button
        onClick={() => {
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
        }}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
      >
        Sair Agora
      </button>
    </div>
  )
}

const VerifyingPermissions = () => {
  useEffect(() => {
    // If stuck here for more than 5 seconds, force logout and redirect
    const timer = setTimeout(() => {
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
    }, 5000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className="h-screen flex flex-col items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
      <p className="text-gray-600">Verificando permissões...</p>
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
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h1 className="text-2xl font-bold mb-6 text-center text-blue-900">Gestão Transporte Escolar</h1>

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
