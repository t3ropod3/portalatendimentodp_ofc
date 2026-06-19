/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  Building2, 
  Calendar, 
  User, 
  Clock, 
  ArrowRight,
  Inbox,
  AlertCircle,
  HelpCircle,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';
import { Atendimento, Usuario, FilterType } from '../types';
import { getUserNameById } from '../dbMock';

interface AtendimentosProps {
  currentUser: Usuario;
  tickets: Atendimento[];
  onSelectTicket: (ticket: Atendimento) => void;
  users: Usuario[];
  activeFilter: FilterType;
  setActiveFilter: (filter: FilterType) => void;
}

export default function Atendimentos({ 
  currentUser, 
  tickets, 
  onSelectTicket, 
  users,
  activeFilter,
  setActiveFilter
}: AtendimentosProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'abertura_desc' | 'abertura_asc' | 'necessaria_desc'>('abertura_desc');

  // Compute tickets accessible for count badges dynamically
  const ticketsForCounts = useMemo(() => {
    if (currentUser.perfil === 'Solicitante') {
      return tickets.filter(t => t.solicitante_id === currentUser.id);
    }
    return tickets;
  }, [tickets, currentUser]);

  // Filter & Search Logic
  const filteredTickets = useMemo(() => {
    let list = [...tickets];

    // 1. Role-based visibility restriction
    if (currentUser.perfil === 'Solicitante') {
      // Solicitante can ONLY see their own tickets
      list = list.filter(ticket => ticket.solicitante_id === currentUser.id);
    }

    // 2. Active filter selection
    switch (activeFilter) {
      case 'open':
        list = list.filter(t => t.status === 'Aberto');
        break;
      case 'inprogress':
        list = list.filter(t => t.status === 'Em Atendimento');
        break;
      case 'closed':
        list = list.filter(t => t.status === 'Encerrado');
        break;
      case 'radar':
        list = list.filter(t => t.empresa === 'Radar');
        break;
      case 'proativa':
        list = list.filter(t => t.empresa === 'Proativa');
        break;
      case 'my-tickets':
        list = list.filter(t => t.solicitante_id === currentUser.id);
        break;
      case 'all':
      default:
        break;
    }

    // 3. Search query parsing (Search by Protocol or Subject)
    if (searchTerm.trim()) {
      const query = searchTerm.toLowerCase().trim();
      list = list.filter(t => 
        t.protocolo.toLowerCase().includes(query) || 
        t.assunto.toLowerCase().includes(query) ||
        t.solicitacao.toLowerCase().includes(query) ||
        t.descricao.toLowerCase().includes(query)
      );
    }

    // 4. Sort Ordering
    list.sort((a, b) => {
      if (sortBy === 'abertura_desc') {
        return new Date(b.data_abertura).getTime() - new Date(a.data_abertura).getTime();
      }
      if (sortBy === 'abertura_asc') {
        return new Date(a.data_abertura).getTime() - new Date(b.data_abertura).getTime();
      }
      if (sortBy === 'necessaria_desc') {
        return new Date(a.data_necessaria).getTime() - new Date(b.data_necessaria).getTime();
      }
      return 0;
    });

    return list;
  }, [tickets, currentUser, activeFilter, searchTerm, sortBy]);

  // Status Badge Creator
  const renderStatusBadge = (status: Atendimento['status']) => {
    switch (status) {
      case 'Aberto':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1 px-1 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
            Aberto
          </span>
        );
      case 'Em Atendimento':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-blue-50 text-blue-800 border border-blue-200">
            <span className="w-1 px-1 h-1.5 rounded-full bg-blue-500 mr-1.5"></span>
            Em Atendimento
          </span>
        );
      case 'Encerrado':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <span className="w-1 px-1 h-1.5 rounded-full bg-emerald-500 mr-1.5"></span>
            Encerrado
          </span>
        );
      default:
        return null;
    }
  };

  const renderCompanyBadge = (empresa: Atendimento['empresa']) => {
    return empresa === 'Radar' ? (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-150">
        Radar
      </span>
    ) : (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-cyan-50 text-cyan-705 border border-cyan-155">
        Proativa
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        
        {/* Search, order and quick info */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          
          {/* Search bar */}
          <div className="relative w-full md:max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="h-4 w-4" />
            </div>
            <input
              type="text"
              id="search-tickets-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar por protocolo, assunto, termo..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-sm text-slate-800 focus:outline-hidden transition-all"
            />
          </div>

          {/* Sort selection */}
          <div className="flex items-center space-x-2.5 w-full md:w-auto justify-end">
            <span className="text-xs font-semibold text-slate-500 uppercase">Ordenação:</span>
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-55/60 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 py-1.5 px-3 focus:outline-hidden cursor-pointer hover:bg-slate-100"
            >
              <option value="abertura_desc">Abertura recente</option>
              <option value="abertura_asc">Abertura antiga</option>
              <option value="necessaria_desc">Prazo urgente</option>
            </select>
          </div>

        </div>

        {/* Filters Tabs row */}
        <div className="border-t border-slate-100 pt-4 flex flex-wrap gap-2">
          
          {/* All Filter */}
          <button
            id="filter-btn-all"
            onClick={() => setActiveFilter('all')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'all'
                ? 'bg-indigo-900 border-indigo-900 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Todos ({ticketsForCounts.length})
          </button>

          {/* Open Filter */}
          <button
            id="filter-btn-open"
            onClick={() => setActiveFilter('open')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'open'
                ? 'bg-amber-500 border-amber-500 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Abertos ({ticketsForCounts.filter(t => t.status === 'Aberto').length})
          </button>

          {/* In Atendimento */}
          <button
            id="filter-btn-inprogress"
            onClick={() => setActiveFilter('inprogress')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'inprogress'
                ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Em Atendimento ({ticketsForCounts.filter(t => t.status === 'Em Atendimento').length})
          </button>

          {/* Closed Filter */}
          <button
            id="filter-btn-closed"
            onClick={() => setActiveFilter('closed')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'closed'
                ? 'bg-emerald-600 border-emerald-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Encerrados ({ticketsForCounts.filter(t => t.status === 'Encerrado').length})
          </button>

          {/* Company: Radar */}
          <button
            id="filter-btn-radar"
            onClick={() => setActiveFilter('radar')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'radar'
                ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Radar ({ticketsForCounts.filter(t => t.empresa === 'Radar').length})
          </button>

          {/* Company: Proativa */}
          <button
            id="filter-btn-proativa"
            onClick={() => setActiveFilter('proativa')}
            className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border transition-all ${
              activeFilter === 'proativa'
                ? 'bg-cyan-500 border-cyan-500 text-white shadow-xs'
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Proativa ({ticketsForCounts.filter(t => t.empresa === 'Proativa').length})
          </button>

          {/* My Tickets Filter */}
          {(currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente' || currentUser.perfil === 'Solicitante') && (
            <button
              id="filter-btn-my-tickets"
              onClick={() => setActiveFilter('my-tickets')}
              className={`cursor-pointer px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider border ml-auto transition-all ${
                activeFilter === 'my-tickets'
                  ? 'bg-indigo-600 border-indigo-650 text-white shadow-xs'
                  : 'bg-white border-indigo-200 text-indigo-700 hover:bg-indigo-50/60'
              }`}
            >
              Minhas Solicitações ({tickets.filter(t => t.solicitante_id === currentUser.id).length})
            </button>
          )}

        </div>

      </div>

      {/* TICKETS LIST CONTAINER */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        
        {/* DESKTOP TABLE VIEW */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-indigo-900 text-indigo-100 text-[10px] font-bold uppercase tracking-wider border-b border-indigo-805">
                <th className="py-4 px-6">Protocolo</th>
                <th className="py-4 px-6">Assunto / Categoria</th>
                <th className="py-4 px-6 text-center">Empresa</th>
                <th className="py-4 px-6">Solicitante</th>
                <th className="py-4 px-6">Abertura</th>
                <th className="py-4 px-6">Necessária</th>
                <th className="py-4 px-6">Responsável</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-150">
              {filteredTickets.map((ticket) => {
                const solicitanteName = getUserNameById(ticket.solicitante_id);
                const responsavelName = ticket.responsavel_id ? getUserNameById(ticket.responsavel_id) : '--';
                
                return (
                  <tr 
                    key={ticket.id}
                    onClick={() => onSelectTicket(ticket)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    {/* Protocol */}
                    <td className="py-4 px-6 font-mono font-bold text-xs text-indigo-600 tracking-wider">
                      {ticket.protocolo}
                    </td>
                    
                    {/* Subject */}
                    <td className="py-4 px-6 max-w-sm">
                      <p className="text-sm font-bold text-slate-850 truncate group-hover:text-indigo-600 transition-colors">{ticket.assunto}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">{ticket.solicitacao}</p>
                    </td>
                    
                    {/* Company */}
                    <td className="py-4 px-6 text-center">
                      {renderCompanyBadge(ticket.empresa)}
                    </td>

                    {/* Solicitante */}
                    <td className="py-4 px-6 text-xs text-slate-650 font-semibold truncate max-w-[120px]">
                      {solicitanteName}
                    </td>

                    {/* Data Abertura */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      {new Date(ticket.data_abertura).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Data Necessaria */}
                    <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                      {new Date(ticket.data_necessaria + 'T00:00:00').toLocaleDateString('pt-BR')}
                    </td>

                    {/* Responsavel */}
                    <td className="py-4 px-6 text-xs text-slate-600 font-semibold truncate max-w-[120px]">
                      {responsavelName}
                    </td>

                    {/* Status badge */}
                    <td className="py-4 px-6 text-center">
                      {renderStatusBadge(ticket.status)}
                    </td>

                    {/* Actions button */}
                    <td className="py-4 px-6 text-center">
                      <span className="inline-flex items-center justify-center p-1.5 rounded-full bg-slate-100 text-slate-500 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="block md:hidden divide-y divide-slate-150">
          {filteredTickets.map((ticket) => {
            const solicitanteName = getUserNameById(ticket.solicitante_id);
            const responsavelName = ticket.responsavel_id ? getUserNameById(ticket.responsavel_id) : '--';
            
            return (
              <div 
                key={ticket.id}
                onClick={() => onSelectTicket(ticket)}
                className="p-5 hover:bg-slate-50 transition-colors active:bg-slate-100 cursor-pointer"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-mono font-bold text-xs text-indigo-600 tracking-wider">
                    {ticket.protocolo}
                  </span>
                  {renderStatusBadge(ticket.status)}
                </div>

                <h5 className="font-bold text-slate-900 text-sm mb-1">{ticket.assunto}</h5>
                <p className="text-xs text-slate-400 mb-3">{ticket.solicitacao}</p>

                <div className="grid grid-cols-2 gap-y-2 mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    <span>{renderCompanyBadge(ticket.empresa)}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <User className="h-3.5 w-3.5 text-slate-400 animate-pulse-slow" />
                    <span className="truncate max-w-[110px] font-semibold">{solicitanteName}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Abertura: <strong>{new Date(ticket.data_abertura).toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                  <div className="flex items-center space-x-1.5 flex-wrap">
                    <Clock className="h-3.5 w-3.5 text-slate-400" />
                    <span>Precisa: <strong>{new Date(ticket.data_necessaria + 'T00:00:00').toLocaleDateString('pt-BR')}</strong></span>
                  </div>
                </div>

                {responsavelName !== '--' && (
                  <div className="mt-3 text-xs bg-slate-50 px-2.5 py-1 rounded inline-flex items-center space-x-1.5 text-slate-650 font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block"></span>
                    <span>Tutor: {responsavelName}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* EMPTY STATE */}
        {filteredTickets.length === 0 && (
          <div className="p-12 text-center text-slate-705">
            <Inbox className="h-10 w-10 text-slate-300 mx-auto mb-3" />
            <h5 className="font-bold text-slate-800 text-base">Nenhuma solicitação encontrada</h5>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Experimente ajustar os termos de pesquisa ou remover os filtros para obter resultados.' 
                : 'Não há novos chamados na categoria ou perfil selecionado no momento.'}
            </p>
          </div>
        )}

      </div>

    </div>
  );
}
