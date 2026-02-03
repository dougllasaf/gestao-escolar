'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { Shield, Building, UserPlus, Trash, Mail, MapPin, Search } from 'lucide-react'
import { UserMenu } from './ui/UserMenu'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Input, Select } from './ui/Forms'

export default function SuperAdminPanel() {
    const { user } = useAuth()
    const [activeTab, setActiveTab] = useState('cities') // 'cities' | 'admins'
    const [cities, setCities] = useState<any[]>([])
    const [admins, setAdmins] = useState<any[]>([])

    // Search State
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'city' | 'admin', id: string, name: string } | null>(null)

    // Form State
    const [newCity, setNewCity] = useState({ name: '', state: '' })
    const [newAdmin, setNewAdmin] = useState({ email: '', password: '', fullName: '', cityId: '' })
    const [message, setMessage] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        fetchCities()
        fetchAdmins()
    }, [])

    const fetchCities = async () => {
        const { data } = await supabase.from('cities').select('*').order('name')
        if (data) setCities(data)
    }

    const fetchAdmins = async () => {
        const { data } = await supabase.from('user_profiles').select('*, cities(name)').eq('role', 'city_admin')
        if (data) setAdmins(data)
    }

    const executeDelete = async () => {
        if (!deleteModal) return
        setLoading(true)
        const { type, id } = deleteModal

        try {
            if (type === 'city') {
                const { error } = await supabase.from('cities').delete().eq('id', id)
                if (error) throw error
                fetchCities(); fetchAdmins()
            } else {
                const res = await fetch('/api/admin/delete-user', {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: id })
                })
                if (!res.ok) throw new Error((await res.json()).error)
                fetchAdmins()
            }
            setMessage(`${type === 'city' ? 'Cidade' : 'Admin'} excluído com sucesso.`)
        } catch (err: any) { setMessage('Erro: ' + err.message) }
        finally { setLoading(false); setDeleteModal(null) }
    }


    const handleCreateCity = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const { error } = await supabase.from('cities').insert(newCity as any)
            if (error) throw error
            setMessage('Cidade criada com sucesso!')
            setNewCity({ name: '', state: '' })
            fetchCities()
        } catch (err: any) { setMessage('Erro: ' + err.message) }
        finally { setLoading(false) }
    }

    const handleCreateCityAdmin = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newAdmin.email, password: newAdmin.password, full_name: newAdmin.fullName,
                    role: 'city_admin', city_id: newAdmin.cityId
                })
            })
            if (!res.ok) throw new Error((await res.json()).error)
            setMessage('Administrador criado com sucesso!')
            setNewAdmin({ email: '', password: '', fullName: '', cityId: '' })
            fetchAdmins()
        } catch (err: any) { setMessage('Erro: ' + err.message) }
        finally { setLoading(false) }
    }

    // Filters
    const filteredCities = cities.filter(c =>
        (c.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.state || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredAdmins = admins.filter(a =>
        (a.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (a.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    return (
        <div className="min-h-screen bg-gray-50/50 pb-20">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="bg-indigo-600 p-2 rounded-lg text-white">
                            <Shield size={20} />
                        </div>
                        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Painel Super Admin</h1>
                    </div>
                    <UserMenu />
                </div>
            </header>

            <main className="max-w-6xl mx-auto px-4 py-8">

                <div className="flex gap-2 mb-8 border-b border-gray-200">
                    <button onClick={() => { setActiveTab('cities'); setSearchTerm('') }} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'cities' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <Building size={16} /> Cidades
                    </button>
                    <button onClick={() => { setActiveTab('admins'); setSearchTerm('') }} className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'admins' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                        <UserPlus size={16} /> Admins
                    </button>
                </div>

                {message && <div className={`mb-6 p-4 rounded-lg text-sm font-medium ${message.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>{message}</div>}

                <div className="grid md:grid-cols-3 gap-8">

                    {/* --- CITIES TAB --- */}
                    {activeTab === 'cities' && (
                        <>
                            <div className="md:col-span-2 space-y-4 order-last md:order-first">
                                <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                                    <h2 className="text-lg font-semibold text-gray-800">Cidades Cadastradas</h2>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <Input placeholder="Buscar cidade..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {filteredCities.map(c => (
                                        <Card key={c.id} className="flex justify-between items-center hover:shadow-md transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="bg-blue-100 p-2.5 rounded-full text-blue-600"><Building size={20} /></div>
                                                <div>
                                                    <h3 className="font-bold text-gray-900">{c.name}</h3>
                                                    <p className="text-xs text-gray-500 font-medium bg-gray-100 px-2 py-0.5 rounded w-fit mt-1">{c.state}</p>
                                                </div>
                                            </div>
                                            <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: true, type: 'city', id: c.id, name: c.name })} className="text-gray-300 hover:text-red-500"><Trash size={18} /></Button>
                                        </Card>
                                    ))}
                                    {filteredCities.length === 0 && <div className="text-center p-8 text-gray-400 border border-dashed rounded-lg">Nenhuma cidade encontrada.</div>}
                                </div>
                            </div>
                            <div className="order-first md:order-last">
                                <Card title="Adicionar Cidade" className="sticky top-24">
                                    <form onSubmit={handleCreateCity} className="space-y-4">
                                        <Input label="Nome da Cidade" value={newCity.name} onChange={e => setNewCity({ ...newCity, name: e.target.value })} required />
                                        <Input label="Sigla do Estado" value={newCity.state} onChange={e => setNewCity({ ...newCity, state: e.target.value })} required placeholder="Exemplo: SP" />
                                        <Button type="submit" isLoading={loading} className="w-full">Criar Cidade</Button>
                                    </form>
                                </Card>
                            </div>
                        </>
                    )}

                    {/* --- ADMINS TAB --- */}
                    {activeTab === 'admins' && (
                        <>
                            <div className="md:col-span-2 space-y-4 order-last md:order-first">
                                <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                                    <h2 className="text-lg font-semibold text-gray-800">Administradores Municipais</h2>
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                        <Input placeholder="Buscar admin..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    {filteredAdmins.map(a => (
                                        <Card key={a.id} className="hover:shadow-md transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="flex items-start gap-4">
                                                    <div className="bg-indigo-100 p-2.5 rounded-full text-indigo-600 mt-1"><Shield size={20} /></div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{a.full_name}</h3>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                                                            <Mail size={12} /> {a.email}
                                                        </div>
                                                        <div className="mt-2 text-xs font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded w-fit flex items-center gap-1">
                                                            <MapPin size={10} /> {a.cities?.name || 'Sem Cidade'}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: true, type: 'admin', id: a.id, name: a.full_name })} className="text-gray-300 hover:text-red-500"><Trash size={18} /></Button>
                                            </div>
                                        </Card>
                                    ))}
                                    {filteredAdmins.length === 0 && <div className="text-center p-8 text-gray-400 border border-dashed rounded-lg">Nenhum administrador encontrado.</div>}
                                </div>
                            </div>
                            <div className="order-first md:order-last">
                                <Card title="Criar Administrador" className="sticky top-24 border-indigo-100 shadow-indigo-50/50">
                                    <form onSubmit={handleCreateCityAdmin} className="space-y-4">
                                        <Select label="Atribuir à Cidade" value={newAdmin.cityId} onChange={e => setNewAdmin({ ...newAdmin, cityId: e.target.value })} required>
                                            <option value="">Selecione a Cidade...</option>
                                            {cities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                        </Select>
                                        <Input label="Nome Completo" value={newAdmin.fullName} onChange={e => setNewAdmin({ ...newAdmin, fullName: e.target.value })} required />
                                        <Input label="E-mail" type="email" value={newAdmin.email} onChange={e => setNewAdmin({ ...newAdmin, email: e.target.value })} required />
                                        <Input label="Senha" type="password" value={newAdmin.password} onChange={e => setNewAdmin({ ...newAdmin, password: e.target.value })} required />
                                        <Button type="submit" isLoading={loading} className="w-full bg-indigo-600 hover:bg-indigo-700">Criar Admin</Button>
                                    </form>
                                </Card>
                            </div>
                        </>
                    )}
                </div>
            </main>

            <Modal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                title={`Excluir ${deleteModal?.type === 'city' ? 'Cidade' : 'Administrador'}`}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteModal(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={executeDelete} isLoading={loading}>Confirmar Exclusão</Button>
                    </>
                }
            >
                <div className="py-4 text-center">
                    <p className="text-gray-600 mb-2">Tem certeza que deseja excluir <span className="font-bold text-gray-900">{deleteModal?.name}</span>?</p>
                    {deleteModal?.type === 'city' && (
                        <p className="text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                            Atenção: Isso excluirá permanentemente TODOS os dados desta cidade (Escolas, Rotas, Usuários, Alunos). Essa ação não pode ser desfeita.
                        </p>
                    )}
                </div>
            </Modal>
        </div>
    )
}
