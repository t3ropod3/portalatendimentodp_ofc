/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha?: string;
  perfil: 'Administrador' | 'Atendente' | 'Solicitante';
  empresa: 'Radar' | 'Proativa' | 'Ambas';
  ativo: 'Sim' | 'Não';
}

export interface Anexo {
  name: string;
  size: string;
  data: string; // Base64 data url
}

export interface Atendimento {
  id: string;
  protocolo: string;
  assunto: string;
  empresa: 'Radar' | 'Proativa';
  data_abertura: string;
  data_necessaria: string;
  solicitacao: string; // e.g. "Férias", "Ponto", "Benefícios", etc.
  descricao: string;
  anexos: Anexo[];
  status: 'Aberto' | 'Em Atendimento' | 'Encerrado';
  solicitante_id: string;
  responsavel_id?: string;
  parecer?: string;
  data_retorno?: string;
  data_encerramento?: string;
}

export interface HistoricoAtendimento {
  id: string;
  atendimento_id: string;
  usuario_id: string;
  data_hora: string;
  acao: string;
  observacao: string;
}

export type FilterType = 'all' | 'open' | 'inprogress' | 'closed' | 'radar' | 'proativa' | 'my-tickets';

export interface Notificacao {
  id: string;
  usuario_id?: string;
  perfil_alvo?: 'Administrador' | 'Atendente' | 'Solicitante' | 'Todos';
  titulo: string;
  mensagem: string;
  data_hora: string;
  protocolo?: string;
  lida: boolean;
  tipo: 'abertura' | 'resposta' | 'encerramento';
}


