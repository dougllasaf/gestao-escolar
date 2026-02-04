'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { Plus, Users, Map, School, LogOut, Trash, ArrowLeft, Bus, AlertCircle, FileText, Upload, User, Search, GraduationCap, Filter, Calendar, Edit, CheckCircle, X, MapPin } from 'lucide-react'
import { safeRequest } from '@/utils/asyncUtils'
import { UserMenu } from './ui/UserMenu'

import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Input, Select } from './ui/Forms'
import { Toast } from './ui/Toast'

export default function CityAdminPanel() {
    const { user } = useAuth()
    const currentYear = new Date().getFullYear()

    const [activeTab, setActiveTab] = useState('routes')
    const [selectedYear, setSelectedYear] = useState<number>(currentYear) // New Year State

    const [schools, setSchools] = useState<any[]>([])
    const [routes, setRoutes] = useState<any[]>([])
    const [monitors, setMonitors] = useState<any[]>([])
    const [allStudents, setAllStudents] = useState<any[]>([])

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('')
    const [filterRouteId, setFilterRouteId] = useState('')
    const [filterSchoolId, setFilterSchoolId] = useState('')

    // Route Detail State
    const [selectedRoute, setSelectedRoute] = useState<any>(null)
    const [routeStudents, setRouteStudents] = useState<any[]>([])

    // Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, type: 'route' | 'school' | 'monitor' | 'student', id: string, name: string } | null>(null)
    const [editStudentModal, setEditStudentModal] = useState<{ isOpen: boolean, student: any } | null>(null)
    const [editRouteModal, setEditRouteModal] = useState<{ isOpen: boolean, route: any } | null>(null)
    const [editSchoolModal, setEditSchoolModal] = useState<{ isOpen: boolean, school: any } | null>(null)
    const [editMonitorModal, setEditMonitorModal] = useState<{ isOpen: boolean, monitor: any } | null>(null)
    const [editMedicalFile, setEditMedicalFile] = useState<File | null>(null)
    const [missingFileModal, setMissingFileModal] = useState(false)

    // Form State
    const [newMonitor, setNewMonitor] = useState({ fullName: '', email: '', password: '', routeId: '' })
    const [newSchool, setNewSchool] = useState({ name: '' })

    // Enhanced Route Form State
    const [newRoute, setNewRoute] = useState({
        number: '',
        driver: '',
        vehicleType: 'Micro',
        plate: '',
        maxCapacity: ''
    })
    const [vehicleFile, setVehicleFile] = useState<File | null>(null)
    const [driverFile, setDriverFile] = useState<File | null>(null)

    // Enhanced Student Form State
    const [newStudent, setNewStudent] = useState({
        fullName: '',
        dob: '',
        guardianName: '',
        guardianPhone: '',
        address: '',
        shift: '',
        grade: '',
        schoolId: '',
        hasSpecialCondition: false,
        specialConditionDetails: '',
    })
    const [medicalReportFile, setMedicalReportFile] = useState<File | null>(null)

    const [loading, setLoading] = useState(false)
    const [initialDataLoaded, setInitialDataLoaded] = useState(false) // For instant F5 UX
    const [message, setMessage] = useState('')

    // Import Modal State
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [previousYearStudents, setPreviousYearStudents] = useState<any[]>([])
    const [selectedStudentsToImport, setSelectedStudentsToImport] = useState<string[]>([])
    const [importSearchTerm, setImportSearchTerm] = useState('')


    // Fetch Data
    useEffect(() => {
        if (user) {
            fetchRoutes()
            fetchMonitors()
            fetchSchools()
            // Re-fetch students when year changes
            fetchAllStudents(selectedYear)
        }
    }, [user, selectedYear])

    // Re-fetch detailed route students if a route is selected and year changes
    useEffect(() => {
        if (selectedRoute) {
            fetchRouteStudents(selectedRoute.id, selectedYear)
        }
    }, [selectedYear])

    const fetchRoutes = async () => {
        const { data } = await supabase.from('routes').select('*').order('route_number')
        if (data) setRoutes(data)
        setInitialDataLoaded(true) // Mark initial load complete
    }

    const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('*').order('name')
        if (data) setSchools(data)
    }

    const fetchMonitors = async () => {
        const { data } = await supabase.from('user_profiles').select('*').eq('role', 'monitor')
        if (data) setMonitors(data)
    }

    const fetchAllStudents = async (year: number) => {
        // Filter by school_year
        const { data } = await supabase.from('students')
            .select('*, schools(name), routes(route_number), user_profiles!students_created_by_fkey(full_name)')
            .eq('school_year', year)
            .order('full_name')

        if (data) setAllStudents(data)
    }

    const fetchRouteStudents = async (routeId: string, year: number) => {
        // Filter by school_year
        const { data } = await supabase.from('students')
            .select('*, schools(name), user_profiles!students_created_by_fkey(full_name)')
            .eq('route_id', routeId)
            .eq('school_year', year)

        if (data) setRouteStudents(data)
    }

    const getCityId = async () => {
        const { data: profile } = await supabase.from('user_profiles').select('city_id').eq('id', user!.id).single() as any
        if (!profile?.city_id) throw new Error('City ID not found for admin')
        return profile.city_id
    }

    // --- Actions ---

    const executeDelete = async () => {
        if (!deleteModal) return
        setLoading(true)
        const { type, id } = deleteModal

        try {
            if (type === 'monitor') {
                const res = await fetch('/api/admin/delete-user', {
                    method: 'DELETE',
                    body: JSON.stringify({ userId: id })
                })
                if (!res.ok) throw new Error('Falha ao excluir monitor')
                fetchMonitors()
            } else if (type === 'route') {
                const { error } = await supabase.from('routes').delete().eq('id', id)
                if (error) throw error
                fetchRoutes()
            } else if (type === 'school') {
                const { error } = await supabase.from('schools').delete().eq('id', id)
                if (error) throw error
                fetchSchools()
            } else if (type === 'student') {
                const { error } = await supabase.from('students').delete().eq('id', id)
                if (error) throw error
                if (selectedRoute) fetchRouteStudents(selectedRoute.id, selectedYear)
                fetchAllStudents(selectedYear)
            }
            setMessage(`${type === 'route' ? 'Rota' : type === 'school' ? 'Escola' : type === 'monitor' ? 'Monitor' : 'Aluno'} excluído(a) com sucesso.`)
        } catch (err: any) {
            setMessage('Erro: ' + err.message)
        } finally {
            setLoading(false)
            setDeleteModal(null)
        }
    }

    // --- Creation Handlers ---

    const handleCreateRoute = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const cityId = await getCityId()
            let vehicleDocUrl = null
            let driverDocUrl = null

            if (vehicleFile) {
                const fileExt = vehicleFile.name.split('.').pop()
                const fileName = `vehicle-${Date.now()}.${fileExt}`
                const { error: upErr } = await safeRequest<any>(
                    supabase.storage.from('route-documents').upload(fileName, vehicleFile),
                    15000, 'Upload do documento do veículo demorou muito.'
                )
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage.from('route-documents').getPublicUrl(fileName)
                vehicleDocUrl = publicUrl
            }

            if (driverFile) {
                const fileExt = driverFile.name.split('.').pop()
                const fileName = `driver-${Date.now()}.${fileExt}`
                const { error: upErr } = await safeRequest<any>(
                    supabase.storage.from('route-documents').upload(fileName, driverFile),
                    15000, 'Upload do documento do motorista demorou muito.'
                )
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage.from('route-documents').getPublicUrl(fileName)
                driverDocUrl = publicUrl
            }

            const { error } = await safeRequest<any>(supabase.from('routes').insert({
                route_number: newRoute.number,
                driver_name: newRoute.driver,
                vehicle_type: newRoute.vehicleType,
                vehicle_plate: newRoute.plate,
                max_capacity: newRoute.maxCapacity ? parseInt(newRoute.maxCapacity) : null,
                vehicle_document_url: vehicleDocUrl, driver_document_url: driverDocUrl,
                city_id: cityId
            } as any), 30000)

            if (error) throw error
            setMessage('Rota criada com sucesso!')
            setNewRoute({ number: '', driver: '', vehicleType: 'Micro', plate: '', maxCapacity: '' })
            setVehicleFile(null); setDriverFile(null)
            fetchRoutes()
        } catch (err: any) { setMessage(err.message) } finally { setLoading(false) }
    }

    const handleCreateSchool = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const cityId = await getCityId()
            const { error } = await safeRequest<any>(supabase.from('schools').insert({ name: newSchool.name, city_id: cityId } as any), 30000)

            if (error) throw error
            setMessage('Escola criada com sucesso!')
            setNewSchool({ name: '' })
            fetchSchools()
        } catch (err: any) { setMessage(err.message) } finally { setLoading(false) }
    }

    const handleCreateMonitor = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const cityId = await getCityId()
            const res = await fetch('/api/admin/create-user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: newMonitor.email,
                    password: newMonitor.password,
                    full_name: newMonitor.fullName,
                    role: 'monitor',
                    city_id: cityId,
                    route_id: newMonitor.routeId
                })
            })
            const data = await res.json().catch(() => ({ error: 'Erro inesperado no servidor' }))
            if (!res.ok) throw new Error(data.error || 'Erro ao criar monitor')
            setMessage('Monitor criado com sucesso!')
            setNewMonitor({ fullName: '', email: '', password: '', routeId: '' })
            fetchMonitors()
        } catch (err: any) { setMessage(err.message) } finally { setLoading(false) }
    }

    const handleAddStudentToRoute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRoute) return
        setLoading(true)
        try {
            let reportUrl = null

            // Mandatory Validation
            if (newStudent.hasSpecialCondition && !medicalReportFile) {
                setMissingFileModal(true)
                setLoading(false)
                return
            }

            if (newStudent.hasSpecialCondition && medicalReportFile) {
                const fileExt = medicalReportFile.name.split('.').pop()
                const fileName = `medical-${Date.now()}.${fileExt}`
                const { error: upErr } = await safeRequest<any>(
                    supabase.storage.from('student-documents').upload(fileName, medicalReportFile),
                    15000, 'Upload demorou muito.'
                )
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(fileName)
                reportUrl = publicUrl
            }

            const { error } = await safeRequest<any>(supabase.from('students').insert({
                full_name: newStudent.fullName,
                date_of_birth: newStudent.dob,
                guardian_name: newStudent.guardianName,
                guardian_phone: newStudent.guardianPhone,
                address: newStudent.address,
                shift: newStudent.shift,
                grade: newStudent.grade,
                school_id: newStudent.schoolId || null,
                has_special_condition: newStudent.hasSpecialCondition,
                special_condition_details: newStudent.specialConditionDetails,
                medical_report_url: reportUrl,
                route_id: selectedRoute.id,
                city_id: selectedRoute.city_id,
                school_year: selectedYear, // Insert with SELECTED YEAR
                created_by: user?.id
            } as any), 30000)

            if (error) throw error
            setMessage(`Aluno adicionado para o Ano Letivo ${selectedYear}!`)
            // Reset
            setNewStudent({ fullName: '', dob: '', guardianName: '', guardianPhone: '', address: '', shift: '', grade: '', schoolId: '', hasSpecialCondition: false, specialConditionDetails: '' })
            setMedicalReportFile(null)
            fetchRouteStudents(selectedRoute.id, selectedYear)
            fetchAllStudents(selectedYear)
        } catch (err: any) { setMessage(err.message) } finally { setLoading(false) }
    }


    const executeEditStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editStudentModal) return
        setLoading(true)

        try {
            const s = editStudentModal.student

            // Mandatory Validation
            if (s.has_special_condition && !s.medical_report_url && !editMedicalFile) {
                setMissingFileModal(true)
                setLoading(false)
                return
            }

            let reportUrl = s.medical_report_url

            if (editMedicalFile) {
                const fileExt = editMedicalFile.name.split('.').pop()
                const fileName = `medical-update-${Date.now()}.${fileExt}`
                const { error: upErr } = await safeRequest<any>(
                    supabase.storage.from('student-documents').upload(fileName, editMedicalFile),
                    15000, 'Upload demorou muito.'
                )
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(fileName)
                reportUrl = publicUrl
            }

            const { error } = await safeRequest<any>((supabase.from('students') as any).update({
                full_name: s.full_name,
                date_of_birth: s.date_of_birth,
                guardian_name: s.guardian_name,
                guardian_phone: s.guardian_phone,
                address: s.address,
                shift: s.shift,
                grade: s.grade,
                school_id: s.school_id,
                has_special_condition: s.has_special_condition,
                special_condition_details: s.special_condition_details,
                medical_report_url: reportUrl,
                route_id: s.route_id
            }).eq('id', s.id), 30000)

            if (error) throw error
            setMessage('Aluno atualizado com sucesso!')
            setEditStudentModal(null)
            fetchAllStudents(selectedYear)
            if (selectedRoute) fetchRouteStudents(selectedRoute.id, selectedYear)

        } catch (err: any) {
            setMessage('Erro ao atualizar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleBackToRoutes = () => {
        setSelectedRoute(null)
        setRouteStudents([])
        setMessage('')
    }

    // --- Edit Handlers for Routes, Schools, Monitors ---
    const executeEditRoute = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editRouteModal) return
        setLoading(true)

        try {
            const r = editRouteModal.route
            const { error } = await safeRequest<any>((supabase.from('routes') as any).update({
                route_number: r.route_number,
                driver_name: r.driver_name,
                vehicle_type: r.vehicle_type,
                vehicle_plate: r.vehicle_plate,
                max_capacity: r.max_capacity ? parseInt(r.max_capacity) : null
            }).eq('id', r.id), 30000)

            if (error) throw error
            setMessage('Rota atualizada com sucesso!')
            setEditRouteModal(null)
            fetchRoutes()
        } catch (err: any) {
            setMessage('Erro ao atualizar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const executeEditSchool = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editSchoolModal) return
        setLoading(true)

        try {
            const s = editSchoolModal.school
            const { error } = await safeRequest<any>((supabase.from('schools') as any).update({
                name: s.name
            }).eq('id', s.id), 30000)

            if (error) throw error
            setMessage('Escola atualizada com sucesso!')
            setEditSchoolModal(null)
            fetchSchools()
        } catch (err: any) {
            setMessage('Erro ao atualizar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const executeEditMonitor = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!editMonitorModal) return
        setLoading(true)

        try {
            const m = editMonitorModal.monitor
            const { error } = await safeRequest<any>((supabase.from('user_profiles') as any).update({
                full_name: m.full_name,
                assigned_route_id: m.assigned_route_id || null
            }).eq('id', m.id), 30000)

            if (error) throw error
            setMessage('Monitor atualizado com sucesso!')
            setEditMonitorModal(null)
            fetchMonitors()
        } catch (err: any) {
            setMessage('Erro ao atualizar: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    // --- Import Handlers ---

    const openImportModal = async () => {
        setLoading(true)
        try {
            const prevYear = selectedYear - 1
            const { data } = await supabase.from('students')
                .select('*, schools(name), routes(route_number)')
                .eq('school_year', prevYear)
                .order('full_name')

            if (data && data.length > 0) {
                setPreviousYearStudents(data)
                setImportSearchTerm('')
                setImportModalOpen(true)
            } else {
                setMessage(`Nenhum aluno encontrado no ano de ${prevYear} para importar.`)
            }
        } catch (err: any) {
            setMessage('Erro ao buscar alunos do ano anterior: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const handleImportStudents = async () => {
        if (selectedStudentsToImport.length === 0) return
        setLoading(true)
        try {
            const studentsToCopy = previousYearStudents.filter(s => selectedStudentsToImport.includes(s.id))

            const newRecords = studentsToCopy.map(s => ({
                full_name: s.full_name,
                date_of_birth: s.date_of_birth,
                guardian_name: s.guardian_name,
                guardian_phone: s.guardian_phone,
                address: s.address,
                shift: s.shift,
                grade: s.grade, // Ideally, we might want to promote the grade, but let's keep it simple or manual for now
                school_id: s.school_id,
                has_special_condition: s.has_special_condition,
                special_condition_details: s.special_condition_details,
                medical_report_url: s.medical_report_url,
                route_id: s.route_id, // Keep the same route assignment? Yes, usually.
                city_id: s.city_id,
                school_year: selectedYear // The NEW year
            }))

            const { error } = await supabase.from('students').insert(newRecords as any)

            if (error) throw error

            setMessage(`${newRecords.length} alunos importados com sucesso para ${selectedYear}!`)
            setImportModalOpen(false)
            setSelectedStudentsToImport([])
            fetchAllStudents() // Refresh current list
        } catch (err: any) {
            setMessage('Erro ao importar alunos: ' + err.message)
        } finally {
            setLoading(false)
        }
    }

    const toggleStudentImportSelection = (id: string) => {
        if (selectedStudentsToImport.includes(id)) {
            setSelectedStudentsToImport(selectedStudentsToImport.filter(sid => sid !== id))
        } else {
            setSelectedStudentsToImport([...selectedStudentsToImport, id])
        }
    }


    // --- Search Filters ---
    const filteredRoutes = routes.filter(r =>
        (r.route_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (r.driver_name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredMonitors = monitors.filter(m =>
        (m.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredSchools = schools.filter(s =>
        (s.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const filteredAllStudents = allStudents.filter(s => {
        const matchesSearch = (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (s.schools?.name || '').toLowerCase().includes(searchTerm.toLowerCase())

        const matchesRoute = filterRouteId ? s.route_id === filterRouteId : true
        const matchesSchool = filterSchoolId ? s.school_id === filterSchoolId : true

        return matchesSearch && matchesRoute && matchesSchool
    })


    // --- View Renderers ---

    return (
        <div className="min-h-screen bg-white pb-20">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <img src="/bus-icon.svg" alt="Ônibus" className="w-10 h-10" />
                            <h1 className="text-xl font-bold text-gray-900 tracking-tight hidden sm:block">Gestão Municipal</h1>
                        </div>

                        {/* Year Selector */}
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1">
                            <Calendar size={16} className="text-gray-500" />
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-transparent border-none text-sm font-semibold text-gray-700 focus:ring-0 cursor-pointer"
                            >
                                {Array.from({ length: 11 }, (_, i) => 2025 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <UserMenu />
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

                {/* Navigation Tabs (Only when not in Detail View) */}
                {!selectedRoute && (
                    <div className="flex gap-2 mb-8 border-b border-gray-200 overflow-x-auto pb-1">
                        {[
                            { id: 'routes', label: 'Rotas', icon: <Map size={16} /> },
                            { id: 'monitors', label: 'Monitores', icon: <Users size={16} /> },
                            { id: 'schools', label: 'Escolas', icon: <School size={16} /> },
                            { id: 'students', label: 'Alunos', icon: <GraduationCap size={16} /> }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => { setActiveTab(tab.id); setSearchTerm(''); setFilterRouteId(''); setFilterSchoolId('') }}
                                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                            >
                                {tab.icon} {tab.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Notifications */}
                {message && (
                    <Toast
                        message={message}
                        type={message.toLowerCase().includes('error') || message.toLowerCase().includes('erro') ? 'error' : 'success'}
                        onClose={() => setMessage('')}
                    />
                )}

                {/* ROUTES TAB */}
                {activeTab === 'routes' && !selectedRoute && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        {/* List - Desktop Order: 1, Mobile Order: 2 (Second) */}
                        <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
                            <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                                <h2 className="text-lg font-semibold text-gray-800">Rotas Ativas</h2>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input placeholder="Buscar rotas..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            {filteredRoutes.map(r => (
                                <Card key={r.id} className="hover:shadow-md transition-shadow cursor-pointer group" >
                                    <div className="flex justify-between items-start">
                                        <div onClick={() => { setSelectedRoute(r); fetchRouteStudents(r.id, selectedYear) }} className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{r.route_number}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-medium border border-blue-100">
                                                    {r.vehicle_type || 'Veículo'}
                                                </span>
                                            </div>
                                            <p className="text-gray-500 text-sm flex items-center gap-2">
                                                <User size={14} /> {r.driver_name}
                                                <span className="text-gray-300">|</span>
                                                <Bus size={14} /> {r.vehicle_plate || 'Sem Placa'}
                                            </p>
                                        </div>
                                        <div className="flex">
                                            <Button
                                                variant="ghost"
                                                onClick={(e) => { e.stopPropagation(); setEditRouteModal({ isOpen: true, route: { ...r } }) }}
                                                className="text-gray-400 hover:text-blue-600 p-2"
                                            >
                                                <Edit size={18} />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, type: 'route', id: r.id, name: r.route_number }) }}
                                                className="text-gray-400 hover:text-red-500 p-2"
                                            >
                                                <Trash size={18} />
                                            </Button>
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {!initialDataLoaded && (
                                <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                                    Carregando rotas...
                                </div>
                            )}
                            {initialDataLoaded && filteredRoutes.length === 0 && <div className="text-center py-10 text-gray-400 bg-white rounded-xl border border-dashed border-gray-200">Nenhuma rota encontrada.</div>}
                        </div>

                        {/* Create Form - Desktop Order: 2, Mobile Order: 1 (First) */}
                        <div className="space-y-6 order-first lg:order-last">
                            <Card title="Nova Rota" className="sticky top-24">
                                <form onSubmit={handleCreateRoute} className="space-y-4">
                                    <Input label="Número da Rota" placeholder="Ex: R-101" value={newRoute.number} onChange={e => setNewRoute({ ...newRoute, number: e.target.value })} required />

                                    <div className="grid grid-cols-2 gap-3">
                                        <Select label="Tipo" value={newRoute.vehicleType} onChange={e => setNewRoute({ ...newRoute, vehicleType: e.target.value })}>
                                            <option value="Micro">Micro-ônibus</option>
                                            <option value="Ônibus">Ônibus</option>
                                            <option value="Kombi">Kombi</option>
                                        </Select>
                                        <Input label="Placa" placeholder="ABC-1234" value={newRoute.plate} onChange={e => setNewRoute({ ...newRoute, plate: e.target.value })} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Input label="Doc Veículo (PDF/Img)" type="file" onChange={e => setVehicleFile(e.target.files ? e.target.files[0] : null)} className="text-xs" />
                                    </div>

                                    <div className="pt-2 border-t border-gray-100">
                                        <Input label="Nome Motorista" placeholder="João da Silva" value={newRoute.driver} onChange={e => setNewRoute({ ...newRoute, driver: e.target.value })} required />
                                    </div>

                                    <div className="space-y-2">
                                        <Input label="CNH Motorista (PDF/Img)" type="file" onChange={e => setDriverFile(e.target.files ? e.target.files[0] : null)} className="text-xs" />
                                    </div>

                                    <Input label="Capacidade Máxima" type="number" placeholder="Opcional" value={newRoute.maxCapacity} onChange={e => setNewRoute({ ...newRoute, maxCapacity: e.target.value })} />

                                    <Button type="submit" isLoading={loading} className="w-full mt-2">Criar Rota</Button>
                                </form>
                            </Card>
                        </div>
                    </div>
                )}

                {/* SINGLE ROUTE DETAIL VIEW */}
                {selectedRoute && (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <Button variant="ghost" onClick={handleBackToRoutes} icon={<ArrowLeft size={18} />} className="mb-6 pl-0 hover:bg-transparent hover:text-blue-600">
                            Voltar para Rotas
                        </Button>

                        <div className="bg-white rounded-xl border border-gray-200 p-8 mb-8 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                            <div>
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="text-4xl font-bold text-gray-900">{selectedRoute.route_number}</h1>
                                    <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1 rounded-full">{selectedRoute.vehicle_type}</span>
                                </div>
                                <div className="flex flex-wrap gap-6 text-gray-500 text-sm">
                                    <span className="flex items-center gap-2"><User size={16} /> {selectedRoute.driver_name}</span>
                                    <span className="flex items-center gap-2"><Bus size={16} /> {selectedRoute.vehicle_plate}</span>
                                    <span className="flex items-center gap-2">
                                        <FileText size={16} />
                                        Docs:
                                        {selectedRoute.vehicle_document_url ? <a href={selectedRoute.vehicle_document_url} target="_blank" className="text-blue-600 hover:underline mx-1">Veículo</a> : <span className="text-gray-400 mx-1">--</span>}
                                        /
                                        {selectedRoute.driver_document_url ? <a href={selectedRoute.driver_document_url} target="_blank" className="text-blue-600 hover:underline mx-1">Motorista</a> : <span className="text-gray-400 mx-1">--</span>}
                                    </span>
                                </div>
                            </div>
                            <div className="text-right bg-blue-50 px-6 py-4 rounded-xl border border-blue-100">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Total de Alunos ({selectedYear})</p>
                                <p className="text-3xl font-bold text-blue-700">{routeStudents.length} <span className="text-lg text-blue-300 font-normal">/ {selectedRoute.max_capacity || '∞'}</span></p>
                            </div>
                        </div>

                        <div className="grid lg:grid-cols-3 gap-8">
                            <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
                                <div className="flex justify-between items-center mb-2">
                                    <h3 className="text-lg font-bold text-gray-800">Lista de Alunos ({selectedYear})</h3>
                                </div>
                                <div className="space-y-3">
                                    {routeStudents.map(s => (
                                        <div key={s.id} className="bg-white p-4 rounded-lg border border-gray-100 shadow-sm flex justify-between items-center group hover:border-blue-200 transition-colors">
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <p className="font-bold text-gray-900">{s.full_name}</p>
                                                    {s.has_special_condition && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full border border-yellow-200">Cuidados Especiais</span>}
                                                </div>
                                                <div className="text-xs text-gray-500 mt-1 grid grid-cols-2 gap-x-6 gap-y-1">
                                                    <span>Escola: {s.schools?.name}</span>
                                                    <span>Turno: {s.shift === 'morning' ? 'Manhã' : s.shift === 'afternoon' ? 'Tarde' : s.shift === 'night' ? 'Noite' : 'Integral'}</span>
                                                    <span>Série: {s.grade}</span>
                                                    <span>Responsável: {s.guardian_name} ({s.guardian_phone})</span>
                                                </div>
                                                {s.has_special_condition && (
                                                    <div className="mt-3 text-xs bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 text-yellow-800 flex items-start gap-2">
                                                        <span className="font-bold whitespace-nowrap">⚠️ Info Médica:</span>
                                                        <div>
                                                            {s.special_condition_details}
                                                            {s.medical_report_url && <a href={s.medical_report_url} target="_blank" className="ml-2 underline text-yellow-900 font-semibold hover:text-yellow-700">Ver Laudo</a>}
                                                        </div>
                                                    </div>
                                                )}

                                            </div>
                                            <Button
                                                variant="ghost"
                                                onClick={() => setDeleteModal({ isOpen: true, type: 'student', id: s.id, name: s.full_name })}
                                                className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500"
                                            >
                                                <Trash size={18} />
                                            </Button>
                                        </div>
                                    ))}
                                    {routeStudents.length === 0 && <div className="p-8 text-center text-gray-400 bg-white rounded-lg border border-dashed">Nenhum aluno em {selectedYear}.</div>}
                                </div>
                            </div>

                            <div className="order-first lg:order-last">
                                <Card title={`Registrar Aluno (${selectedYear})`} className="sticky top-6">
                                    <form onSubmit={handleAddStudentToRoute} className="space-y-4">
                                        <Input label="Nome Completo" value={newStudent.fullName} onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })} required />
                                        <Input label="Data de Nascimento" type="date" value={newStudent.dob} onChange={e => setNewStudent({ ...newStudent, dob: e.target.value })} required />

                                        <div className="grid grid-cols-2 gap-3">
                                            <Input label="Responsável" value={newStudent.guardianName} onChange={e => setNewStudent({ ...newStudent, guardianName: e.target.value })} />
                                            <Input label="Telefone" value={newStudent.guardianPhone} onChange={e => setNewStudent({ ...newStudent, guardianPhone: e.target.value })} />
                                        </div>

                                        <Input label="Endereço" value={newStudent.address} onChange={e => setNewStudent({ ...newStudent, address: e.target.value })} />

                                        <div className="grid grid-cols-2 gap-3">
                                            <Select label="Turno" value={newStudent.shift} onChange={e => setNewStudent({ ...newStudent, shift: e.target.value })} required>
                                                <option value="">Selecione...</option>
                                                <option value="morning">Manhã</option>
                                                <option value="afternoon">Tarde</option>
                                                <option value="night">Noite</option>
                                                <option value="full_time">Integral</option>
                                            </Select>

                                            <Select label="Série" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}>
                                                <option value="">Selecione a Série...</option>
                                                <optgroup label="Pré-Escola">
                                                    <option value="1º Período da Pré-Escola">1º Período</option>
                                                    <option value="2º Período da Pré-Escola">2º Período</option>
                                                </optgroup>
                                                <optgroup label="Fundamental">
                                                    <option value="1º Ano do Ensino Fundamental">1º Ano</option>
                                                    <option value="2º Ano do Ensino Fundamental">2º Ano</option>
                                                    <option value="3º Ano do Ensino Fundamental">3º Ano</option>
                                                    <option value="4º Ano do Ensino Fundamental">4º Ano</option>
                                                    <option value="5º Ano do Ensino Fundamental">5º Ano</option>
                                                    <option value="6º Ano do Ensino Fundamental">6º Ano</option>
                                                    <option value="7º Ano do Ensino Fundamental">7º Ano</option>
                                                    <option value="8º Ano do Ensino Fundamental">8º Ano</option>
                                                    <option value="9º Ano do Ensino Fundamental">9º Ano</option>
                                                </optgroup>
                                                <optgroup label="Médio">
                                                    <option value="1º Ano do Ensino Médio">1º Ano Médio</option>
                                                    <option value="2º Ano do Ensino Médio">2º Ano Médio</option>
                                                    <option value="3º Ano do Ensino Médio">3º Ano Médio</option>
                                                </optgroup>
                                            </Select>
                                        </div>

                                        <Select label="Escola" value={newStudent.schoolId} onChange={e => setNewStudent({ ...newStudent, schoolId: e.target.value })}>
                                            <option value="">Selecione a Escola...</option>
                                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                        </Select>

                                        <div className="pt-2">
                                            <label className="flex items-center gap-2 cursor-pointer mb-2">
                                                <input type="checkbox" checked={newStudent.hasSpecialCondition} onChange={e => setNewStudent({ ...newStudent, hasSpecialCondition: e.target.checked })} className="rounded text-blue-600 focus:ring-blue-500" />
                                                <span className="text-sm font-semibold text-gray-700">Possui Condição Especial?</span>
                                            </label>

                                            {newStudent.hasSpecialCondition && (
                                                <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                                    <textarea
                                                        className="w-full p-2 text-sm border border-yellow-200 rounded focus:border-yellow-400 focus:outline-none"
                                                        placeholder="Descreva a condição..."
                                                        rows={2}
                                                        value={newStudent.specialConditionDetails}
                                                        onChange={e => setNewStudent({ ...newStudent, specialConditionDetails: e.target.value })}
                                                    />
                                                    <Input type="file" label="Laudo Médico (Obrigatório PDF/Foto)" className="bg-white" onChange={e => setMedicalReportFile(e.target.files ? e.target.files[0] : null)} />
                                                </div>
                                            )}
                                        </div>

                                        <Button type="submit" isLoading={loading} className="w-full bg-green-600 hover:bg-green-700">Adicionar Aluno</Button>
                                    </form>
                                </Card>
                            </div>
                        </div>
                    </div>
                )}


                {/* MONITORS TAB */}
                {activeTab === 'monitors' && !selectedRoute && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
                            <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                                <h2 className="text-lg font-semibold text-gray-800">Monitores da Equipe</h2>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input placeholder="Buscar monitor..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            {filteredMonitors.map(m => (
                                <Card key={m.id} className="flex justify-between items-center py-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900">{m.full_name}</h3>
                                        <p className="text-sm text-gray-500">{m.email}</p>
                                        <div className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                                            <Map size={12} />
                                            {routes.find(r => r.id === m.assigned_route_id)?.route_number || 'Sem Rota'}
                                        </div>
                                    </div>
                                    <div className="flex">
                                        <Button variant="ghost" onClick={() => setEditMonitorModal({ isOpen: true, monitor: { ...m } })} className="text-gray-300 hover:text-blue-600"><Edit size={18} /></Button>
                                        <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: true, type: 'monitor', id: m.id, name: m.full_name })} className="text-gray-300 hover:text-red-500"><Trash size={18} /></Button>
                                    </div>
                                </Card>
                            ))}
                            {filteredMonitors.length === 0 && <div className="text-center p-8 text-gray-400 border border-dashed rounded-lg">Nenhum monitor encontrado.</div>}
                        </div>
                        <div className="order-first lg:order-last">
                            <Card title="Adicionar Monitor" className="sticky top-24">
                                <form onSubmit={handleCreateMonitor} className="space-y-4">
                                    <Input label="Nome Completo" value={newMonitor.fullName} onChange={e => setNewMonitor({ ...newMonitor, fullName: e.target.value })} required />
                                    <Input label="E-mail" type="email" value={newMonitor.email} onChange={e => setNewMonitor({ ...newMonitor, email: e.target.value })} required />
                                    <Input label="Senha" type="password" value={newMonitor.password} onChange={e => setNewMonitor({ ...newMonitor, password: e.target.value })} required />
                                    <Select label="Atribuir Rota" value={newMonitor.routeId} onChange={e => setNewMonitor({ ...newMonitor, routeId: e.target.value })} required>
                                        <option value="">Selecione a Rota...</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.route_number} - {r.driver_name}</option>)}
                                    </Select>
                                    <Button type="submit" isLoading={loading} className="w-full">Criar Monitor</Button>
                                </form>
                            </Card>
                        </div>
                    </div>
                )}

                {/* SCHOOLS TAB */}
                {activeTab === 'schools' && !selectedRoute && (
                    <div className="grid lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-4 order-last lg:order-first">
                            <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                                <h2 className="text-lg font-semibold text-gray-800">Escolas Cadastradas</h2>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input placeholder="Buscar escola..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {filteredSchools.map(s => (
                                    <Card key={s.id} className="flex justify-between items-center bg-white hover:border-blue-300 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-blue-50 p-2 rounded-lg text-blue-600"><School size={20} /></div>
                                            <span className="font-bold text-gray-800">{s.name}</span>
                                        </div>
                                        <div className="flex">
                                            <Button variant="ghost" onClick={() => setEditSchoolModal({ isOpen: true, school: { ...s } })} className="text-gray-300 hover:text-blue-600"><Edit size={16} /></Button>
                                            <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: true, type: 'school', id: s.id, name: s.name })} className="text-gray-300 hover:text-red-500"><Trash size={16} /></Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                            {filteredSchools.length === 0 && <div className="text-center p-8 text-gray-400 border border-dashed rounded-lg">Nenhuma escola encontrada.</div>}
                        </div>
                        <div className="order-first lg:order-last">
                            <Card title="Adicionar Escola" className="sticky top-24">
                                <form onSubmit={handleCreateSchool} className="space-y-4">
                                    <Input label="Nome da Escola" value={newSchool.name} onChange={e => setNewSchool({ ...newSchool, name: e.target.value })} required />
                                    <Button type="submit" isLoading={loading} className="w-full">Adicionar Escola</Button>
                                </form>
                            </Card>
                        </div>
                    </div>
                )}

                {/* STUDENTS TAB (NEW) */}
                {activeTab === 'students' && !selectedRoute && (
                    <div className="space-y-4">
                        <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center gap-3 mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Todos os Alunos ({filteredAllStudents.length})</h2>

                            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
                                <Button onClick={openImportModal} variant="outline" className="text-xs h-10 border-blue-200 text-blue-700 hover:bg-blue-50">
                                    Importar de {selectedYear - 1}
                                </Button>
                                <div className="w-full sm:w-48">
                                    <Select value={filterRouteId} onChange={e => setFilterRouteId(e.target.value)} className="text-sm py-1.5 h-10">
                                        <option value="">Todas as Rotas</option>
                                        {routes.map(r => <option key={r.id} value={r.id}>{r.route_number}</option>)}
                                    </Select>
                                </div>
                                <div className="w-full sm:w-48">
                                    <Select value={filterSchoolId} onChange={e => setFilterSchoolId(e.target.value)} className="text-sm py-1.5 h-10">
                                        <option value="">Todas as Escolas</option>
                                        {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                    </Select>
                                </div>
                                <div className="relative w-full sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                    <Input placeholder="Buscar por nome..." className="pl-9 py-2 text-sm h-10" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-200">
                                        <tr>
                                            <th className="px-4 py-3">Nome</th>
                                            <th className="px-4 py-3">Data Nasc.</th>
                                            <th className="px-4 py-3">Escola</th>
                                            <th className="px-4 py-3">Série/Turno</th>
                                            <th className="px-4 py-3">Rota</th>
                                            <th className="px-4 py-3">Endereço</th>
                                            <th className="px-4 py-3">Responsável</th>
                                            <th className="px-4 py-3">Médico</th>
                                            <th className="px-4 py-3 text-right">Ações</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {filteredAllStudents.map(s => (
                                            <tr key={s.id} className="hover:bg-gray-50/50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-gray-900">
                                                    <div>
                                                        {s.full_name}
                                                        {s.has_special_condition && <span className="ml-2 text-[10px] bg-yellow-100 text-yellow-800 px-1.5 py-0.5 rounded border border-yellow-200">⚠</span>}
                                                    </div>
                                                    {s.user_profiles && (
                                                        <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                                                            Cadastro: {s.user_profiles.full_name}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                                                    {s.date_of_birth ? new Date(s.date_of_birth).toLocaleDateString('pt-BR') : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">{s.schools?.name || '-'}</td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-medium">{s.grade || '-'}</span>
                                                        <span className="text-[10px] text-gray-400">{s.shift || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {s.routes ? (
                                                        <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 text-xs font-medium">
                                                            <Bus size={10} />
                                                            {s.routes.route_number}
                                                        </span>
                                                    ) : <span className="text-gray-400">-</span>}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600 text-xs max-w-[150px] truncate" title={s.address}>
                                                    {s.address || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-gray-600">
                                                    <div className="flex flex-col">
                                                        <span className="text-xs">{s.guardian_name || '-'}</span>
                                                        <span className="text-[10px] text-gray-400">{s.guardian_phone || '-'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    {s.has_medical_condition ? (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-50 text-red-700 text-[10px] font-medium">
                                                            ⚕️ Sim
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-400 text-xs">Não</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <Button variant="ghost" onClick={() => setEditStudentModal({ isOpen: true, student: s })} className="text-gray-300 hover:text-blue-600"><Edit size={16} /></Button>
                                                        <Button variant="ghost" onClick={() => setDeleteModal({ isOpen: true, type: 'student', id: s.id, name: s.full_name })} className="text-gray-300 hover:text-red-500"><Trash size={16} /></Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {filteredAllStudents.length === 0 && <div className="p-8 text-center text-gray-400">Nenhum aluno em {selectedYear} para esta busca.</div>}
                        </div>
                    </div>
                )}

            </main>

            {/* DELETE MODAL */}
            <Modal
                isOpen={!!deleteModal}
                onClose={() => setDeleteModal(null)}
                title={`Excluir ${deleteModal?.type ? (deleteModal.type === 'route' ? 'Rota' : deleteModal.type === 'school' ? 'Escola' : deleteModal.type === 'monitor' ? 'Monitor' : 'Aluno') : ''}`}
                footer={
                    <>
                        <Button variant="ghost" onClick={() => setDeleteModal(null)}>Cancelar</Button>
                        <Button variant="danger" onClick={executeDelete} isLoading={loading}>Confirmar Exclusão</Button>
                    </>
                }
            >
                <div className="text-center py-4">
                    <div className="bg-red-50 text-red-500 p-3 rounded-full w-12 h-12 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle size={28} />
                    </div>
                    <p className="text-gray-600">Tem certeza que deseja excluir <span className="font-bold text-gray-900">{deleteModal?.name}</span>?</p>
                    <p className="text-sm text-gray-400 mt-2">Esta ação não pode ser desfeita.</p>
                </div>
            </Modal>
            {/* IMPORT MODAL */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title={`Importar Alunos de ${selectedYear - 1}`}
                footer={
                    <>
                        <div className="flex-1 text-xs text-gray-500 text-left">
                            {selectedStudentsToImport.length} selecionados
                        </div>
                        <Button variant="ghost" onClick={() => setImportModalOpen(false)}>Cancelar</Button>
                        <Button onClick={handleImportStudents} isLoading={loading} disabled={selectedStudentsToImport.length === 0}>
                            Importar Selecionados
                        </Button>
                    </>
                }
            >
                <div className="max-h-[60vh] overflow-y-auto pr-2">
                    <p className="text-sm text-gray-600 mb-4">Selecione os alunos que continuarão utilizando o transporte em <strong>{selectedYear}</strong>:</p>

                    <div className="mb-4">
                        <Input
                            placeholder="Buscar aluno, escola ou rota..."
                            value={importSearchTerm}
                            onChange={e => setImportSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        {previousYearStudents
                            .filter(s =>
                                s.full_name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                                (s.schools?.name || '').toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                                (s.routes?.route_number || '').toLowerCase().includes(importSearchTerm.toLowerCase())
                            )
                            .map(s => (
                                <div key={s.id}
                                    onClick={() => toggleStudentImportSelection(s.id)}
                                    className={`p-3 rounded-lg border cursor-pointer transition-colors flex items-center justify-between ${selectedStudentsToImport.includes(s.id)
                                        ? 'bg-blue-50 border-blue-300'
                                        : 'bg-white border-gray-200 hover:border-blue-200'
                                        }`}
                                >
                                    <div>
                                        <p className="font-bold text-gray-800 text-sm">{s.full_name}</p>
                                        <p className="text-xs text-gray-500">{s.schools?.name} • {s.routes?.route_number}</p>
                                    </div>
                                    <div className={`w-5 h-5 rounded border flex items-center justify-center ${selectedStudentsToImport.includes(s.id)
                                        ? 'bg-blue-600 border-blue-600 text-white'
                                        : 'border-gray-300'
                                        }`}>
                                        {selectedStudentsToImport.includes(s.id) && <span className="text-xs">✓</span>}
                                    </div>
                                </div>
                            ))}
                        {previousYearStudents.filter(s =>
                            s.full_name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                            (s.schools?.name || '').toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                            (s.routes?.route_number || '').toLowerCase().includes(importSearchTerm.toLowerCase())
                        ).length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed rounded-lg">
                                    Nenhum aluno encontrado.
                                </div>
                            )}
                    </div>
                </div>
            </Modal>

            {/* EDIT STUDENT MODAL */}
            {editStudentModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditStudentModal(null)}
                    title="Editar Aluno"
                >
                    <form onSubmit={executeEditStudent} className="space-y-4 max-h-[70vh] overflow-y-auto px-1">
                        <Input label="Nome Completo" value={editStudentModal.student.full_name} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, full_name: e.target.value } })} required />
                        <Input label="Data de Nascimento" type="date" value={editStudentModal.student.date_of_birth} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, date_of_birth: e.target.value } })} required />

                        <div className="grid grid-cols-2 gap-3">
                            <Input label="Responsável" value={editStudentModal.student.guardian_name || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, guardian_name: e.target.value } })} />
                            <Input label="Telefone" value={editStudentModal.student.guardian_phone || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, guardian_phone: e.target.value } })} />
                        </div>

                        <Input label="Endereço" value={editStudentModal.student.address || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, address: e.target.value } })} />

                        <div className="grid grid-cols-2 gap-3">
                            <Select label="Série" value={editStudentModal.student.grade || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, grade: e.target.value } })}>
                                <option value="">Selecione...</option>
                                <optgroup label="Pré-Escola"><option value="1º Período da Pré-Escola">1º Período</option><option value="2º Período da Pré-Escola">2º Período</option></optgroup>
                                <optgroup label="Fundamental"><option value="1º Ano do Ensino Fundamental">1º Ano</option><option value="2º Ano do Ensino Fundamental">2º Ano</option><option value="3º Ano do Ensino Fundamental">3º Ano</option><option value="4º Ano do Ensino Fundamental">4º Ano</option><option value="5º Ano do Ensino Fundamental">5º Ano</option><option value="6º Ano do Ensino Fundamental">6º Ano</option><option value="7º Ano do Ensino Fundamental">7º Ano</option><option value="8º Ano do Ensino Fundamental">8º Ano</option><option value="9º Ano do Ensino Fundamental">9º Ano</option></optgroup>
                                <optgroup label="Médio"><option value="1º Ano do Ensino Médio">1º Ano Médio</option><option value="2º Ano do Ensino Médio">2º Ano Médio</option><option value="3º Ano do Ensino Médio">3º Ano Médio</option></optgroup>
                            </Select>
                            <Select label="Turno" value={editStudentModal.student.shift || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, shift: e.target.value } })} required>
                                <option value="">Selecione...</option>
                                <option value="morning">Manhã</option>
                                <option value="afternoon">Tarde</option>
                                <option value="night">Noite</option>
                                <option value="full_time">Integral</option>
                            </Select>
                        </div>

                        <Select label="Escola" value={editStudentModal.student.school_id || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, school_id: e.target.value } })}>
                            <option value="">Selecione a Escola...</option>
                            {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </Select>

                        <Select label="Rota" value={editStudentModal.student.route_id || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, route_id: e.target.value } })}>
                            <option value="">Selecione a Rota...</option>
                            {routes.map(r => <option key={r.id} value={r.id}>Rota {r.route_number} - {r.driver_name}</option>)}
                        </Select>

                        <div className="pt-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" checked={editStudentModal.student.has_special_condition} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, has_special_condition: e.target.checked } })} className="text-blue-600 rounded focus:ring-blue-500" />
                                <span className="text-sm font-semibold text-gray-700">Condição Médica?</span>
                            </label>
                            {editStudentModal.student.has_special_condition && (
                                <div className="mt-2 space-y-2 bg-yellow-50 p-2 rounded border border-yellow-100">
                                    <textarea className="w-full text-sm p-2 border border-yellow-200 rounded" placeholder="Detalhes..." rows={2} value={editStudentModal.student.special_condition_details || ''} onChange={e => setEditStudentModal({ ...editStudentModal, student: { ...editStudentModal.student, special_condition_details: e.target.value } })} />
                                    <div>
                                        <label className="text-xs text-red-600 font-bold mb-1 block">Laudo Médico (Obrigatório PDF/Foto):</label>
                                        <Input type="file" className="text-xs bg-white" onChange={e => setEditMedicalFile(e.target.files ? e.target.files[0] : null)} />
                                    </div>
                                    {editStudentModal.student.medical_report_url && (
                                        <div className="text-xs">
                                            <a href={editStudentModal.student.medical_report_url} target="_blank" rel="noreferrer" className="text-blue-600 underline">Ver documento atual</a>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditStudentModal(null)} className="flex-1">Cancelar</Button>
                            <Button type="submit" isLoading={loading} className="flex-1">Salvar Alterações</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT ROUTE MODAL */}
            {editRouteModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditRouteModal(null)}
                    title="Editar Rota"
                >
                    <form onSubmit={executeEditRoute} className="space-y-4">
                        <Input label="Número da Rota" value={editRouteModal.route.route_number || ''} onChange={e => setEditRouteModal({ ...editRouteModal, route: { ...editRouteModal.route, route_number: e.target.value } })} required />
                        <Input label="Nome do Motorista" value={editRouteModal.route.driver_name || ''} onChange={e => setEditRouteModal({ ...editRouteModal, route: { ...editRouteModal.route, driver_name: e.target.value } })} required />
                        <Select label="Tipo de Veículo" value={editRouteModal.route.vehicle_type || ''} onChange={e => setEditRouteModal({ ...editRouteModal, route: { ...editRouteModal.route, vehicle_type: e.target.value } })}>
                            <option value="">Selecione...</option>
                            <option value="Micro">Micro-ônibus</option>
                            <option value="Ônibus">Ônibus</option>
                            <option value="Van">Van</option>
                        </Select>
                        <Input label="Placa do Veículo" value={editRouteModal.route.vehicle_plate || ''} onChange={e => setEditRouteModal({ ...editRouteModal, route: { ...editRouteModal.route, vehicle_plate: e.target.value } })} />
                        <Input label="Capacidade Máxima" type="number" value={editRouteModal.route.max_capacity || ''} onChange={e => setEditRouteModal({ ...editRouteModal, route: { ...editRouteModal.route, max_capacity: e.target.value } })} />
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditRouteModal(null)} className="flex-1">Cancelar</Button>
                            <Button type="submit" isLoading={loading} className="flex-1">Salvar Alterações</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT SCHOOL MODAL */}
            {editSchoolModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditSchoolModal(null)}
                    title="Editar Escola"
                >
                    <form onSubmit={executeEditSchool} className="space-y-4">
                        <Input label="Nome da Escola" value={editSchoolModal.school.name || ''} onChange={e => setEditSchoolModal({ ...editSchoolModal, school: { ...editSchoolModal.school, name: e.target.value } })} required />
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditSchoolModal(null)} className="flex-1">Cancelar</Button>
                            <Button type="submit" isLoading={loading} className="flex-1">Salvar Alterações</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {/* EDIT MONITOR MODAL */}
            {editMonitorModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditMonitorModal(null)}
                    title="Editar Monitor"
                >
                    <form onSubmit={executeEditMonitor} className="space-y-4">
                        <Input label="Nome Completo" value={editMonitorModal.monitor.full_name || ''} onChange={e => setEditMonitorModal({ ...editMonitorModal, monitor: { ...editMonitorModal.monitor, full_name: e.target.value } })} required />
                        <p className="text-sm text-gray-500">E-mail: {editMonitorModal.monitor.email}</p>
                        <Select label="Rota Atribuída" value={editMonitorModal.monitor.assigned_route_id || ''} onChange={e => setEditMonitorModal({ ...editMonitorModal, monitor: { ...editMonitorModal.monitor, assigned_route_id: e.target.value } })}>
                            <option value="">Sem Rota</option>
                            {routes.map(r => <option key={r.id} value={r.id}>{r.route_number} - {r.driver_name}</option>)}
                        </Select>
                        <div className="flex gap-2 pt-2">
                            <Button type="button" variant="ghost" onClick={() => setEditMonitorModal(null)} className="flex-1">Cancelar</Button>
                            <Button type="submit" isLoading={loading} className="flex-1">Salvar Alterações</Button>
                        </div>
                    </form>
                </Modal>
            )}
            {/* MISSING FILE ALERT MODAL */}
            {missingFileModal && (
                <Modal isOpen={true} onClose={() => setMissingFileModal(false)} title="Documentação Obrigatória">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                            <AlertCircle size={32} />
                            <div>
                                <h3 className="font-bold">Aviso Importante</h3>
                                <p className="text-sm">Para alunos com condição médica especial, é <strong>obrigatório</strong> anexar o laudo médico (PDF ou Foto).</p>
                            </div>
                        </div>
                        <Button onClick={() => setMissingFileModal(false)} className="w-full bg-red-600 hover:bg-red-700">Entendi</Button>
                    </div>
                </Modal>
            )}
        </div>
    )
}
