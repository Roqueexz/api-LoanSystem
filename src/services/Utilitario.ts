import { addMonths, differenceInDays, format, isAfter, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default class Utilitario {
  /**
   * Adiciona meses a uma data de forma segura (lida com 31/01 → 28/02)
   */
  static adicionarMeses(data: Date, meses: number): Date {
    return addMonths(data, meses);
  }

  /**
   * Formata data no padrão brasileiro (dd/MM/yyyy)
   */
  static formatarDataBR(data: Date): string {
    return format(data, 'dd/MM/yyyy', { locale: ptBR });
  }

  /**
   * Calcula dias entre duas datas
   */
  static diasEntreDatas(dataInicio: Date, dataFim: Date): number {
    return differenceInDays(dataFim, dataInicio);
  }

  /**
   * Verifica se uma data é hoje
   */
  static isHoje(data: Date): boolean {
    const hoje = startOfDay(new Date());
    const dataComparar = startOfDay(data);
    return dataComparar.getTime() === hoje.getTime();
  }

  /**
   * Verifica se a data está vencida (antes de hoje)
   */
  static isVencida(data: Date): boolean {
    const hoje = startOfDay(new Date());
    const dataComparar = startOfDay(data);
    return isBefore(dataComparar, hoje);
  }

  /**
   * Verifica se a data está no futuro
   */
  static isFutura(data: Date): boolean {
    const hoje = startOfDay(new Date());
    const dataComparar = startOfDay(data);
    return isAfter(dataComparar, hoje);
  }
}