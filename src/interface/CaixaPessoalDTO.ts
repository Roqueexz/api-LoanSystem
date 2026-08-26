// ============================================================
// CaixaPessoalDTO — tipos do módulo Caixa Pessoal (API)
// Espelho do CaixaPessoalDTO.ts do frontend.
// Sprints futuras ampliarão estas interfaces.
// ============================================================

// Sprint 2 — Cofre físico
export interface CedulaCofreDTO {
  id_cofre?: number;
  valor_cedula: number;   // 2 | 5 | 10 | 20 | 50 | 100 | 200
  quantidade: number;
}

export interface CofreFisicoDTO {
  cedulas: CedulaCofreDTO[];
  total: number;
}

// Sprint 3 — Movimentações
export type TipoMovimentacao = 'entrada' | 'saida';

export interface MovimentacaoDTO {
  id_movimentacao?: number;
  tipo: TipoMovimentacao;
  valor: number;
  categoria: string;
  descricao?: string;
  data: string;
}

// Sprint 4 — Contas
export type TipoConta = 'pagar' | 'receber';

export interface ContaDTO {
  id_conta?: number;
  tipo: TipoConta;
  descricao: string;
  valor: number;
  vencimento: string;
  pago: boolean;

  // Sprint 6 — novos campos
  categoria?: string;
  recorrencia?: 'unica' | 'diaria' | 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual';
  prioridade?: 'alta' | 'media' | 'baixa';
  lembrete_dias_antes?: number;
  observacao?: string;
  tags?: string[];
  status?: 'programada' | 'pendente' | 'paga' | 'atrasada' | 'cancelada';
}

// Sprint 5 — Metas
export interface MetaDTO {
  id_meta?: number;
  nome: string;
  descricao?: string;
  valor_alvo: number;
  valor_atual: number;
  prazo?: string;
  percentual?: number | undefined;
  dias_restantes?: number | undefined;
}