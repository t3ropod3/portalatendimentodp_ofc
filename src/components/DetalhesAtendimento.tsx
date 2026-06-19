/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  ArrowLeft, 
  Clock, 
  Building2, 
  User, 
  Calendar, 
  FileText, 
  Paperclip, 
  MessageSquare, 
  CheckCircle, 
  Save, 
  XSquare, 
  ChevronRight, 
  Download,
  AlertCircle,
  Clock3
} from 'lucide-react';
import { Atendimento, Usuario, HistoricoAtendimento, Anexo } from '../types';
import { getUsers, addHistoryRecord, getUserNameById } from '../apiServices';

interface DetalhesAtendimentoProps {
  currentUser: Usuario;
  ticket: Atendimento;
  onBack: () => void;
  onUpdateTicket: (updated: Atendimento) => void;
  history: HistoricoAtendimento[];
}

export default function DetalhesAtendimento({ 
  currentUser, 
  ticket, 
  onBack, 
  onUpdateTicket,
  history 
}: DetalhesAtendimentoProps) {
  const [parecer, setParecer] = useState(ticket.parecer || '');
  const [responsavelId, setResponsavelId] = useState(ticket.responsavel_id || ((currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente') ? currentUser.id : ''));
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Get active handlers (Administradores/Atendentes) list for allocation
  const admins = useMemo(() => {
    return getUsers().filter(u => (u.perfil === 'Administrador' || u.perfil === 'Atendente') && u.ativo === 'Sim');
  }, []);

  // Filter histories associated with this ticket
  const ticketHistory = useMemo(() => {
    return history
      .filter(h => h.atendimento_id === ticket.id)
      .sort((a, b) => new Date(a.data_hora).getTime() - new Date(b.data_hora).getTime());
  }, [history, ticket.id]);

  const handleSaveAtendimento = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    const isHandler = currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente';
    if (!isHandler) {
      setErrorMsg('Somente atendentes e administradores podem salvar pareceres de atendimento.');
      return;
    }

    try {
      const isFirstAssignment = !ticket.responsavel_id && responsavelId;
      const originalStatus = ticket.status;
      
      // Auto upgrade status to "Em Atendimento" if it was "Aberto" and we are replying/assigning
      const nextStatus = originalStatus === 'Aberto' ? 'Em Atendimento' : originalStatus;

      const updatedTicket: Atendimento = {
        ...ticket,
        responsavel_id: responsavelId || undefined,
        parecer: parecer,
        data_retorno: new Date().toISOString(),
        status: nextStatus
      };

      await onUpdateTicket(updatedTicket);

      // Log histories
      let logAction = 'Atualização de Atendimento';
      let logObs = `Administrador ${currentUser.nome} atualizou o parecer.`;

      if (isFirstAssignment) {
        logAction = 'Atribuição de Responsável';
        logObs = `Chamado atribuído a ${getUserNameById(responsavelId)} por ${currentUser.nome}.`;
      } else if (originalStatus === 'Aberto' && nextStatus === 'Em Atendimento') {
        logAction = 'Início do Atendimento';
        logObs = `Chamado assumido por ${getUserNameById(responsavelId)}. Status alterado para Em Atendimento.`;
      }

      await addHistoryRecord({
        atendimento_id: ticket.id,
        usuario_id: currentUser.id,
        data_hora: new Date().toISOString(),
        acao: logAction,
        observacao: logObs
      });

      setSuccessMsg('Atendimento salvo com sucesso!');
    } catch (err: any) {
      setErrorMsg('Falha ao salvar atendimento: ' + err.message);
    }
  };

  const handleEncerrarAtendimento = async () => {
    setSuccessMsg('');
    setErrorMsg('');

    // Permission check:
    // - Handler (Admin or Atendente) can close any ticket
    // - Solicitante can close their OWN ticket
    const isHandler = currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente';
    const isOwner = ticket.solicitante_id === currentUser.id;

    if (!isHandler && !isOwner) {
      setErrorMsg('Você não possui permissão para encerrar esta solicitação.');
      return;
    }

    if (isHandler && !parecer.trim()) {
      setErrorMsg('A descrição do parecer/resposta final do DP é obrigatória antes de encerrar.');
      return;
    }

    try {
      const now = new Date().toISOString();
      const updatedTicket: Atendimento = {
        ...ticket,
        status: 'Encerrado',
        responsavel_id: responsavelId || (isHandler ? currentUser.id : ticket.responsavel_id),
        parecer: isHandler ? parecer : (ticket.parecer || 'Chamado finalizado pelo próprio solicitante.'),
        data_retorno: now,
        data_encerramento: now
      };

      await onUpdateTicket(updatedTicket);

      await addHistoryRecord({
        atendimento_id: ticket.id,
        usuario_id: currentUser.id,
        data_hora: now,
        acao: 'Encerramento de Chamado',
        observacao: isHandler 
          ? `Chamado finalizado e encerrado pelo DP (${currentUser.nome}). Razão: Atendido.` 
          : `Chamado finalizado e cancelado pelo próprio solicitante (${currentUser.nome}).`
      });

      setSuccessMsg('O chamado foi encerrado com sucesso!');
    } catch (err: any) {
      setErrorMsg('Erro ao encerrar atendimento: ' + err.message);
    }
  };

  const solicitanteName = getUserNameById(ticket.solicitante_id);
  const responsavelName = ticket.responsavel_id ? getUserNameById(ticket.responsavel_id) : 'Aguardando atribuição';

  // Format status badge inline helper
  const renderStatusBadge = (status: Atendimento['status']) => {
    switch (status) {
      case 'Aberto':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-amber-50 text-amber-800 border border-amber-200">
            Aberto
          </span>
        );
      case 'Em Atendimento':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-indigo-50 text-indigo-700 border border-indigo-200">
            Em Atendimento
          </span>
        );
      case 'Encerrado':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            Encerrado
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      
      {/* Visual top bar header with back btn */}
      <div className="flex items-center justify-between">
        <button
          id="btn-back-to-list"
          onClick={onBack}
          className="cursor-pointer inline-flex items-center px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold uppercase rounded-lg transition-colors shadow-xs"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar para Lista
        </button>
        <div className="flex items-center space-x-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">Status Atual:</span>
          {renderStatusBadge(ticket.status)}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* LEFT TWO COLUMNS: DETAILS */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Main Details Card */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            
            {/* Ticket Subject Header */}
            <div className="bg-indigo-900 text-white px-6 py-5 border-b border-indigo-950">
              <span className="text-[10px] bg-amber-500 text-white font-bold tracking-widest uppercase px-2.5 py-1 rounded-md shadow-sm">
                Protocolo: {ticket.protocolo}
              </span>
              <h3 className="text-lg font-bold mt-2 tracking-tight">{ticket.assunto}</h3>
              <p className="text-xs text-indigo-200 mt-1">{ticket.solicitacao}</p>
            </div>

            {/* Ticket details body */}
            <div className="p-6 space-y-6">
              
              {/* Information Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-5 border-b border-slate-100 text-xs font-medium text-slate-600">
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Solicitante</span>
                  <span className="text-slate-800 font-bold block truncate">{solicitanteName}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Empresa</span>
                  <span className="text-slate-800 font-bold block">
                    {ticket.empresa === 'Radar' ? 'Radar' : 'Proativa'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Abertura</span>
                  <span className="text-slate-800 font-bold block">
                    {new Date(ticket.data_abertura).toLocaleDateString('pt-BR')} {new Date(ticket.data_abertura).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] uppercase block">Data Necessária</span>
                  <span className="text-rose-600 font-bold block">
                    {new Date(ticket.data_necessaria + 'T00:00:00').toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>

              {/* Description box */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descrição do Chamado</h4>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
                  {ticket.descricao}
                </div>
              </div>

              {/* Attachments Section */}
              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
                  <Paperclip className="h-4 w-4 mr-1.5 text-slate-400" />
                  Arquivos Anexados ({ticket.anexos?.length || 0})
                </h4>

                {ticket.anexos && ticket.anexos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ticket.anexos.map((anexo, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 hover:bg-slate-150/55 rounded-lg border border-slate-200 transition-colors">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-700 truncate max-w-[170px]">{anexo.name}</p>
                            <p className="text-[10px] text-slate-400">{anexo.size}</p>
                          </div>
                        </div>
                        {/* Interactive download linkage if data is valid */}
                        <a
                          href={anexo.data}
                          download={anexo.name}
                          onClick={(e) => {
                            if (!anexo.data.startsWith('data:')) {
                              e.preventDefault();
                              alert('Esse anexo não possui dados estáticos armazenados adequadamente para download.');
                            }
                          }}
                          className="p-1.5 bg-white hover:bg-indigo-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-md transition-colors"
                          title="Fazer Download"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhum anexo enviado com esta solicitação.</p>
                )}
              </div>

            </div>

          </div>

          {/* RESPONSE / ATENDIMENTO AREA */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-6 py-4 bg-slate-50 flex items-center justify-between">
              <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
                <MessageSquare className="h-4 w-4 mr-2 text-indigo-600" />
                Área de Retorno / Atendimento (DP)
              </h4>
              <span className="text-xs text-slate-400">Responsabilidade do DP</span>
            </div>

            <div className="p-6">
              {successMsg && (
                <div className="p-4 mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg flex items-center space-x-2.5">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>{successMsg}</span>
                </div>
              )}

              {errorMsg && (
                <div className="p-4 mb-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg flex items-center space-x-2.5">
                  <AlertCircle className="h-4 w-4 text-rose-600" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {(currentUser.perfil === 'Administrador' || currentUser.perfil === 'Atendente') ? (
                // ADMIN AND ATENDENTE RESPONSE FORM
                <form onSubmit={handleSaveAtendimento} className="space-y-4">
                  
                  {ticket.status === 'Encerrado' ? (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-4">
                      <div className="flex items-center space-x-2 text-indigo-800 text-sm font-bold">
                        <CheckCircle className="h-5 w-5 text-indigo-600" />
                        <span>Chamado Encerrado</span>
                      </div>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p><strong>Responsável:</strong> {responsavelName}</p>
                        {ticket.data_retorno && <p><strong>Data de Retorno:</strong> {new Date(ticket.data_retorno).toLocaleDateString('pt-BR')} {new Date(ticket.data_retorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
                        {ticket.data_encerramento && <p><strong>Data do Fim:</strong> {new Date(ticket.data_encerramento).toLocaleDateString('pt-BR')} {new Date(ticket.data_encerramento).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>}
                      </div>
                      <div className="p-3 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
                        <strong>Resposta/Parecer final do DP:</strong><br/>
                        {ticket.parecer || '(Nenhum parecer digitado)'}
                      </div>
                      <p className="text-[10px] text-slate-400 italic">Chamados fechados estão em modo leitura.</p>
                    </div>
                  ) : (
                    <>
                      {/* Select responsible administrator */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Responsável pelo Atendimento *</label>
                          <select
                            value={responsavelId}
                            onChange={(e) => setResponsavelId(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 py-2.5 px-3 focus:outline-hidden cursor-pointer"
                            required
                          >
                            <option value="">-- Escolher Responsável --</option>
                            {admins.map((adm) => (
                              <option key={adm.id} value={adm.id}>
                                {adm.nome} ({adm.empresa})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Data de Retorno</label>
                          <div className="bg-slate-100 text-slate-500 rounded-xl text-xs font-bold py-2.5 px-3 border border-slate-200">
                            {ticket.data_retorno 
                              ? `${new Date(ticket.data_retorno).toLocaleDateString('pt-BR')} às ${new Date(ticket.data_retorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` 
                              : 'Registrado ao salvar resposta'}
                          </div>
                        </div>
                      </div>

                      {/* Parecer / Resposta input block */}
                      <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Parecer do DP / Resposta da Solicitação *</label>
                        <textarea
                          value={parecer}
                          onChange={(e) => setParecer(e.target.value)}
                          rows={4}
                          placeholder="Digite aqui o parecer técnico do DP ou a resposta esclarecedora sobre esta solicitação..."
                          className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-xl text-xs text-slate-800 focus:outline-hidden transition-all"
                        />
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-100">
                        <button
                          type="submit"
                          id="admin-btn-save-reply"
                          className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                        >
                          <Save className="h-4 w-4" />
                          <span>Salvar Parecer</span>
                        </button>
                        <button
                          type="button"
                          id="admin-btn-close-ticket"
                          onClick={handleEncerrarAtendimento}
                          className="w-full sm:w-auto px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-xs transition-colors flex items-center justify-center space-x-1.5 cursor-pointer shadow-md"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Encerrar Atendimento</span>
                        </button>
                      </div>
                    </>
                  )}

                </form>
              ) : (
                // STANDARD USER RESPONSE INFORMATIVE VIEW
                <div className="space-y-4">
                  {ticket.parecer ? (
                    <div className="space-y-4 bg-slate-50 border border-slate-200 p-5 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-indigo-600 font-bold uppercase block tracking-wider">Resposta da equipe de DP</span>
                        <span className="text-[10px] text-slate-400">Atendido por: <strong>{responsavelName}</strong></span>
                      </div>
                      
                      <div className="p-4 bg-white border border-slate-200 rounded-xl text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">
                        {ticket.parecer}
                      </div>

                      {ticket.data_retorno && (
                        <div className="text-[10px] text-slate-400 text-right">
                          Retornado em: {new Date(ticket.data_retorno).toLocaleDateString('pt-BR')} às {new Date(ticket.data_retorno).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-6 text-center bg-amber-50 text-amber-800 border border-amber-200 rounded-2xl">
                      <Clock3 className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                      <p className="text-xs font-bold">Solicitação em análise</p>
                      <p className="text-[11px] text-amber-600 mt-1">A equipe de Departamento Pessoal já recebeu sua demanda. Aguarde o retorno com o parecer conclusivo.</p>
                    </div>
                  )}

                  {/* Standard user closing their own open ticket */}
                  {ticket.status !== 'Encerrado' && ticket.solicitante_id === currentUser.id && (
                    <div className="pt-4 border-t border-slate-100 flex justify-end">
                      <button
                        type="button"
                        id="user-btn-cancel-own-ticket"
                        onClick={handleEncerrarAtendimento}
                        className="cursor-pointer text-xs font-bold text-rose-600 hover:text-rose-700 px-4 py-2 border border-rose-200 bg-rose-50 rounded-lg transition-colors flex items-center space-x-1.5"
                      >
                        <XSquare className="h-4 w-4 text-rose-500" />
                        <span>Encerrar Minha Solicitação</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>

        {/* RIGHT ONE COLUMN: TIMELINE HISTORY */}
        <div className="space-y-6">
          
          {/* Card header */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center">
              <Clock className="h-4.5 w-4.5 mr-2 text-slate-500" />
              Histórico do Chamado
            </h4>
            <p className="text-[11px] text-slate-400">Linha do tempo das auditorias e respostas automáticas e manuais do chamado.</p>

            {/* Timeline UI list */}
            <div className="relative border-l border-slate-200 pl-4 ml-2.5 py-2 space-y-6">
              
              {ticketHistory.map((hist, idx) => {
                const isSystem = hist.acao.includes('Abertura') || hist.acao.includes('Atribuição');
                const userWhoActed = getUserNameById(hist.usuario_id);
                
                return (
                  <div key={hist.id} className="relative">
                    {/* Circle dot marker */}
                    <span className={`absolute -left-[21px] mt-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white ${
                      isSystem ? 'bg-indigo-600' : 'bg-emerald-500'
                    }`} />

                    {/* Timeline box content */}
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-semibold mb-1">
                        <span>{hist.acao}</span>
                        <span>
                          {new Date(hist.data_hora).toLocaleDateString('pt-BR')} {new Date(hist.data_hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800">{hist.observacao}</p>
                      <p className="text-[9px] text-slate-400 mt-0.5">Executado por: {userWhoActed}</p>
                    </div>
                  </div>
                );
              })}

              {ticketHistory.length === 0 && (
                <p className="text-xs text-slate-400 italic py-2">Sem histórico disponível.</p>
              )}

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
