export interface NotificacaoDTO {
  id_notificacao?: number;
  codigo?: string;
  titulo: string;
  mensagem: string;
  tipo: 'conta' | 'parcela' | 'meta' | 'sistema' | 'movimentacao';
  prioridade: 'critica' | 'alta' | 'media' | 'baixa';
  canal?: 'in_app' | 'push' | 'email' | 'all';
  lida?: boolean;
  arquivada?: boolean;
  data_criacao?: string;
  data_vencimento?: string;
  link?: string;
}

export interface PreferenciaNotificacaoDTO {
  notificacoes_conta: boolean;
  notificacoes_parcela: boolean;
  notificacoes_meta: boolean;
  notificacoes_sistema: boolean;
  push_enabled: boolean;
  resumo_diario: boolean;
}
