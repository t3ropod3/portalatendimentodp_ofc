/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Usuario, Atendimento, HistoricoAtendimento, Notificacao } from './types';
import { getApiUrl } from './apiConfig';

const USERS_KEY = 'dp_chamados_users';
const TICKETS_KEY = 'dp_chamados_tickets';
const HISTORY_KEY = 'dp_chamados_history';
const NOTIFICATIONS_KEY = 'dp_chamados_notifications';

// Default mock users
const DEFAULT_USERS: Usuario[] = [
  {
    id: 'usr-1',
    nome: 'Keit Proativa',
    email: 'keit.proativacc@gmail.com',
    senha: '123',
    perfil: 'Administrador',
    empresa: 'Proativa',
    ativo: 'Sim'
  }
];

// Seed tickets for dashboards and tables
const DEFAULT_TICKETS: Atendimento[] = [];

// History seed
const DEFAULT_HISTORY: HistoricoAtendimento[] = [];

const DEFAULT_NOTIFICATIONS: Notificacao[] = [];

export function initDB() {
  let needSaveUsers = false;
  let users: Usuario[] = [];

  const rawUsers = localStorage.getItem(USERS_KEY);
  if (!rawUsers) {
    users = [...DEFAULT_USERS];
    needSaveUsers = true;
  } else {
    try {
      users = JSON.parse(rawUsers);
      // Migrate any users with old 'Usuário' profile to 'Solicitante'
      users = users.map(u => {
        if ((u.perfil as string) === 'Usuário') {
          needSaveUsers = true;
          return { ...u, perfil: 'Solicitante' };
        }
        return u;
      });

      // Ensure all default users exist
      DEFAULT_USERS.forEach(defU => {
        if (!users.some(u => u.id === defU.id || u.nome.toLowerCase() === defU.nome.toLowerCase())) {
          users.push(defU);
          needSaveUsers = true;
        }
      });
    } catch (e) {
      users = [...DEFAULT_USERS];
      needSaveUsers = true;
    }
  }

  if (needSaveUsers) {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  }

  if (!localStorage.getItem(TICKETS_KEY)) {
    localStorage.setItem(TICKETS_KEY, JSON.stringify(DEFAULT_TICKETS));
  }
  if (!localStorage.getItem(HISTORY_KEY)) {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(DEFAULT_HISTORY));
  }
  if (!localStorage.getItem(NOTIFICATIONS_KEY)) {
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
  }
}

