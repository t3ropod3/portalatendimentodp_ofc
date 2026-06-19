/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { 
  PlusCircle, 
  Building2, 
  Calendar, 
  FileText, 
  Paperclip, 
  X, 
  Check, 
  CornerDownRight, 
  HelpCircle,
  Copy,
  AlertCircle
} from 'lucide-react';
import { Usuario, Anexo } from '../types';
import { createTicket } from '../dbMock';

interface NovoAtendimentoProps {
  currentUser: Usuario;
  onSuccess: (protocolo: string) => void;
}

const CATEGORIAS_DP = [
  'Férias (Agendamento, Alteração, Venda)',
  'Ponto Eletrônico (Ajuste de Batida, Justificativa)',
  'Benefícios (Plano de Saúde, Vale Transporte, Alimentação)',
  'Folha de Pagamento (Dúvida no Holerite, Décimo Terceiro)',
  'Movimentações de Pessoal (Alteração de Dados, Promoção)',
  'Desligamento / Demissão',
  'Atestado Médico / Licença',
  'Outros Assuntos de DP'
];

export default function NovoAtendimento({ currentUser, onSuccess }: NovoAtendimentoProps) {
  const [assunto, setAssunto] = useState('');
  const [empresa, setEmpresa] = useState<'Radar' | 'Proativa'>(
    currentUser.empresa === 'Ambas' ? 'Proativa' : (currentUser.empresa || 'Proativa')
  );
  const [dataNecessaria, setDataNecessaria] = useState('');
  const [solicitacao, setSolicitacao] = useState(CATEGORIAS_DP[0]);
  const [descricao, setDescricao] = useState('');
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successProtocol, setSuccessProtocol] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper formatting file size
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const processFiles = (fileList: FileList) => {
    const loadedAnexos: Anexo[] = [];
    const maxFileSize = 4 * 1024 * 1024; // 4MB to prevent localStorage overflow
    
    // Convert FileList to array
    const filesArray = Array.from(fileList);
    let sizeError = false;

    const filePromises = filesArray.map((file) => {
      return new Promise<void>((resolve) => {
        if (file.size > maxFileSize) {
          sizeError = true;
          resolve();
          return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
          if (event.target?.result) {
            loadedAnexos.push({
              name: file.name,
              size: formatBytes(file.size),
              data: event.target.result as string
            });
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(filePromises).then(() => {
      if (sizeError) {
        setErrorMessage('Alguns arquivos excederam o limite máximo de 4MB por segurança e foram desconsiderados.');
      } else {
        setErrorMessage('');
      }
      setAnexos((prev) => [...prev, ...loadedAnexos]);
    });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const removeAnexo = (indexToRemove: number) => {
    setAnexos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    
    if (!assunto.trim()) {
      setErrorMessage('O assunto do chamado é obrigatório.');
      return;
    }
    if (!dataNecessaria) {
      setErrorMessage('A data necessária para retorno é obrigatória.');
      return;
    }
    if (!descricao.trim()) {
      setErrorMessage('A descrição detalhada da solicitação é obrigatória.');
      return;
    }

    // Check if data is in the past
    const selectedDate = new Date(dataNecessaria);
    const today = new Date();
    today.setHours(0,0,0,0);
    if (selectedDate < today) {
      setErrorMessage('A data para quando precisa não pode estar no passado.');
      return;
    }

    setIsSubmitting(true);

    try {
      const ticket = await createTicket({
        assunto: assunto.trim(),
        empresa,
        data_necessaria: dataNecessaria,
        solicitacao,
        descricao: descricao.trim(),
        anexos,
        solicitante_id: currentUser.id
      });

      setSuccessProtocol(ticket.protocolo);
      
      // Clear inputs
      setAssunto('');
      setDataNecessaria('');
      setDescricao('');
      setAnexos([]);
    } catch (err: any) {
      setErrorMessage('Falha ao processar solicitação: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyProtocol = () => {
    if (successProtocol) {
      navigator.clipboard.writeText(successProtocol);
    }
  };

  if (successProtocol) {
    return (
      <div className="max-w-2xl mx-auto bg-white rounded-xl border border-emerald-200 p-8 text-center shadow-md animate-scale-in">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border border-emerald-200">
          <Check className="w-8 h-8" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900">Solicitação Enviada com Sucesso!</h3>
        <p className="text-sm text-slate-500 mt-2">
          Sua demanda foi protocolada com sucesso e já está disponível para análise da equipe de Departamento Pessoal.
        </p>

        {/* Protocol display badge */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-5 my-6 max-w-sm mx-auto flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">NÚMERO DO PROTOCOLO</span>
            <span id="created-protocol-id" className="text-lg font-mono font-bold text-indigo-600 tracking-wider mt-1 block">
              {successProtocol}
            </span>
          </div>
          <button 
            type="button"
            onClick={handleCopyProtocol}
            className="p-2.5 bg-white text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 active:bg-slate-100 transition-all cursor-pointer shadow-xs group"
            title="Copiar Protocolo"
          >
            <Copy className="h-4.5 w-4.5 text-slate-500 group-hover:text-indigo-600" />
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="btn-goto-atendimentos"
            onClick={() => onSuccess(successProtocol)}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Ver meus chamados
          </button>
          <button
            id="btn-new-another-ticket"
            onClick={() => setSuccessProtocol('')}
            className="w-full sm:w-auto px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-705 font-medium rounded-lg text-sm transition-colors cursor-pointer"
          >
            Abrir outro chamado
          </button>
        </div>
      </div>
    );
  }

  // Get formatted date today for date picker min
  const getMinDateString = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
      
      {/* Visual Header Banner */}
      <div className="bg-indigo-900 px-8 py-6 text-white border-b border-indigo-800 flex items-center space-x-4">
        <div className="p-3 bg-amber-500 rounded-lg text-white font-bold shrink-0 shadow-lg shadow-amber-500/20">
          <PlusCircle className="h-6 w-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold tracking-tight">Nova Solicitação — DP</h2>
          <p className="text-xs text-indigo-205 mt-0.5 animate-pulse">Preencha os dados abaixo de maneira clara para acelerar o retorno.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        
        {errorMessage && (
          <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
            <span className="font-medium">{errorMessage}</span>
          </div>
        )}

        {/* Two columns: Subject and Company */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Subject (Assunto) */}
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Assunto Curto *</label>
            <div className="relative">
              <input
                type="text"
                value={assunto}
                onChange={(e) => setAssunto(e.target.value)}
                placeholder="Ex: Correção de lançamento de falta de Maio"
                className="w-full pl-3 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-sm text-slate-800 transition-all font-medium focus:outline-hidden group-focus:scale-95"
                required
              />
            </div>
            <span className="text-[10px] text-slate-400 block">Identificação rápida da sua necessidade na tela de listagem</span>
          </div>

          {/* Company selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Empresa do Vínculo *</label>
            <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
              <button
                type="button"
                onClick={() => setEmpresa('Radar')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  empresa === 'Radar' 
                    ? 'bg-white text-indigo-600 shadow-xs' 
                    : 'text-slate-550 hover:text-slate-800'
                }`}
              >
                Radar
              </button>
              <button
                type="button"
                onClick={() => setEmpresa('Proativa')}
                className={`flex-1 py-2 text-xs font-bold rounded-md transition-all cursor-pointer ${
                  empresa === 'Proativa' 
                    ? 'bg-white text-indigo-600 shadow-xs' 
                    : 'text-slate-550 hover:text-slate-800'
                }`}
              >
                Proativa
              </button>
            </div>
            <span className="text-[10px] text-slate-400 block">Indique a empresa do registro de trabalho</span>
          </div>

        </div>

        {/* Second row: Request classification and Date limit */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Categorization (Qual solicitação?) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Qual é a Solicitação? *</label>
            <select
              value={solicitacao}
              onChange={(e) => setSolicitacao(e.target.value)}
              className="w-full bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-sm text-slate-800 py-2.5 px-3 transition-colors font-medium cursor-pointer focus:outline-hidden"
            >
              {CATEGORIAS_DP.map((cat, index) => (
                <option key={index} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          {/* Target date (Para quando precisa?) */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block flex items-center justify-between">
              <span>Para Quando Precisa? *</span>
              <span className="text-[10px] text-amber-600 font-bold uppercase">Prazo de Resolução</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                <Calendar className="h-4 w-4" />
              </div>
              <input
                type="date"
                min={getMinDateString()}
                value={dataNecessaria}
                onChange={(e) => setDataNecessaria(e.target.value)}
                className="w-full pl-10 pr-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-sm text-slate-800 transition-colors font-medium focus:outline-hidden"
                required
              />
            </div>
          </div>

        </div>

        {/* Third row: Detailed description */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Descrição Detalhada *</label>
          <textarea
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            rows={5}
            placeholder="Forneça o máximo de detalhes possível, como datas de ocorrência, valores ou justificativas, para que a resposta do DP seja ágil e precisa."
            className="w-full px-3 py-2.5 bg-slate-50/50 border border-slate-200 focus:border-indigo-500 focus:bg-white rounded-lg text-sm text-slate-800 transition-colors font-medium focus:outline-hidden"
            required
          />
        </div>

        {/* Fourth row: Drag-and-drop file attachment */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Anexar Documentos de Apoio</label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`cursor-pointer border-2 border-dashed rounded-xl p-6 text-center transition-all bg-slate-50/30 hover:bg-slate-50/80 ${
              isDragOver 
                ? 'border-indigo-500 bg-indigo-50/40 text-indigo-600' 
                : 'border-slate-300 hover:border-slate-400 text-slate-500'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <Paperclip className="h-8 w-8 text-slate-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
            <p className="text-xs font-bold text-slate-700">Arraste e solte os arquivos aqui ou clique para selecionar</p>
            <p className="text-[10px] text-slate-400 mt-1">Formatos aceitos: PDF, JPEG, PNG (Tamanho máximo recomendado: 4MB por arquivo)</p>
          </div>

          {/* List of uploaded files */}
          {anexos.length > 0 && (
            <div className="mt-3 bg-slate-50 border border-slate-100 rounded-lg p-3 space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Arquivos anexados ({anexos.length})</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {anexos.map((file, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-white rounded-md border border-slate-200">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="p-1 bg-indigo-50 rounded text-indigo-600 shrink-0">
                        <FileText className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-700 truncate max-w-[160px]">{file.name}</p>
                        <p className="text-[9px] text-slate-400">{file.size}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeAnexo(idx);
                      }}
                      className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Automatic fields summary */}
        <div className="p-4 bg-indigo-50/50 border border-indigo-100/80 rounded-xl space-y-2">
          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider flex items-center mb-1">
            <CornerDownRight className="h-3 w-3 mr-1" />
            Informações Automáticas do Protocolo
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-medium text-slate-600">
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Solicitante</span>
              <span className="text-slate-800 font-bold truncate max-w-[150px] block">{currentUser.nome}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Empresa do Solicitante</span>
              <span className="text-slate-800 font-bold block">
                {currentUser.empresa === 'Ambas' ? 'Radar & Proativa' : currentUser.empresa}
              </span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Data de Abertura</span>
              <span className="text-slate-800 font-bold block">{new Date().toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-slate-400 text-[10px] uppercase block">Status Inicial</span>
              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                Aberto
              </span>
            </div>
          </div>
        </div>

        {/* Action button */}
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            id="btn-submit-ticket"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-sm transition-colors cursor-pointer shadow-md shadow-indigo-600/10 flex items-center justify-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></span>
                Protocolando...
              </>
            ) : (
              <>
                <span>Cadastrar Solicitação</span>
              </>
            )}
          </button>
        </div>

      </form>
    </div>
  );
}
