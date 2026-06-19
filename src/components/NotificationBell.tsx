import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  Clock, 
  MessageSquare, 
  Plus, 
  CheckCircle,
  X 
} from 'lucide-react';
import { Usuario, Notificacao } from '../types';
import { markAsRead, markAllAsRead, clearNotifications } from '../apiServices';

interface NotificationBellProps {
  currentUser: Usuario;
  notifications: Notificacao[];
  onRefresh: () => void;
  alignEnd?: boolean;
}

export default function NotificationBell({ 
  currentUser, 
  notifications, 
  onRefresh,
  alignEnd = true 
}: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter notifications relevant to the logged-in user
  const userNotifications = notifications.filter(n => {
    if (n.usuario_id) {
      return n.usuario_id === currentUser.id;
    }
    if (currentUser.perfil === 'Solicitante' && n.perfil_alvo === 'Solicitante') {
      return true;
    }
    if ((currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente') && 
        (n.perfil_alvo === 'Administrador' || n.perfil_alvo === 'Atendente')) {
      return true;
    }
    if (n.perfil_alvo === 'Todos') {
      return true;
    }
    return false;
  });

  const unreadCount = userNotifications.filter(n => !n.lida).length;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid closing dropdown if clicking on the notifications itself
    markAsRead(id);
    onRefresh();
  };

  const handleMarkAllAsRead = (e: React.MouseEvent) => {
    e.preventDefault();
    markAllAsRead(currentUser.id, currentUser.perfil);
    onRefresh();
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    clearNotifications(currentUser.id, currentUser.perfil);
    onRefresh();
  };

  // Helper to format real dates nicely
  const formatTimeAgo = (dateStr: string) => {
    const d = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    const diffHrs = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHrs / 24);

    if (isNaN(d.getTime())) return 'Agora mesmo';

    if (diffMin < 1) return 'Agora mesmo';
    if (diffMin < 60) return `Há ${diffMin} min`;
    if (diffHrs < 24) return `Há ${diffHrs} h`;
    if (diffDays === 1) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-500 hover:text-slate-800 focus:outline-hidden transition-all duration-200 cursor-pointer rounded-full hover:bg-slate-100"
        title="Notificações"
      >
        <Bell className="h-5.5 w-5.5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4.5 min-w-4.5 px-1 items-center justify-center rounded-full bg-red-500 text-[10px] font-extrabold text-white animate-bounce shadow-md">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown list */}
      {isOpen && (
        <div 
          className={`absolute z-100 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in ${
            alignEnd ? 'right-0 origin-top-right' : 'left-0 origin-top-left'
          }`}
        >
          {/* Popover Title Header */}
          <div className="bg-indigo-900 text-white px-4 py-3.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="h-4.5 w-4.5 text-amber-400" />
              <h3 className="text-xs font-bold uppercase tracking-wider">Notificações</h3>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-red-600 text-white font-extrabold px-1.5 py-0.5 rounded-full">
                  {unreadCount} novas
                </span>
              )}
            </div>
            
            <div className="flex items-center space-x-1.5">
              {userNotifications.length > 0 && (
                <>
                  <button
                    onClick={handleMarkAllAsRead}
                    className="p-1 text-indigo-200 hover:text-white rounded transition-colors"
                    title="Marcar todas como lidas"
                  >
                    <CheckCheck className="h-4.5 w-4.5" />
                  </button>
                  <button
                    onClick={handleClearAll}
                    className="p-1 text-indigo-200 hover:text-rose-400 rounded transition-colors"
                    title="Limpar notificações"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </button>
                </>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-indigo-200 hover:text-white rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List Content */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {userNotifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="h-8 w-8 mx-auto mb-2.5 text-slate-300 stroke-[1.5]" />
                <p className="text-xs font-medium">Nenhuma notificação encontrada.</p>
                <p className="text-[10px] text-slate-400 mt-0.5">As novidades do DP sobre seus chamados aparecerão aqui.</p>
              </div>
            ) : (
              userNotifications.map((notif) => {
                const isUnread = !notif.lida;
                return (
                  <div 
                    key={notif.id}
                    onClick={(e) => handleMarkAsRead(notif.id, e)}
                    className={`p-4 transition-all hover:bg-slate-50 relative flex items-start space-x-3 cursor-pointer ${
                      isUnread ? 'bg-indigo-50/25 border-l-2 border-indigo-500' : ''
                    }`}
                  >
                    {/* Icon by Type */}
                    <div className="shrink-0 mt-0.5">
                      {notif.tipo === 'abertura' ? (
                        <div className="p-2 bg-amber-50 rounded-lg text-amber-600 border border-amber-100">
                          <Plus className="h-4.5 w-4.5" />
                        </div>
                      ) : notif.tipo === 'resposta' ? (
                        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 border border-indigo-100">
                          <MessageSquare className="h-4.5 w-4.5" />
                        </div>
                      ) : (
                        <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-100">
                          <CheckCircle className="h-4.5 w-4.5" />
                        </div>
                      )}
                    </div>

                    {/* Content text */}
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center justify-between">
                        <span className={`text-[11px] font-bold truncate block ${isUnread ? 'text-indigo-950 font-extrabold' : 'text-slate-800'}`}>
                          {notif.titulo}
                        </span>
                        {isUnread && (
                          <span className="w-1.5 h-1.5 bg-indigo-650 rounded-full shrink-0"></span>
                        )}
                      </div>
                      <p className="text-[11px] leading-snug text-slate-500 mt-1">
                        {notif.mensagem}
                      </p>
                      
                      <div className="flex items-center space-x-2 mt-2 text-[10px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{formatTimeAgo(notif.data_hora)}</span>
                        
                        {notif.protocolo && (
                          <span className="font-mono bg-slate-100 text-slate-500 px-1.5 py-0.2 rounded text-[9px] uppercase tracking-wider font-semibold">
                            {notif.protocolo}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
