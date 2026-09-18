/**
 * Smart bank notification parser for Brazilian banks.
 * Parses copied notification text and extracts transaction details.
 */

export type ParsedTransaction = {
  type: "income" | "expense";
  amount: number;
  note: string;
  category: string;
  confidence: "high" | "medium" | "low";
  bank?: string;
};

// ─── Amount extraction ────────────────────────────────────────────────────────

function extractAmount(text: string): number | null {
  // Match patterns like: R$ 1.234,56 | R$1234.56 | R$ 1234,56 | 1.234,56
  const patterns = [
    /R\$\s*([\d.,]+)/i,
    /valor[:\s]+R?\$?\s*([\d.,]+)/i,
    /de\s+R?\$?\s*([\d.,]+)/i,
  ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const raw = m[1].trim();
      // Handle Brazilian format: 1.234,56 → 1234.56
      const normalized = raw.replace(/\./g, "").replace(",", ".");
      const n = parseFloat(normalized);
      if (!isNaN(n) && n > 0 && n < 1_000_000) return n;
    }
  }
  return null;
}

// ─── Bank detection ───────────────────────────────────────────────────────────

function detectBank(text: string): string | undefined {
  const lower = text.toLowerCase();
  const banks: [string, string][] = [
    ["nubank", "Nubank"],
    ["nu ", "Nubank"],
    ["itaú", "Itaú"],
    ["itau", "Itaú"],
    ["bradesco", "Bradesco"],
    ["santander", "Santander"],
    ["banco do brasil", "Banco do Brasil"],
    ["bb ", "Banco do Brasil"],
    ["caixa", "Caixa"],
    ["c6", "C6 Bank"],
    ["inter", "Banco Inter"],
    ["picpay", "PicPay"],
    ["mercado pago", "Mercado Pago"],
    ["xp ", "XP"],
    ["btg", "BTG"],
    ["neon", "Neon"],
    ["pagbank", "PagBank"],
    ["sicoob", "Sicoob"],
    ["sicredi", "Sicredi"],
    ["next", "Next"],
    ["will", "Will Bank"],
  ];
  for (const [key, name] of banks) {
    if (lower.includes(key)) return name;
  }
  return undefined;
}

// ─── Intent detection (income vs expense) ────────────────────────────────────

const INCOME_KEYWORDS = [
  "recebeu",
  "recebido",
  "recebida",
  "crédito",
  "credito",
  "entrada",
  "depositado",
  "depósito",
  "deposito",
  "pix recebido",
  "transferência recebida",
  "transferencia recebida",
  "foi creditado",
  "você recebeu",
  "salário",
  "salario",
  "rendimento",
  "dividendo",
  "estorno",
  "cashback",
];

const EXPENSE_KEYWORDS = [
  "compra",
  "débito",
  "debito",
  "pagamento",
  "pagou",
  "pago",
  "enviado",
  "enviou",
  "transferência enviada",
  "transferencia enviada",
  "você enviou",
  "pix enviado",
  "pix debitado",
  "saída",
  "saida",
  "fatura",
  "cobrança",
  "cobranca",
  "saque",
  "retirada",
  "foi debitado",
  "aprovada",
  "autorizada",
];

function detectIntent(
  text: string,
): { type: "income" | "expense"; confidence: "high" | "medium" | "low" } {
  const lower = text.toLowerCase();

  let incomeScore = 0;
  let expenseScore = 0;

  for (const kw of INCOME_KEYWORDS) {
    if (lower.includes(kw)) incomeScore += kw.split(" ").length; // multi-word = higher weight
  }
  for (const kw of EXPENSE_KEYWORDS) {
    if (lower.includes(kw)) expenseScore += kw.split(" ").length;
  }

  if (incomeScore === 0 && expenseScore === 0) {
    return { type: "expense", confidence: "low" };
  }
  if (incomeScore > expenseScore) {
    return {
      type: "income",
      confidence: incomeScore >= 2 ? "high" : "medium",
    };
  }
  return {
    type: "expense",
    confidence: expenseScore >= 2 ? "high" : "medium",
  };
}

