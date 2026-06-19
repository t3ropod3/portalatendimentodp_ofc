/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  UserPlus, 
  Edit3, 
  AlertCircle, 
  CheckCircle, 
  X, 
  Building2, 
  Fingerprint, 
  UserCheck, 
  UserX,
  Search,
  Database,
  RefreshCw,
  Trash2,
  RotateCcw
} from 'lucide-react';
import { Usuario } from '../types';
import { createUsuario, updateUsuario, deleteUsuario } from '../apiServices';
import { getApiUrl } from '../apiConfig';

interface GestaoUsuariosProps {
  currentUser: Usuario;
  users: Usuario[];
  onUpdateUsers: () => void;
  onForceSync?: () => Promise<void>;
  isSyncing?: boolean;
}

export default function GestaoUsuarios({ 
  currentUser, 
  users, 
  onUpdateUsers,
  onForceSync,
  isSyncing = false
}: GestaoUsuariosProps) {
  
  // Form states
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('123');
  const [perfil, setPerfil] = useState<'Administrador' | 'Atendente' | 'Solicitante'>('Solicitante');
  const [empresa, setEmpresa] = useState<'Radar' | 'Proativa' | 'Ambas'>('Proativa');
  const [ativo, setAtivo] = useState<'Sim' | 'Não'>('Sim');

  // Search filter
  const [searchTerm, setSearchTerm] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Database operation states
  const [dbSuccessMsg, setDbSuccessMsg] = useState('');
  const [dbErrorMsg, setDbErrorMsg] = useState('');
  const [isDbWorking, setIsDbWorking] = useState(false);

  const handleClearDatabase = async () => {
    if (!window.confirm("ATENÇÃO: Isso irá apagar PERMANENTEMENTE todos os chamados, históricos e notificações do banco de dados (Neon e Local). Seus usuários administradores serão preservados. Deseja prosseguir?")) {
      return;
    }
    setIsDbWorking(true);
    setDbSuccessMsg('');
    setDbErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/clear-database'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao limpar banco de dados");
      
      // Wipe client cached tickets/history/notifications
      localStorage.removeItem('dp_chamados_tickets');
      localStorage.removeItem('dp_chamados_history');
      localStorage.removeItem('dp_chamados_notifications');
      
      setDbSuccessMsg('O banco de dados do Neon e os caches locais foram redefinidos para limpo com absoluto sucesso!');
      
      if (onForceSync) {
        await onForceSync();
      }
    } catch (err: any) {
      console.error(err);
      setDbErrorMsg(err.message || "Erro operacional ao limpar banco de dados");
    } finally {
      setIsDbWorking(false);
    }
  };

  const handleSeedDatabase = async () => {
    if (!window.confirm("Isso irá apagar todos os dados atuais e reinserir todos os chamados, usuários, históricos e notificações padrão de teste / demonstração. Deseja continuar?")) {
      return;
    }
    setIsDbWorking(true);
    setDbSuccessMsg('');
    setDbErrorMsg('');
    try {
      const res = await fetch(getApiUrl('/api/admin/seed-database'), { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao re-popular banco de dados");
      
      setDbSuccessMsg('Banco de dados de teste re-populado com sucesso tanto no Neon quanto no cache do navegador!');
      
      if (onForceSync) {
        await onForceSync();
      }
    } catch (err: any) {
      console.error(err);
      setDbErrorMsg(err.message || "Erro operacional ao restaurar dados");
    } finally {
      setIsDbWorking(false);
    }
  };

  const handleClientSync = async () => {
    setIsDbWorking(true);
    setDbSuccessMsg('');
    setDbErrorMsg('');
    try {
      if (onForceSync) {
        await onForceSync();
        setDbSuccessMsg('Os dados locais do seu navegador foram forçadamente sincronizados com o Neon de forma bem-sucedida!');
      } else {
        throw new Error("Sincronizador não configurado");
      }
    } catch (err: any) {
      console.error(err);
      setDbErrorMsg(err.message || "Erro ao sincronizar");
    } finally {
      setIsDbWorking(false);
    }
  };

  // Dual role protection: cannot edit your own profile role or active status (prevents locks)
  const isEditingSelf = editingUserId === currentUser.id;

  const handleEditClick = (user: Usuario) => {
    setSuccessMsg('');
    setErrorMsg('');
    setEditingUserId(user.id);
    setNome(user.nome);
    setEmail(user.email);
    setSenha(user.senha || '');
    setPerfil(user.perfil);
    setEmpresa(user.empresa);
    setAtivo(user.ativo);
  };

  const handleDeleteClick = async (user: Usuario) => {
    if (!window.confirm(`Tem certeza que deseja excluir o usuário "${user.nome}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    try {
      await deleteUsuario(user.id);
      setSuccessMsg(`Usuário "${user.nome}" excluído com sucesso!`);
      onUpdateUsers(); // Refresh parent listings
    } catch (err: any) {
      setErrorMsg('Erro ao excluir usuário: ' + err.message);
    }
  };

  const handleClearForm = () => {
    setEditingUserId(null);
    setNome('');
    setEmail('');
    setSenha('123');
    setPerfil('Solicitante');
    setEmpresa('Proativa');
    setAtivo('Sim');
    setSuccessMsg('');
    setErrorMsg('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    // Field audits
    if (!nome.trim() || !email.trim()) {
      setErrorMsg('Os campos Nome e E-mail são obrigatórios.');
      return;
    }
    
    if (!editingUserId && !senha.trim()) {
      setErrorMsg('A Senha de Acesso é obrigatória para novos cadastros.');
      return;
    }

    const trimmedNome = nome.trim();
    const trimmedEmail = email.trim().toLowerCase();

    // Check duplicate names (excluding the user we are currently editing)
    const nomeIndex = users.findIndex(u => u.nome.trim().toLowerCase() === trimmedNome.toLowerCase() && u.id !== editingUserId);
    if (nomeIndex !== -1) {
      setErrorMsg('Este nome já está cadastrado como login em outro usuário do portal.');
      return;
    }

    // Check duplicate emails (exlcuding the user we are currently editing)
    const emailIndex = users.findIndex(u => u.email.toLowerCase() === trimmedEmail && u.id !== editingUserId);
    if (emailIndex !== -1) {
      setErrorMsg('Este e-mail já está cadastrado em outro usuário do portal.');
      return;
    }

    try {
      if (editingUserId) {
        // Safe check for editing self: can't change active state or perfil to prevent lockout
        const finalActive = isEditingSelf ? 'Sim' : ativo;
        const finalPerfil = isEditingSelf ? 'Administrador' : perfil;

        // EDIT MODE
        await updateUsuario({
          id: editingUserId,
          nome: nome.trim(),
          email: trimmedEmail,
          senha: senha,
          perfil: finalPerfil,
          empresa,
          ativo: finalActive
        });
        setSuccessMsg(`Usuário "${nome}" atualizado com sucesso!`);
      } else {
        // CREATE MODE
        await createUsuario({
          nome: nome.trim(),
          email: trimmedEmail,
          senha: senha,
          perfil,
          empresa,
          ativo
        }, currentUser.email);
        setSuccessMsg(`Novo usuário "${nome}" cadastrado com sucesso!`);
      }

      onUpdateUsers(); // Refresh parent listings
      handleClearForm();
    } catch (err: any) {
      setErrorMsg('Erro: ' + err.message);
    }
  };

  // Filter users lists based on search
  const filteredUsers = useMemo(() => {
    if (!searchTerm.trim()) return users;
    const q = searchTerm.toLowerCase().trim();
    return users.filter(u => 
      u.nome.toLowerCase().includes(q) || 
      u.email.toLowerCase().includes(q) ||
      u.empresa.toLowerCase().includes(q) ||
      u.perfil.toLowerCase().includes(q)
    );
  }, [users, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Informative Banner */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
            <Users className="h-5 w-5 text-indigo-600 animate-pulse-slow" />
            Painel Geral de Gestão de Usuários
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Cadastre novos colaboradores, edite privilégios corporativos bem como alterne o status ativo/inativo das contas.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: USER FORM (CREATE & EDIT) */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden sticky top-6">
            
            <div className="bg-slate-900 text-white px-5 py-4 border-b border-slate-850 flex items-center space-x-2.5">
              <UserPlus className="h-4.5 w-4.5 text-indigo-400" />
              <h4 className="font-bold text-xs uppercase tracking-wider">
                {editingUserId ? 'Editar Cadastro' : 'Novo Usuário'}
              </h4>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              
              {successMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center space-x-2">
                  <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-850 text-xs font-semibold rounded-lg flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-rose-500 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {/* Nome Completo */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Nome Completo (Login de Acesso) *</label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  placeholder="Ex: Keit Proativa"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 focus:outline-hidden transition-all"
                  required
                />
                <span className="text-[9px] text-slate-400 block leading-normal mt-0.5">Note: Este nome servirá como login de acesso de forma única.</span>
              </div>

              {/* E-mail */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">E-mail Corporativo *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@proativa.com.br"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 focus:outline-hidden transition-all"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">
                  {editingUserId ? 'Nova Senha de Acesso' : 'Senha de Acesso *'}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder={editingUserId ? "Deixe em branco para manter a atual" : "Defina uma senha"}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 focus:outline-hidden transition-all"
                    required={!editingUserId}
                  />
                </div>
              </div>

              {/* Company Selection */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                
                {/* Perfil */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Perfil *</label>
                  <select
                    value={perfil}
                    disabled={isEditingSelf}
                    onChange={(e: any) => setPerfil(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold py-2 px-2 text-slate-700 cursor-pointer disabled:bg-slate-100 disabled:cursor-not-allowed"
                  >
                    <option value="Solicitante">Solicitante</option>
                    <option value="Atendente">Atendente</option>
                    <option value="Administrador">Administrador</option>
                  </select>
                </div>

                {/* Empresa */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Empresa *</label>
                  <select
                    value={empresa}
                    onChange={(e: any) => setEmpresa(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold py-2 px-2 text-slate-700 cursor-pointer"
                  >
                    <option value="Radar">Radar</option>
                    <option value="Proativa">Proativa</option>
                    <option value="Ambas">Radar & Proativa</option>
                  </select>
                </div>

              </div>

              {/* Account active toggle (Sim / Não) */}
              <div className="space-y-1 pb-3">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Conta Ativa? *</label>
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    disabled={isEditingSelf}
                    onClick={() => setAtivo('Sim')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer disabled:opacity-55 ${
                      ativo === 'Sim' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Sim
                  </button>
                  <button
                    type="button"
                    disabled={isEditingSelf}
                    onClick={() => setAtivo('Não')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer disabled:opacity-55 ${
                      ativo === 'Não' ? 'bg-white text-rose-500 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Não (Bloquear)
                  </button>
                </div>
                {isEditingSelf && (
                  <p className="text-[10px] text-amber-600 mt-1">Você não pode inativar ou rebaixar sua própria conta corrente ativa.</p>
                )}
              </div>

              {/* Form Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center space-x-2">
                <button
                  type="submit"
                  id="user-btn-save"
                  className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs uppercase tracking-wider transition-colors cursor-pointer shadow-sm"
                >
                  {editingUserId ? 'Salvar Edição' : 'Salvar Novo Usuário'}
                </button>
                {editingUserId && (
                  <button
                    type="button"
                    id="user-btn-cancel-edit"
                    onClick={handleClearForm}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-lg transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider"
                    title="Cancelar Edição"
                  >
                    Cancelar
                  </button>
                )}
              </div>

            </form>

          </div>
        </div>

        {/* RIGHT COLUMN: USERS LIST TABLE */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            
            {/* Search filter banner block */}
            <div className="p-4 border-b border-slate-105 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Lista de Usuários Cadastrados</span>
              <div className="relative w-full sm:max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Search className="h-3.5 w-3.5" />
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Filtrar por nome ou e-mail..."
                  className="w-full pl-8.5 pr-3 py-1.5 bg-white border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-xs text-slate-800 focus:outline-hidden"
                />
              </div>
            </div>

            {/* List Table items */}
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900 text-slate-100 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                    <th className="py-3 px-5">Colaborador</th>
                    <th className="py-3 px-5">Empresa</th>
                    <th className="py-3 px-5">Perfil</th>
                    <th className="py-3 px-5 text-center">Status</th>
                    <th className="py-3 px-5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {filteredUsers.map((user) => {
                    const isSelf = user.id === currentUser.id;
                    const isActive = user.ativo === 'Sim';

                    return (
                      <tr 
                        key={user.id} 
                        className={`hover:bg-slate-50/70 transition-colors ${editingUserId === user.id ? 'bg-indigo-50/40 font-bold' : ''}`}
                      >
                        {/* Name and Email */}
                        <td className="py-3 px-5">
                          <div className="px-1 py-0.5">
                            <p className="text-xs font-bold text-slate-850 flex items-center">
                              {user.nome}
                              {isSelf && (
                                <span className="ml-1.5 px-1 bg-indigo-100 text-indigo-700 text-[9px] rounded font-bold uppercase tracking-wide">Você</span>
                              )}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.2 select-all font-semibold font-mono">{user.email}</p>
                          </div>
                        </td>

                        {/* Company */}
                        <td className="py-3 px-5 text-xs text-slate-650 font-bold">
                          {user.empresa === 'Radar' ? (
                            <span className="text-indigo-650">Corp. Radar</span>
                          ) : user.empresa === 'Proativa' ? (
                            <span className="text-cyan-500">Corp. Proativa</span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-500 text-white rounded text-[10px] font-bold tracking-wide uppercase">Ambas</span>
                          )}
                        </td>

                        {/* Profile badge */}
                        <td className="py-3 px-5">
                          <span className={`inline-flex px-1.5 py-0.2 rounded text-[10px] font-bold uppercase ${
                            user.perfil === 'Administrador' 
                              ? 'bg-indigo-105 text-indigo-800 border border-indigo-200' 
                              : 'bg-slate-100 text-slate-600 border border-slate-200'
                          }`}>
                            {user.perfil}
                          </span>
                        </td>

                        {/* Status active */}
                        <td className="py-3 px-5 text-center">
                          {isActive ? (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200" title="Ativo">
                              <UserCheck className="h-3 w-3 mr-1" />
                              Ativo
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-800 border border-rose-150" title="Inativo">
                              <UserX className="h-3 w-3 mr-1" />
                              Bloqueado
                            </span>
                          )}
                        </td>

                        {/* Actions click */}
                        <td className="py-3 px-5 text-center flex items-center justify-center gap-2">
                          <button
                            type="button"
                            id={`btn-edit-user-${user.id}`}
                            onClick={() => handleEditClick(user)}
                            className="p-1 px-2.5 border border-slate-200 rounded text-slate-600 hover:text-indigo-650 hover:bg-slate-50 transition-all font-semibold text-[10/5px] uppercase cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5 inline-block" />
                          </button>
                          
                          {!isSelf && (
                            <button
                              type="button"
                              id={`btn-delete-user-${user.id}`}
                              onClick={() => handleDeleteClick(user)}
                              className="p-1 px-2.5 border border-rose-200 rounded text-rose-600 hover:text-white hover:bg-rose-600 transition-all font-semibold text-[10/5px] uppercase cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5 inline-block" />
                            </button>
                          )}
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filteredUsers.length === 0 && (
                <div className="p-8 text-center text-slate-400">
                  Nenhum usuário correspondente à pesquisa foi encontrado.
                </div>
              )}
            </div>

          </div>
        </div>

      </div>



    </div>
  );
}
