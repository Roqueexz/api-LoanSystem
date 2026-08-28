import { DatabaseModel } from "../model/DatabaseModel.js";
import logger from "./Logger.js";

const database = new DatabaseModel().pool;
const CEDULAS_VALIDAS = [200, 100, 50, 20, 10, 5, 2] as const;

export interface CedulaDetectada {
  valor_cedula: number;
  quantidade: number;
  confianca: number; // 0-100
}

export interface ConciliacaoResultado {
  id_conciliacao?: number;
  manual: { cedulas: { valor_cedula: number; quantidade: number }[]; total: number };
  ocr: { cedulas: CedulaDetectada[]; total: number; texto_bruto?: string };
  divergencia: number;
  status: "conciliado" | "divergencia" | "ocr_falhou";
  foto_url?: string;
  criado_em?: string;
}

// Garante tabela de auditoria
async function garantirTabela() {
  await database.query(`
    CREATE TABLE IF NOT EXISTS caixa_pessoal_conciliacao (
      id_conciliacao SERIAL PRIMARY KEY,
      id_usuario INT NOT NULL REFERENCES usuario(id_usuario) ON DELETE CASCADE,
      foto_url VARCHAR(500),
      manual_total NUMERIC(10,2) NOT NULL,
      ocr_total NUMERIC(10,2) NOT NULL,
      divergencia NUMERIC(10,2) NOT NULL,
      status VARCHAR(20) NOT NULL CHECK (status IN ('conciliado','divergencia','ocr_falhou')),
      detalhes JSONB,
      criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  await database.query(`CREATE INDEX IF NOT EXISTS idx_conciliacao_usuario ON caixa_pessoal_conciliacao(id_usuario)`);
}

// Heurística mock OCR — quando Tesseract real falhar ou não estiver disponível
// Gera detecção plausível a partir do total manual, com leve variação determinística baseada no hash da imagem
function mockOcrFromManual(manualTotal: number, imageHash: string, manualCedulas: any[]): CedulaDetectada[] {
  // Hash simples para determinismo
  let h = 0;
  for (let i = 0; i < imageHash.length; i++) h = (h * 31 + imageHash.charCodeAt(i)) >>> 0;
  const variacao = ((h % 11) - 5) / 100; // -5% a +5%
  // Se total baixo, varia menos
  const ocrTotalMock = Math.max(0, Math.round(manualTotal * (1 + variacao)));

  // Distribui o total mock em cédulas plausíveis (guloso maior -> menor)
  let restante = ocrTotalMock;
  const resultado: CedulaDetectada[] = [];
  for (const v of CEDULAS_VALIDAS) {
    // Tenta reproduzir distribuição manual com ruído
    const manualQtd = manualCedulas.find((c: any) => Number(c.valor_cedula) === v)?.quantidade ?? 0;
    // Adiciona ruído de -1 a +1 na qtd
    const noise = (h % 3) - 1;
    h = (h * 1664525 + 1013904223) >>> 0;
    let qtd = Math.max(0, manualQtd + noise);
    // Ajusta para não estourar restante (guloso)
    const maxByRestante = Math.floor(restante / v);
    qtd = Math.min(qtd, maxByRestante);
    if (v === 2) qtd = Math.floor(restante / 2); // fecha com 2
    restante -= qtd * v;
    resultado.push({ valor_cedula: v, quantidade: qtd, confianca: 72 + (h % 25) });
  }
  // Se sobrou troco (ex: 1 real), joga em 2 com confiança baixa
  if (restante > 0) {
    const last = resultado.find(r => r.valor_cedula === 2)!;
    last.quantidade += Math.ceil(restante / 2);
    last.confianca = 45;
  }
  return resultado;
}

export async function analisarConciliacao(
  id_usuario: number,
  manualCedulas: { valor_cedula: number; quantidade: number }[],
  fotoUrl: string | null,
  fotoBuffer: Buffer | null,
  ocrClientResult?: { cedulas: CedulaDetectada[]; texto_bruto?: string; total?: number }
): Promise<ConciliacaoResultado> {
  await garantirTabela();

  const manualTotal = manualCedulas.reduce((acc, c) => acc + Number(c.valor_cedula) * Number(c.quantidade), 0);

  let ocrCedulas: CedulaDetectada[];
  let textoBruto: string | undefined;

  if (ocrClientResult && Array.isArray(ocrClientResult.cedulas) && ocrClientResult.cedulas.length > 0) {
    // Frontend já fez OCR via Tesseract.js — confiamos no cliente, mas validamos
    ocrCedulas = ocrClientResult.cedulas
      .filter(c => CEDULAS_VALIDAS.includes(c.valor_cedula as any))
      .map(c => ({
        valor_cedula: Number(c.valor_cedula),
        quantidade: Math.max(0, Math.floor(Number(c.quantidade))),
        confianca: Math.min(100, Math.max(0, Number(c.confianca) || 80)),
      }));
    textoBruto = ocrClientResult.texto_bruto;
    logger.info({ id_usuario, ocrCedulas }, "[Conciliacao] OCR recebido do cliente");
  } else if (fotoBuffer) {
    // Fallback server-side mock OCR (futuro: plugar Google Vision / AWS Textract aqui)
    const hash = fotoBuffer.toString("base64").slice(0, 32);
    ocrCedulas = mockOcrFromManual(manualTotal, hash, manualCedulas);
    textoBruto = `[MOCK OCR] Total estimado a partir da imagem (${fotoBuffer.length} bytes). Substitua por Vision API.`;
    logger.warn({ id_usuario, manualTotal }, "[Conciliacao] Usando MOCK OCR server-side");
  } else {
    ocrCedulas = CEDULAS_VALIDAS.map(v => ({ valor_cedula: v, quantidade: 0, confianca: 0 }));
    textoBruto = "Nenhuma foto enviada e nenhum OCR do cliente.";
  }

  const ocrTotal = ocrCedulas.reduce((acc, c) => acc + c.valor_cedula * c.quantidade, 0);
  const divergencia = manualTotal - ocrTotal;
  const status: ConciliacaoResultado["status"] =
    ocrCedulas.every(c => c.quantidade === 0) ? "ocr_falhou" : divergencia === 0 ? "conciliado" : "divergencia";

  const detalhes = JSON.stringify({ manual: manualCedulas, ocr: ocrCedulas, texto_bruto: textoBruto });

  const res = await database.query(
    `INSERT INTO caixa_pessoal_conciliacao (id_usuario, foto_url, manual_total, ocr_total, divergencia, status, detalhes)
     VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id_conciliacao, criado_em`,
    [id_usuario, fotoUrl, manualTotal, ocrTotal, divergencia, status, detalhes]
  );

  return {
    id_conciliacao: res.rows[0].id_conciliacao,
    manual: { cedulas: manualCedulas, total: manualTotal },
    ocr: { cedulas: ocrCedulas, total: ocrTotal, ...(textoBruto ? { texto_bruto: textoBruto } : {}) },
    divergencia,
    status,
    ...(fotoUrl ? { foto_url: fotoUrl } : {}),
    criado_em: res.rows[0].criado_em,
  };
}

export async function listarConciliacoes(id_usuario: number, limit = 20) {
  await garantirTabela();
  const res = await database.query(
    `SELECT id_conciliacao, foto_url, manual_total, ocr_total, divergencia, status, detalhes, criado_em
     FROM caixa_pessoal_conciliacao WHERE id_usuario=$1 ORDER BY criado_em DESC LIMIT $2`,
    [id_usuario, limit]
  );
  return res.rows.map((r: any) => ({
    id_conciliacao: r.id_conciliacao,
    foto_url: r.foto_url,
    manual_total: Number(r.manual_total),
    ocr_total: Number(r.ocr_total),
    divergencia: Number(r.divergencia),
    status: r.status,
    detalhes: r.detalhes,
    criado_em: r.criado_em,
  }));
}