// ─── Description/note extraction ──────────────────────────────────────────────

function extractNote(text: string, type: "income" | "expense"): string {
  const lower = text.toLowerCase();

  // Try to extract merchant or sender name from common patterns
  const patterns =
    type === "expense"
      ? [
          /(?:compra|débito|debito|pagamento|pix)\s+(?:de\s+)?(?:r\$\s*[\d.,]+\s+)?(?:em|para|na?|no?)\s+([^–—\-\n,.]{3,40})/i,
          /em\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛ][^–—\-\n,.]{2,35})/,
          /para\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛ][^–—\-\n,.]{2,35})/,
          /estabelecimento[:\s]+([^–—\-\n,.]{3,40})/i,
          /loja[:\s]+([^–—\-\n,.]{3,40})/i,
        ]
      : [
          /(?:pix|transferência|transferencia|depósito|deposito)\s+(?:recebid[ao]?\s+)?de\s+([^–—\-\n,.]{3,40})/i,
          /recebeu?\s+(?:r\$\s*[\d.,]+\s+)?de\s+([^–—\-\n,.]{3,40})/i,
          /de\s+([A-ZÁÉÍÓÚÃÕÂÊÎÔÛ][^–—\-\n,.]{2,35})/,
        ];

  for (const pat of patterns) {
    const m = text.match(pat);
    if (m) {
      const candidate = m[1].trim().replace(/[.*]$/, "").trim();
      if (candidate.length >= 3 && candidate.length <= 40) {
        return candidate;
      }
    }
  }

  // Fallback: first meaningful chunk of text
  const firstLine = text.split(/[\n\r]/)[0].slice(0, 60).trim();
  return firstLine || (type === "expense" ? "Compra detectada" : "Entrada detectada");
}

// ─── Category suggestion ──────────────────────────────────────────────────────

function suggestCategory(
  text: string,
  type: "income" | "expense",
  note: string,
): string {
  const combined = (text + " " + note).toLowerCase();

  if (type === "income") {
    if (/salário|salario|folha/.test(combined)) return "Salário";
    if (/pix|transferência|ted|doc/.test(combined)) return "Outros";
    if (/rendimento|dividendo|jcp|fii/.test(combined)) return "Investimentos";
    if (/freelan|freela|serviço|servi[cç]/.test(combined)) return "Freelance";
    if (/bônus|bonus|premiação|premiacao/.test(combined)) return "Bônus";
    return "Outros";
  }

  // expense categories
  if (/mercado|supermercado|hortifruti|padaria|açougue|feira/.test(combined))
    return "Mercado";
  if (/aluguel|condomínio|iptu|luz|água|água|gás|energia|internet|telefone/.test(combined))
    return "Moradia";
  if (/uber|99|ônibus|metrô|combustível|gasolina|estacionamento|pedágio|taxi/.test(combined))
    return "Transporte";
  if (/netflix|spotify|cinema|show|restaurante|bar|lanche|ifood|delivery/.test(combined))
    return "Lazer";
  if (/farmácia|remédio|médico|consulta|exame|hospital|plano de saúde/.test(combined))
    return "Saúde";
  if (/escola|faculdade|curso|livro|material/.test(combined))
    return "Educação";
  if (/assinatura|mensalidade|apple|google|amazon/.test(combined))
    return "Assinaturas";
  if (/invest|fii|ação|etf|tesouro|cdb|xp|btg/.test(combined))
    return "Investimentos";

  return "Outros";
}

// ─── Main parser ──────────────────────────────────────────────────────────────

export function parseBankNotification(
  raw: string,
): ParsedTransaction | null {
  const text = raw.trim();
  if (text.length < 5) return null;

  const amount = extractAmount(text);
  if (!amount) return null;

  const { type, confidence } = detectIntent(text);
  const bank = detectBank(text);
  const note = extractNote(text, type);
  const category = suggestCategory(text, type, note);

  return { type, amount, note, category, confidence, bank };
}
