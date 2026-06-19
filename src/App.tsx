/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, FormEvent } from 'react';
import { 
  getUsers, 
  getTickets, 
  getHistory, 
  saveTickets, 
  saveHistory, 
  initDB,
  getUserNameById,
  updateUsuario,
  addNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  clearNotifications,
  updateTicket,
  deleteTicket
} from './apiServices';
import { Usuario, Atendimento, HistoricoAtendimento, FilterType, Notificacao } from './types';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import NovoAtendimento from './components/NovoAtendimento';
import Atendimentos from './components/Atendimentos';
import DetalhesAtendimento from './components/DetalhesAtendimento';
import GestaoUsuarios from './components/GestaoUsuarios';
import Opcoes from './components/Opcoes';
import { 
  Briefcase, 
  Lock, 
  User, 
  AlertCircle, 
  LayoutDashboard, 
  PlusCircle, 
  Ticket, 
  Users, 
  Building2,
  LockKeyhole
} from 'lucide-react';

import { getApiUrl } from './apiConfig';

export default function App() {
  const [isSyncing, setIsSyncing] = useState(false);

  const loadDatabaseFromServer = async () => {
    setIsSyncing(true);
    let syncedAny = false;

    try {
      // 1. Try unified fast-sync endpoint for 1-roundtrip speed
      const syncRes = await fetch(getApiUrl('/api/sync-all'));
      if (syncRes.ok) {
        const syncData = await syncRes.json();
        if (syncData.users) {
          localStorage.setItem('dp_chamados_users', JSON.stringify(syncData.users));
        }
        if (syncData.tickets) {
          localStorage.setItem('dp_chamados_tickets', JSON.stringify(syncData.tickets));
        }
        if (syncData.history) {
          localStorage.setItem('dp_chamados_history', JSON.stringify(syncData.history));
        }
        if (syncData.notifications) {
          localStorage.setItem('dp_chamados_notifications', JSON.stringify(syncData.notifications));
        }
        syncedAny = true;
      } else {
        throw new Error("Unified sync endpoint returned non-OK status");
      }
    } catch (syncErr) {
      console.warn("Unified sync endpoint failed. Falling back to fast parallel fetches:", syncErr);
      
      // 2. Fallback to fast parallel fetches so it works under any deploy status
      const urls = {
        users: getApiUrl('/api/users'),
        tickets: getApiUrl('/api/tickets'),
        history: getApiUrl('/api/history'),
        notifications: getApiUrl('/api/notifications')
      };

      try {
        const [uRes, tRes, hRes, nRes] = await Promise.all([
          fetch(urls.users).catch(() => null),
          fetch(urls.tickets).catch(() => null),
          fetch(urls.history).catch(() => null),
          fetch(urls.notifications).catch(() => null)
        ]);

        if (uRes && uRes.ok) {
          const uData = await uRes.json();
          localStorage.setItem('dp_chamados_users', JSON.stringify(uData));
          syncedAny = true;
        }
        if (tRes && tRes.ok) {
          const tData = await tRes.json();
          localStorage.setItem('dp_chamados_tickets', JSON.stringify(tData));
          syncedAny = true;
        }
        if (hRes && hRes.ok) {
          const hData = await hRes.json();
          localStorage.setItem('dp_chamados_history', JSON.stringify(hData));
          syncedAny = true;
        }
        if (nRes && nRes.ok) {
          const nData = await nRes.json();
          localStorage.setItem('dp_chamados_notifications', JSON.stringify(nData));
          syncedAny = true;
        }
      } catch (parallelErr) {
        console.error("Parallel fetch fallback failed:", parallelErr);
      }
    }

    if (syncedAny) {
      refreshDatabase();
    } else {
      console.warn("Neon backend offline or tables unmigrated. Operating with client cache fallback.");
    }
    
    setIsSyncing(false);
  };

  // Database initialization on mount
  useEffect(() => {
    initDB();
    loadDatabaseFromServer();
  }, []);

  // Authentication State
  const [currentUser, setCurrentUser] = useState<Usuario | null>(() => {
    const cached = localStorage.getItem('dp_chamados_session');
    return cached ? JSON.parse(cached) : null;
  });

  // Database States (Refreshed when actions occur)
  const [tickets, setTickets] = useState<Atendimento[]>([]);
  const [users, setUsers] = useState<Usuario[]>([]);
  const [history, setHistory] = useState<HistoricoAtendimento[]>([]);
  const [notifications, setNotifications] = useState<Notificacao[]>([]);

  // Navigation Logic
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedTicket, setSelectedTicket] = useState<Atendimento | null>(null);
  const [atendimentosFilter, setAtendimentosFilter] = useState<FilterType>('all');

  // Load state values
  const refreshDatabase = () => {
    setTickets(getTickets());
    setUsers(getUsers());
    setHistory(getHistory());
    setNotifications(getNotifications());
  };

  useEffect(() => {
    refreshDatabase();
  }, [currentUser, activeTab, selectedTicket]);

  // Auth form states
  const [loginName, setLoginName] = useState('');
  const [loginSenha, setLoginSenha] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Password change states (first access)
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  // Effect to guard first access: if logged-in user still has default password '123'
  useEffect(() => {
    if (currentUser) {
      if (currentUser.mustChangePassword) {
        setMustChangePassword(true);
      } else {
        const allUsers = getUsers();
        const current = allUsers.find(u => u.id === currentUser.id);
        if (current && current.senha === '123') {
          setMustChangePassword(true);
        } else {
          setMustChangePassword(false);
        }
      }
    } else {
      setMustChangePassword(false);
    }
  }, [currentUser]);

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentUser) return;

    const pw = newPassword.trim();
    const cpw = confirmPassword.trim();

    if (pw.length < 4) {
      setPasswordError('Para sua segurança, a nova senha precisa ter pelo menos 4 caracteres.');
      return;
    }

    if (pw === '123') {
      setPasswordError('A nova senha não pode ser "123" (senha padrão inicial).');
      return;
    }

    if (pw !== cpw) {
      setPasswordError('As senhas digitadas não coincidem. Por favor, confirme novamente.');
      return;
    }

    try {
      // Find latest user and update password in db
      const allUsers = getUsers();
      const dbUser = allUsers.find(u => u.id === currentUser.id);
      if (dbUser) {
        const updated = { ...dbUser, senha: pw };
        await updateUsuario(updated);
        
        // Update session state
        const updatedSessionUser = { ...currentUser, mustChangePassword: false };
        setCurrentUser(updatedSessionUser);
        localStorage.setItem('dp_chamados_session', JSON.stringify(updatedSessionUser));
        
        setPasswordSuccess('Senha alterada com sucesso! Redirecionando...');
        
        // Reset local form states
        setNewPassword('');
        setConfirmPassword('');
        
        setTimeout(() => {
          setMustChangePassword(false);
          setPasswordSuccess('');
        }, 1200);
      } else {
        setPasswordError('Erro ao localizar o colaborador ativo no banco de dados.');
      }
    } catch (err) {
      setPasswordError('Houve um erro inesperado ao salvar a nova senha.');
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const response = await fetch(getApiUrl('/api/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: loginName, senha: loginSenha })
      });

      const data = await response.json();

      if (!response.ok) {
        setLoginError(data.error || 'Falha na autenticação.');
        return;
      }

      const user = data.user;
      
      // Success Authentication
      setCurrentUser(user);
      localStorage.setItem('dp_chamados_session', JSON.stringify(user));
      setActiveTab('dashboard');
      setSelectedTicket(null);
    } catch (err) {
      setLoginError('Erro de comunicação com o servidor.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleQuickLogin = (nameStr: string) => {
    setLoginError('');
    const allUsers = getUsers();
    const user = allUsers.find(u => u.nome.toLowerCase() === nameStr.toLowerCase());
    
    if (user && user.ativo === 'Sim') {
      setCurrentUser(user);
      localStorage.setItem('dp_chamados_session', JSON.stringify(user));
      setActiveTab('dashboard');
      setSelectedTicket(null);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('dp_chamados_session');
    setSelectedTicket(null);
    setActiveTab('dashboard');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordSuccess('');
  };

  const handleUpdateTicket = async (updated: Atendimento) => {
    // Fetch previous state of the ticket to compare
    const original = tickets.find(t => t.id === updated.id);

    // 1. Save updated ticket to storage
    await updateTicket(updated);

    // Import dynamic helper to generate notifications
    if (original) {
      const isStatusChanged = original.status !== updated.status;
      const isReplied = original.parecer !== updated.parecer && updated.parecer;
      
      if (isStatusChanged && updated.status === 'Encerrado') {
        if (currentUser && currentUser.id === updated.solicitante_id) {
          // Standard user closed their own ticket
          await addNotification({
            perfil_alvo: 'Administrador',
            titulo: 'Chamado Encerrado pelo Solicitante 👋',
            mensagem: `O solicitante ${currentUser.nome} encerrou o chamado de Protocolo ${updated.protocolo}: "${updated.assunto}".`,
            protocolo: updated.protocolo,
            tipo: 'encerramento'
          });
        } else {
          // DP closed the ticket
          await addNotification({
            usuario_id: updated.solicitante_id,
            titulo: 'Chamado Encerrado ✅',
            mensagem: `Seu chamado de Protocolo ${updated.protocolo} ("${updated.assunto}") foi encerrado pelo Departamento Pessoal.`,
            protocolo: updated.protocolo,
            tipo: 'encerramento'
          });
        }
      } else if (isReplied || (isStatusChanged && updated.status === 'Em Atendimento')) {
        const notifierName = currentUser ? currentUser.nome : 'DP';
        await addNotification({
          usuario_id: updated.solicitante_id,
          titulo: updated.status === 'Em Atendimento' ? 'Chamado em Atendimento ⚡' : 'Novo Parecer Registrado 📝',
          mensagem: updated.status === 'Em Atendimento'
            ? `Seu chamado de Protocolo ${updated.protocolo} ("${updated.assunto}") agora está em atendimento ativo pela equipe de DP.`
            : `Um novo parecer técnico foi registrado no chamado de Protocolo ${updated.protocolo} ("${updated.assunto}") por ${notifierName}.`,
          protocolo: updated.protocolo,
          tipo: 'resposta'
        });
      }
    }

    // 2. Sync to State
    refreshDatabase();
    
    // 3. Keep selected card synchronized
    setSelectedTicket(updated);
  };

  const handleDeleteTicket = async (ticketId: string) => {
    await deleteTicket(ticketId);
    refreshDatabase();
    setSelectedTicket(null);
  };

  const handleSelectTicketFromNew = (protocol: string) => {
    // Sync local state first
    refreshDatabase();
    
    // Navigate list instantly
    setActiveTab('atendimentos');
    setSelectedTicket(null);
  };

  return (
    <>
      {!currentUser ? (
        // LOGIN PAGE
        <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
          
          {/* Subtle atmospheric ambient glow */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[100px]"></div>

          <div className="max-w-md w-full space-y-6 z-10 animate-fade-in">
            
            {/* Visual Head Brand Logo */}
            <div className="text-center flex flex-col items-center">
              <div className="mb-6">
                {/* O usuário deve fazer upload da imagem logo.png para a pasta public */}
                <img 
                  src="/logo.png" 
                  alt="Proativa Contact Center" 
                  className="h-28 w-auto object-contain"
                  onError={(e) => {
                    // Fallback visual temporário até o usuário subir o logo.png
                    e.currentTarget.style.display = 'none';
                    const icon = document.getElementById('fallback-icon');
                    if(icon) icon.style.display = 'flex';
                  }}
                />
                <div id="fallback-icon" className="hidden items-center justify-center p-3 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-650/20 border border-indigo-500">
                  <Briefcase className="h-8 w-8 text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Painel Departamento Pessoal</h1>
              <p className="text-xs text-indigo-150 mt-1.5">Portal Unificado de Atendimentos & Gestão de Demandas</p>
            </div>

            {/* Login Card */}
            <div className="bg-indigo-900 border border-indigo-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                
                <h2 className="text-sm font-bold text-white uppercase tracking-widest text-center border-b border-indigo-800 pb-4">
                  Acesso Restrito
                </h2>

                {loginError && (
                  <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs font-semibold rounded-lg flex items-start space-x-2.5">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-450 shrink-0 mt-0.5" />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLogin} className="space-y-4">
                  
                  {/* Username/Name field */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Login (Nome ou E-mail)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300">
                        <User className="h-4 w-4" />
                      </div>
                      <input
                        type="text"
                        id="login-username"
                        value={loginName}
                        onChange={(e) => setLoginName(e.target.value)}
                        placeholder="Ex: keit@proativa.com ou Keit Proativa"
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950/70 border border-indigo-800 focus:border-indigo-500 rounded-lg text-sm text-slate-200 placeholder-indigo-300/40 focus:outline-hidden transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Password field */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-indigo-200 uppercase tracking-wider block">Senha de Acesso</label>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        id="login-password"
                        value={loginSenha}
                        onChange={(e) => setLoginSenha(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950/70 border border-indigo-800 focus:border-indigo-500 rounded-lg text-sm text-slate-200 placeholder-indigo-300/40 focus:outline-hidden transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Submit entry button */}
                  <button
                    type="submit"
                    id="login-btn-submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center space-x-2"
                  >
                    <LockKeyhole className="h-4 w-4 shrink-0" />
                    <span>Entrar no Sistema</span>
                  </button>

                </form>

              </div>

              {/* Removed Quick Access Shortcuts */}
              <div className="p-1 text-center"></div>

            </div>

            {/* General footer */}
            <p className="text-center text-[10px] text-indigo-300 font-medium font-sans">
              2026 - Desenvolvido por Recursos Humanos - Keit Lima
            </p>

          </div>
        </div>
      ) : mustChangePassword ? (
        // TELA DE TROCA DE SENHA OBRIGATÓRIA (PRIMEIRO ACESSO)
        <div className="min-h-screen bg-indigo-950 flex flex-col items-center justify-center p-4 font-sans relative overflow-hidden">
          
          {/* Atmosfera visual */}
          <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600/20 blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-cyan-600/20 blur-[100px]"></div>

          <div className="max-w-md w-full space-y-6 z-10 animate-fade-in">
            
            {/* Logo */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center p-3 bg-indigo-650 text-white rounded-2xl shadow-xl shadow-indigo-650/20 mb-3 border border-indigo-500">
                <Lock className="h-8 w-8 text-white animate-pulse" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Primeiro Acesso</h1>
              <p className="text-xs text-indigo-150 mt-1.5">Olá, <span className="text-amber-400 font-bold">{currentUser?.nome}</span>! Para sua segurança, você precisa alterar sua senha padrão inicial (123).</p>
            </div>

            {/* Card de Troca de Senha */}
            <div className="bg-indigo-900 border border-indigo-800 rounded-2xl shadow-2xl overflow-hidden">
              <div className="p-8 space-y-6">
                
                <h2 className="text-sm font-bold text-white uppercase tracking-widest text-center border-b border-indigo-800 pb-4">
                  Definição de Nova Senha
                </h2>

                {passwordError && (
                  <div className="p-3.5 bg-rose-950/40 border border-rose-900/50 text-rose-300 text-xs font-semibold rounded-lg flex items-start space-x-2.5">
                    <AlertCircle className="h-4.5 w-4.5 text-rose-450 shrink-0 mt-0.5" />
                    <span>{passwordError}</span>
                  </div>
                )}

                {passwordSuccess && (
                  <div className="p-3.5 bg-emerald-950/40 border border-emerald-900/50 text-emerald-300 text-xs font-semibold rounded-lg flex items-start space-x-2.5 animate-pulse">
                    <AlertCircle className="h-4.5 w-4.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
                  
                  {/* Requisitos de segurança */}
                  <div className="text-[11px] text-indigo-200 bg-indigo-950/40 p-3.5 border border-indigo-800 rounded-lg">
                    <span className="font-bold text-indigo-100 block mb-1">💡 Regras para Nova Senha:</span>
                    <ul className="list-disc list-inside space-y-0.5 text-indigo-300 text-[10px]">
                      <li>Mínimo de <span className="font-bold text-white">4 caracteres</span></li>
                      <li>Não pode ser a senha padrão <span className="font-bold text-white">&quot;123&quot;</span></li>
                    </ul>
                  </div>

                  {/* Nova Senha */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-250 uppercase tracking-wider block">Nova Senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Mínimo 4 caracteres"
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950/70 border border-indigo-800 focus:border-indigo-500 rounded-lg text-sm text-slate-200 placeholder-indigo-300/40 focus:outline-hidden transition-colors"
                        required
                        autoFocus
                      />
                    </div>
                  </div>

                  {/* Confirmar Nova Senha */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-indigo-250 uppercase tracking-wider block">Confirmar Nova Senha</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-indigo-300">
                        <Lock className="h-4 w-4" />
                      </div>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Repita a senha digitada"
                        className="w-full pl-9 pr-3 py-2.5 bg-indigo-950/70 border border-indigo-800 focus:border-indigo-500 rounded-lg text-sm text-slate-200 placeholder-indigo-300/40 focus:outline-hidden transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {/* Botão de Envio */}
                  <button
                    type="submit"
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-md shadow-amber-500/10 flex items-center justify-center space-x-2"
                  >
                    <span>Salvar Nova Senha e Acessar</span>
                  </button>

                  {/* Botão de Cancelar/Sair */}
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full py-2 bg-transparent hover:bg-indigo-800/40 text-indigo-300 hover:text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer flex items-center justify-center space-x-2 border border-transparent hover:border-indigo-800"
                  >
                    <span>Voltar ao Login (Sair)</span>
                  </button>

                </form>

              </div>
            </div>

            {/* Rodapé */}
            <p className="text-center text-[10px] text-indigo-400 font-medium">
              2026 - Desenvolvido por Recursos Humanos - Keit Lima
            </p>

          </div>
        </div>
      ) : (
        // PORTAL LAYOUT WRAPPER containing internal tabs
        <Layout 
          currentUser={currentUser} 
          onLogout={handleLogout}
          activeTab={activeTab}
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setSelectedTicket(null); // Clear selected item on tab change for safety
          }}
          notifications={notifications}
          onRefreshNotifications={refreshDatabase}
        >
          {/* TAB ROUTING AND SUBDETAILS MODES */}
          {activeTab === 'dashboard' && (
            <Dashboard 
              tickets={tickets} 
              users={users} 
              onSelectMetricCard={(filter) => {
                setAtendimentosFilter(filter);
                setActiveTab('atendimentos');
                setSelectedTicket(null);
              }}
            />
          )}

          {activeTab === 'novo' && (
            <NovoAtendimento 
              currentUser={currentUser}
              onSuccess={handleSelectTicketFromNew}
            />
          )}

          {activeTab === 'atendimentos' && (
            selectedTicket ? (
              <DetalhesAtendimento 
                currentUser={currentUser}
                ticket={selectedTicket}
                onBack={() => setSelectedTicket(null)}
                onUpdateTicket={handleUpdateTicket}
                history={history}
                onDeleteTicket={handleDeleteTicket}
              />
            ) : (
              <Atendimentos 
                currentUser={currentUser}
                tickets={tickets}
                users={users}
                onSelectTicket={(tk) => setSelectedTicket(tk)}
                activeFilter={atendimentosFilter}
                setActiveFilter={setAtendimentosFilter}
              />
            )
          )}

          {activeTab === 'usuarios' && currentUser.perfil === 'Administrador' && (
            <GestaoUsuarios 
              currentUser={currentUser}
              users={users}
              onUpdateUsers={refreshDatabase}
              onForceSync={loadDatabaseFromServer}
              isSyncing={isSyncing}
            />
          )}

          {activeTab === 'opcoes' && currentUser.perfil === 'Administrador' && (
            <Opcoes />
          )}

          {/* User security wall guard */}
          {activeTab === 'usuarios' && currentUser.perfil !== 'Administrador' && (
            <div className="p-8 text-center bg-white border border-slate-200 rounded-xl space-y-4 max-w-md mx-auto my-12 shadow-sm">
              <div className="w-12 h-12 bg-rose-50 border border-rose-200 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6 animate-pulse-slow" />
              </div>
              <h4 className="text-base font-bold text-slate-900">Acesso Negado</h4>
              <p className="text-xs text-slate-500">Sua conta de nível operacional &quot;Usuário&quot; não possui permissão para acessar o painel de administração corporativa.</p>
              <button 
                onClick={() => setActiveTab('dashboard')}
                className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                Voltar ao Dashboard
              </button>
            </div>
          )}

        </Layout>
      )}
    </>
  );
}
