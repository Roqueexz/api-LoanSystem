// ============================================
// DATAS
// ============================================

/**
 * Formata uma data para o padrao brasileiro (dd/MM/yyyy)
 */
export function formatarDataBR(data: Date | string | undefined | null): string {
  if (!data) return '';
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
}

/**
 * Formata uma data para o padrao ISO (yyyy-MM-dd)
 */
export function formatarDataISO(data: Date | string | undefined | null): string {
  if (!data) return '';
  const d = typeof data === 'string' ? new Date(data) : data;
  if (isNaN(d.getTime())) return '';
  const iso = d.toISOString();
  return iso.split('T')[0] ?? '';
}

/**
 * Verifica se uma data e valida
 */
export function isDataValida(data: any): boolean {
  if (!data) return false;
  const d = new Date(data);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Retorna a data atual no formato ISO
 */
export function dataAtualISO(): string {
  const iso = new Date().toISOString();
  return iso.split('T')[0] ?? '';
}

/**
 * Adiciona dias a uma data
 */
export function adicionarDias(data: Date | undefined | null, dias: number): Date | null {
  if (!data) return null;
  const resultado = new Date(data);
  resultado.setDate(resultado.getDate() + dias);
  return resultado;
}

/**
 * Adiciona meses a uma data
 */
export function adicionarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

// ============================================
// MOEDA
// ============================================

/**
 * Formata um numero para moeda brasileira (R$ 1.234,56)
 */
export function formatarMoeda(valor: number): string {
  return valor.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Converte string de moeda para numero
 * Ex: "R$ 1.234,56" -> 1234.56
 */
export function parseMoeda(valor: string): number {
  const limpo = valor
    .replace(/[R$\s]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');
  return parseFloat(limpo) || 0;
}

// ============================================
// VALIDACOES
// ============================================

/**
 * Verifica se um valor e um numero valido
 */
export function isNumeroValido(valor: any): boolean {
  return typeof valor === 'number' && !isNaN(valor) && valor >= 0;
}

/**
 * Verifica se uma string nao esta vazia ou so com espacos
 */
export function isStringValida(str: string): boolean {
  return typeof str === 'string' && str.trim().length > 0;
}

/**
 * Verifica se um email e valido
 */
export function isEmailValido(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ============================================
// TELEFONE
// ============================================

/**
 * Formata telefone para padrao brasileiro
 * Ex: 11988887777 -> (11) 98888-7777
 */
export function formatarTelefone(telefone: string): string {
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length === 10) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 6)}-${limpo.slice(6, 10)}`;
  }
  if (limpo.length === 11) {
    return `(${limpo.slice(0, 2)}) ${limpo.slice(2, 7)}-${limpo.slice(7, 11)}`;
  }
  return telefone;
}

/**
 * Remove mascara do telefone
 * Ex: (11) 98888-7777 -> 11988887777
 */
export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

// ============================================
// TEXTO
// ============================================

/**
 * Capitaliza a primeira letra de cada palavra
 */
export function capitalizar(texto: string): string {
  return texto
    .toLowerCase()
    .split(' ')
    .map((palavra) => palavra.charAt(0).toUpperCase() + palavra.slice(1))
    .join(' ');
}

/**
 * Trunca um texto para um tamanho maximo
 */
export function truncarTexto(texto: string, tamanho: number): string {
  if (texto.length <= tamanho) return texto;
  return texto.slice(0, tamanho) + '...';
}

// ============================================
// CPF/CNPJ
// ============================================

/**
 * Formata CPF para padrao xxx.xxx.xxx-xx
 */
export function formatarCPF(cpf: string): string {
  const limpo = cpf.replace(/\D/g, '');
  if (limpo.length !== 11) return cpf;
  return `${limpo.slice(0, 3)}.${limpo.slice(3, 6)}.${limpo.slice(6, 9)}-${limpo.slice(9, 11)}`;
}

/**
 * Formata CNPJ para padrao xx.xxx.xxx/xxxx-xx
 */
export function formatarCNPJ(cnpj: string): string {
  const limpo = cnpj.replace(/\D/g, '');
  if (limpo.length !== 14) return cnpj;
  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12, 14)}`;
}

// ============================================
// SLUG
// ============================================

/**
 * Gera um slug a partir de um texto
 * Ex: "Ola Mundo!" -> "ola-mundo"
 */
export function gerarSlug(texto: string): string {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}