'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useAuth } from '@/context/AuthContext'
import { Bus, MapPin, Phone, Shield, User, Trash, Search, Calendar, Edit, AlertCircle } from 'lucide-react'
import { safeRequest } from '@/utils/asyncUtils'
import { UserMenu } from './ui/UserMenu'
import { Card } from './ui/Card'
import { Button } from './ui/Button'
import { Modal } from './ui/Modal'
import { Input, Select } from './ui/Forms'
import { Toast } from './ui/Toast'

export default function MonitorPanel() {
    const { user } = useAuth()
    const currentYear = new Date().getFullYear()

    const [students, setStudents] = useState<any[]>([])
    const [myRoute, setMyRoute] = useState<any>(null)
    const [schools, setSchools] = useState<any[]>([])
    const [selectedYear, setSelectedYear] = useState<number>(currentYear)

    // Search State
    const [searchTerm, setSearchTerm] = useState('')

    // Modal State
    const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean, id: string, name: string } | null>(null)
    const [editStudentModal, setEditStudentModal] = useState<{ isOpen: boolean, student: any } | null>(null)
    const [editMedicalFile, setEditMedicalFile] = useState<File | null>(null)
    const [missingFileModal, setMissingFileModal] = useState(false)

    // Form State
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
    const [message, setMessage] = useState('')

    // Import Modal State
    const [importModalOpen, setImportModalOpen] = useState(false)
    const [previousYearStudents, setPreviousYearStudents] = useState<any[]>([])
    const [selectedStudentsToImport, setSelectedStudentsToImport] = useState<string[]>([])
    const [importSearchTerm, setImportSearchTerm] = useState('')


    useEffect(() => {
        if (user) {
            loadData()
            fetchSchools()
        }
    }, [user, selectedYear]) // Re-load when year changes

    const fetchSchools = async () => {
        const { data } = await supabase.from('schools').select('*')
        if (data) setSchools(data)
    }

    const loadData = async () => {
        const { data: profile } = await supabase.from('user_profiles').select('*').eq('id', user!.id).single() as any
        if (profile?.assigned_route_id) {
            const { data: route } = await supabase.from('routes').select('*').eq('id', profile.assigned_route_id).single() as any
            setMyRoute(route)

            // Filter by selectedYear
            const { data: studs } = await supabase.from('students')
                .select('*, schools(name), user_profiles!students_created_by_fkey(full_name)')
                .eq('route_id', profile.assigned_route_id)
                .eq('school_year', selectedYear)
                .order('full_name')

            if (studs) setStudents(studs)
        }
    }

    const executeDelete = async () => {
        if (!deleteModal) return
        setLoading(true)
        const { id } = deleteModal
        try {
            const { error } = await supabase.from('students').delete().eq('id', id)
            if (error) throw error
            setMessage('Aluno removido com sucesso.')
            loadData()
        } catch (err: any) { setMessage(err.message) }
        finally { setLoading(false); setDeleteModal(null) }
    }

    const handleAddStudent = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!myRoute) return
        setLoading(true)
        setMessage('')

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
                school_id: newStudent.schoolId,
                route_id: myRoute?.id, // Fixed: use route ID, not user ID
                city_id: myRoute?.city_id, // Fixed: add required city_id
                school_year: selectedYear,
                created_by: user?.id,
                has_special_condition: newStudent.hasSpecialCondition,
                special_condition_details: newStudent.specialConditionDetails,
                medical_report_url: reportUrl
            } as any), 30000)


            if (error) throw error
            setMessage(`Aluno adicionado com sucesso para ${selectedYear}!`)
            setNewStudent({ fullName: '', dob: '', guardianName: '', guardianPhone: '', address: '', shift: '', grade: '', schoolId: '', hasSpecialCondition: false, specialConditionDetails: '' })
            setMedicalReportFile(null)
            loadData()
        } catch (err: any) { setMessage('Erro: ' + err.message) }
        finally { setLoading(false) }
    }

    // Filter Students
    const filteredStudents = students.filter(s =>
        (s.full_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.guardian_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.schools?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    )

    const openImportModal = async () => {
        if (!myRoute) return
        setLoading(true)
        try {
            const prevYear = selectedYear - 1
            const { data } = await supabase.from('students')
                .select('*, schools(name)')
                .eq('route_id', myRoute.id) // Only from THIS monitor's route
                .eq('school_year', prevYear)
                .order('full_name')

            if (data && data.length > 0) {
                setPreviousYearStudents(data)
                setImportSearchTerm('')
                setImportModalOpen(true)
            } else {
                setMessage(`Nenhum aluno encontrado nesta rota em ${prevYear}.`)
            }
        } catch (err: any) {
            setMessage('Erro ao buscar alunos: ' + err.message)
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
                grade: s.grade,
                school_id: s.school_id,
                has_special_condition: s.has_special_condition,
                special_condition_details: s.special_condition_details,
                medical_report_url: s.medical_report_url,
                route_id: s.route_id, // Keep same route
                city_id: s.city_id,
                school_year: selectedYear // New Year
            }))

            const { error } = await supabase.from('students').insert(newRecords as any)

            if (error) throw error

            setMessage(`${newRecords.length} alunos importados com sucesso para ${selectedYear}!`)
            setImportModalOpen(false)
            setSelectedStudentsToImport([])
            loadData()
        } catch (err: any) {
            setMessage('Erro ao importar: ' + err.message)
        } finally {
            setLoading(false)
        }
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
                const { error: upErr } = await supabase.storage.from('student-documents').upload(fileName, editMedicalFile)
                if (upErr) throw upErr
                const { data: { publicUrl } } = supabase.storage.from('student-documents').getPublicUrl(fileName)
                reportUrl = publicUrl
            }

            const { error } = await (supabase.from('students') as any).update({
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
                medical_report_url: reportUrl
                // Monitor CANNOT edit route_id, city_id, school_year
            }).eq('id', s.id)

            if (error) throw error
            setMessage('Dados do aluno atualizados com sucesso!')
            setEditStudentModal(null)
            loadData()

        } catch (err: any) {
            setMessage('Erro ao atualizar: ' + err.message)
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

    if (!myRoute) return (
        <div className="min-h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-500">Carregando rota...</p>
                <div className="mt-4">
                    <UserMenu />
                </div>
            </div>
        </div>
    )


    return (
        <div className="min-h-screen bg-white pb-20">
            <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
                <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                                <span className="bg-blue-100 p-1.5 rounded text-blue-700"><Bus size={20} /></span>
                                Rota {myRoute.route_number}
                            </h1>
                            <p className="text-xs text-gray-500 ml-9">Motorista: {myRoute.driver_name}</p>
                        </div>

                        {/* Year Selector */}
                        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 ml-9 sm:ml-0">
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

            <main className="max-w-5xl mx-auto px-4 py-8">
                {message && <Toast message={message} type={message.includes('Erro') || message.includes('Error') ? 'error' : 'success'} onClose={() => setMessage('')} />}

                <div className="grid md:grid-cols-3 gap-8">
                    {/* Add Form - Mobile First (Order 1), Desktop Side (Order 2) */}
                    <div className="order-first md:order-last">
                        <Card title={`Adicionar Aluno (${selectedYear})`} className="sticky top-24 border-blue-100 shadow-blue-50">
                            <form onSubmit={handleAddStudent} className="space-y-4">
                                <Input label="Nome Completo" value={newStudent.fullName} onChange={e => setNewStudent({ ...newStudent, fullName: e.target.value })} required />
                                <Input label="Data de Nascimento" type="date" value={newStudent.dob} onChange={e => setNewStudent({ ...newStudent, dob: e.target.value })} required />

                                <div className="grid grid-cols-2 gap-3">
                                    <Input label="Responsável" value={newStudent.guardianName} onChange={e => setNewStudent({ ...newStudent, guardianName: e.target.value })} />
                                    <Input label="Telefone" value={newStudent.guardianPhone} onChange={e => setNewStudent({ ...newStudent, guardianPhone: e.target.value })} />
                                </div>

                                <Input label="Endereço / Ponto" value={newStudent.address} onChange={e => setNewStudent({ ...newStudent, address: e.target.value })} />

                                <div className="grid grid-cols-2 gap-3">
                                    <Select label="Série" value={newStudent.grade} onChange={e => setNewStudent({ ...newStudent, grade: e.target.value })}>
                                        <option value="">Selecione...</option>
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
                                    <Select label="Turno" value={newStudent.shift} onChange={e => setNewStudent({ ...newStudent, shift: e.target.value })} required>
                                        <option value="">Selecione...</option>
                                        <option value="morning">Manhã</option>
                                        <option value="afternoon">Tarde</option>
                                        <option value="night">Noite</option>
                                        <option value="full_time">Integral</option>
                                    </Select>
                                </div>

                                <Select label="Escola" value={newStudent.schoolId} onChange={e => setNewStudent({ ...newStudent, schoolId: e.target.value })}>
                                    <option value="">Selecione a Escola...</option>
                                    {schools.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </Select>

                                <div className="pt-2">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input type="checkbox" checked={newStudent.hasSpecialCondition} onChange={e => setNewStudent({ ...newStudent, hasSpecialCondition: e.target.checked })} className="text-blue-600 rounded focus:ring-blue-500" />
                                        <span className="text-sm font-semibold text-gray-700">Condição Médica?</span>
                                    </label>
                                    {newStudent.hasSpecialCondition && (
                                        <div className="mt-2 space-y-2 bg-yellow-50 p-2 rounded border border-yellow-100 animate-in fade-in">
                                            <textarea className="w-full text-sm p-2 border border-yellow-200 rounded" placeholder="Detalhes..." rows={2} value={newStudent.specialConditionDetails} onChange={e => setNewStudent({ ...newStudent, specialConditionDetails: e.target.value })} />
                                            <div>
                                                <label className="text-xs text-red-600 font-bold mb-1 block">Laudo Médico (Obrigatório PDF/Foto):</label>
                                                <Input type="file" className="text-xs" onChange={e => setMedicalReportFile(e.target.files ? e.target.files[0] : null)} />
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <Button type="submit" isLoading={loading} className="w-full bg-blue-600 hover:bg-blue-700">Registrar Aluno</Button>
                            </form>
                        </Card>
                    </div>

                    {/* Student List - Mobile Second (Order 2), Desktop First (Order 1) */}
                    <div className="md:col-span-2 space-y-4 order-last md:order-first">
                        <div className="flex flex-col sm:flex-row justify-between items-end gap-3 mb-2">
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <User size={18} /> Passageiros ({selectedYear}) <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{filteredStudents.length}</span>
                            </h2>

                            <Button onClick={openImportModal} variant="outline" className="text-xs h-9 border-blue-200 text-blue-700 hover:bg-blue-50 w-full sm:w-auto">
                                Importar {selectedYear - 1}
                            </Button>

                            <div className="relative w-full sm:w-64">

                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                                <Input placeholder="Buscar passageiro..." className="pl-9 py-2 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                            </div>
                        </div>

                        <div className="space-y-3">
                            {filteredStudents.map(s => (
                                <Card key={s.id} className="group hover:border-blue-200 transition-colors">
                                    <div className="flex justify-between items-start">
                                        <div className="w-full">
                                            <div className="flex justify-between items-start mb-1">
                                                <div>
                                                    <h3 className="font-bold text-gray-900 text-lg">{s.full_name}</h3>
                                                    <p className="text-sm text-gray-500">{s.schools?.name || 'Sem escola'}</p>
                                                </div>
                                                <div className="flex gap-1 justify-end -mt-2 -mr-2">
                                                    <Button variant="ghost" className="text-gray-300 hover:text-blue-600" onClick={() => setEditStudentModal({ isOpen: true, student: s })}>
                                                        <Edit size={16} />
                                                    </Button>
                                                    <Button variant="ghost" className="text-gray-300 hover:text-red-500" onClick={() => setDeleteModal({ isOpen: true, id: s.id, name: s.full_name })}>
                                                        <Trash size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                            {s.user_profiles && (
                                                <div className="text-[10px] text-gray-400 -mt-1 mb-2">
                                                    Cadastrado por: {s.user_profiles.full_name}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mt-3 pt-3 border-t border-gray-50 text-gray-600">
                                                <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {s.address || 'Sem endereço'}</div>
                                                <div className="flex items-center gap-2"><Shield size={14} className="text-gray-400" /> {s.guardian_name || '-'}</div>
                                                <div className="flex items-center gap-2"><Phone size={14} className="text-gray-400" /> {s.guardian_phone || '-'}</div>
                                                <div className="flex items-center gap-2"><div className="w-3.5 h-3.5 rounded-full border border-gray-300 flex items-center justify-center text-[8px] text-gray-500 font-serif">S</div> {s.grade || '-'}</div>
                                            </div>

                                            {s.has_special_condition && (
                                                <div className="mt-3 text-xs bg-yellow-50 p-2.5 rounded-lg border border-yellow-100 text-yellow-800 flex items-start gap-2">
                                                    <span className="font-bold whitespace-nowrap">⚠️ Info Médica:</span>
                                                    <div>
                                                        {s.special_condition_details}
                                                        {s.medical_report_url && <a href={s.medical_report_url} target="_blank" className="ml-2 underline text-yellow-900 font-semibold">Ver Laudo</a>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Card>
                            ))}
                            {filteredStudents.length === 0 && <div className="text-center p-8 bg-white rounded-xl border border-dashed text-gray-400">Nenhum aluno encontrado em {selectedYear}.</div>}
                        </div>
                    </div>
                </div>
            </main>

            <Modal isOpen={!!deleteModal} onClose={() => setDeleteModal(null)} title="Remover Aluno" footer={
                <>
                    <Button variant="ghost" onClick={() => setDeleteModal(null)}>Cancelar</Button>
                    <Button variant="danger" onClick={executeDelete} isLoading={loading}>Confirmar Remoção</Button>
                </>
            }>
                <div className="py-4 text-center">
                    <p className="text-gray-600">Remover <span className="font-bold text-gray-900">{deleteModal?.name}</span> da rota?</p>
                </div>
            </Modal>

            {/* IMPORT MODAL */}
            <Modal
                isOpen={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                title={`Importar da Rota (${selectedYear - 1})`}
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
                    <p className="text-sm text-gray-600 mb-4">Selecione alunos da rota anterior para copiar para <strong>{selectedYear}</strong>:</p>

                    <div className="mb-4">
                        <Input
                            placeholder="Buscar passageiro..."
                            value={importSearchTerm}
                            onChange={e => setImportSearchTerm(e.target.value)}
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-2">
                        {previousYearStudents
                            .filter(s =>
                                s.full_name.toLowerCase().includes(importSearchTerm.toLowerCase()) ||
                                (s.schools?.name || '').toLowerCase().includes(importSearchTerm.toLowerCase())
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
                                        <p className="text-xs text-gray-500">{s.schools?.name}</p>
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
                            (s.schools?.name || '').toLowerCase().includes(importSearchTerm.toLowerCase())
                        ).length === 0 && (
                                <div className="text-center py-6 text-gray-400 border border-dashed rounded-lg">
                                    Nenhum passageiro encontrado.
                                </div>
                            )}
                    </div>
                </div>
            </Modal>

            {/* RESTRICTED EDIT STUDENT MODAL */}
            {editStudentModal && (
                <Modal
                    isOpen={true}
                    onClose={() => setEditStudentModal(null)}
                    title="Editar Dados do Aluno"
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