// Users functions
export function getUsers(): Usuario[] {
  initDB();
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveUsers(users: Usuario[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export async function deleteUsuario(id: string) {
  // Sync with Neon database backend first
  const res = await fetch(getApiUrl(`/api/users/${id}`), {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' }
  });
  
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Erro ao deletar usuário");

  const users = getUsers();
  saveUsers(users.filter(u => u.id !== id));                
  return data;
}

export async function createUsuario(user: Omit<Usuario, 'id'>): Promise<Usuario> {
  const users = getUsers();
  const newUser: Usuario = {
    ...user,
    id: `usr-${Date.now()}`
  };

  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/users'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao sincronizar com o banco de dados.");
  }

  // Update local only AFTER DB success
  const insertedUser = await res.json();
  users.push(insertedUser);
  saveUsers(users);

  return insertedUser;
}

export async function updateUsuario(updated: Usuario) {
  // Sync with Neon database backend first
  const res = await fetch(getApiUrl(`/api/users/${updated.id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });
  
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao sincronizar atualização no banco de dados.");
  }

  const users = getUsers();
  const index = users.findIndex(u => u.id === updated.id);
  if (index !== -1) {
    users[index] = await res.json();
    saveUsers(users);
  }
}

// Tickets functions
export function getTickets(): Atendimento[] {
  initDB();
  const raw = localStorage.getItem(TICKETS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveTickets(tickets: Atendimento[]) {
  localStorage.setItem(TICKETS_KEY, JSON.stringify(tickets));
}

// Helper to generate protocol e.g. 20260618-0001
export function generateProtocolCode(): string {
  const tickets = getTickets();
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Find tickets opened today
  const todaysTickets = tickets.filter(t => t.protocolo.startsWith(dateStr));
  let maxSeq = 0;
  todaysTickets.forEach(t => {
    const parts = t.protocolo.split('-');
    if (parts.length === 2) {
      const seq = parseInt(parts[1], 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${dateStr}-${nextSeq}`;
}

export async function createTicket(ticket: Omit<Atendimento, 'id' | 'protocolo' | 'data_abertura' | 'status'>): Promise<Atendimento> {
  const tickets = getTickets();
  const newTicket: Atendimento = {
    ...ticket,
    id: `tk-${Date.now()}`,
    protocolo: generateProtocolCode(),
    data_abertura: new Date().toISOString(),
    status: 'Aberto'
  };

  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/tickets'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTicket)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao salvar chamado no banco de dados.");
  }
  const savedTicket = await res.json();

  // Add initial history
  await addHistoryRecord({
    atendimento_id: savedTicket.id,
    usuario_id: ticket.solicitante_id,
    data_hora: savedTicket.data_abertura,
    acao: 'Abertura de Chamado',
    observacao: `Chamado protocolado sob o nº ${savedTicket.protocolo} por ${getUserNameById(ticket.solicitante_id)}.`
  });

  // Add notification to Admins/Atendentes
  await addNotification({
    perfil_alvo: 'Administrador',
    titulo: 'Novo Chamado Aberto 🔔',
    mensagem: `${getUserNameById(ticket.solicitante_id)} abriu o chamado de Protocolo ${savedTicket.protocolo}: "${savedTicket.assunto}".`,
    protocolo: savedTicket.protocolo,
    tipo: 'abertura'
  });

  // Save locally only after server returns success
  tickets.push(savedTicket);
  saveTickets(tickets);

  return savedTicket;
}

export async function updateTicket(updated: Atendimento): Promise<Atendimento> {
  const tickets = getTickets();
  const index = tickets.findIndex(t => t.id === updated.id);
  if (index === -1) throw new Error("Chamado não encontrado");

  // Sync with Neon database backend
  const res = await fetch(getApiUrl(`/api/tickets/${updated.id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updated)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao atualizar chamado no banco de dados.");
  }
  const savedTicket = await res.json();

  tickets[index] = savedTicket;
  saveTickets(tickets);
  return savedTicket;
}

// History functions
export function getHistory(): HistoricoAtendimento[] {
  initDB();
  const raw = localStorage.getItem(HISTORY_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveHistory(history: HistoricoAtendimento[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

export async function addHistoryRecord(record: Omit<HistoricoAtendimento, 'id'>): Promise<HistoricoAtendimento> {
  const history = getHistory();
  const newRecord: HistoricoAtendimento = {
    ...record,
    id: `hs-${Date.now()}`
  };

  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/history'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newRecord)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao registrar histórico.");
  }
  const savedRecord = await res.json();

  history.push(savedRecord);
  saveHistory(history);
  return savedRecord;
}

// Helper utility function to fetch userName from ID
export function getUserNameById(id: string): string {
  const users = getUsers();
  const u = users.find(user => user.id === id);
  return u ? u.nome : 'Usuário Desconhecido';
}

export function getCompanyById(id: string): string {
  const users = getUsers();
  const u = users.find(user => user.id === id);
  return u ? u.empresa : 'Inexistente';
}

// Notifications functions
export function getNotifications(): Notificacao[] {
  initDB();
  const raw = localStorage.getItem(NOTIFICATIONS_KEY);
  return raw ? JSON.parse(raw) : [];
}

export function saveNotifications(notifications: Notificacao[]) {
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(notifications));
}

export async function addNotification(notif: Omit<Notificacao, 'id' | 'data_hora' | 'lida'>): Promise<Notificacao> {
  const notifications = getNotifications();
  const newNotif: Notificacao = {
    ...notif,
    id: `nt-${Date.now()}`,
    data_hora: new Date().toISOString(),
    lida: false
  };

  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/notifications'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newNotif)
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.error || "Falha ao enviar notificação.");
  }
  const savedNotif = await res.json();

  notifications.unshift(savedNotif);
  saveNotifications(notifications);
  return savedNotif;
}

export async function markAsRead(id: string): Promise<void> {
  const notifications = getNotifications();
  const index = notifications.findIndex(n => n.id === id);
  if (index !== -1) {
    // Sync with Neon database backend
    const res = await fetch(getApiUrl(`/api/notifications/${id}/read`), {
      method: 'PUT'
    });
    if (!res.ok) {
      throw new Error("Falha ao marcar notificação como lida.");
    }
    notifications[index].lida = true;
    saveNotifications(notifications);
  }
}

export async function markAllAsRead(userId: string, perfil: string): Promise<void> {
  const notifications = getNotifications();
  
  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/notifications/mark-all-read'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, perfil })
  });
  if (!res.ok) {
    throw new Error("Falha ao marcar notificações como lidas no servidor.");
  }

  const updated = notifications.map(n => {
    const isUserRecipient = n.usuario_id === userId;
    const isProfileRecipient = n.perfil_alvo === perfil || n.perfil_alvo === 'Todos' || (perfil === 'Administrador' && n.perfil_alvo === 'Atendente') || (perfil === 'Atendente' && n.perfil_alvo === 'Administrador');
    if (isUserRecipient || isProfileRecipient) {
      return { ...n, lida: true };
    }
    return n;
  });
  saveNotifications(updated);
}

export async function clearNotifications(userId: string, perfil: string): Promise<void> {
  const notifications = getNotifications();

  // Sync with Neon database backend
  const res = await fetch(getApiUrl('/api/notifications/clear'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, perfil })
  });
  if (!res.ok) {
    throw new Error("Falha ao limpar notificações no servidor.");
  }

  const filtered = notifications.filter(n => {
    const isUserRecipient = n.usuario_id === userId;
    const isProfileRecipient = n.perfil_alvo === perfil || n.perfil_alvo === 'Todos';
    return !isUserRecipient && !isProfileRecipient;
  });
  saveNotifications(filtered);
}

