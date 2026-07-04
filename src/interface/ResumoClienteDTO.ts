import type ClienteDTO from './ClienteDTO.js';
import type EmprestimoDTO from './EmprestimoDTO.js';
import type ParcelaDTO from './ParcelaDTO.js';

export interface TotaisClienteDTO {
  total_emprestado: number;
  total_recebido: number;
  total_em_aberto: number;
  total_atrasado: number;
}

export interface EmprestimoComParcelasDTO extends EmprestimoDTO {
  parcelas: ParcelaDTO[];
}

export default interface ResumoClienteDTO {
  cliente: ClienteDTO;
  emprestimos: EmprestimoComParcelasDTO[];
  totais: TotaisClienteDTO;
}
