export const DEFAULT_INCOME_CATEGORIES = [
  "Salário",
  "Freelance",
  "Bônus",
  "Investimentos",
  "Outros",
];

export const DEFAULT_EXPENSE_CATEGORIES = [
  "Mercado",
  "Moradia",
  "Transporte",
  "Lazer",
  "Saúde",
  "Educação",
  "Assinaturas",
  "Investimentos",
  "Outros",
];

export const INVESTMENT_TYPES = [
  { value: "fii", label: "FII (Fundo Imobiliário)" },
  { value: "etf", label: "ETF" },
  { value: "stock", label: "Ação" },
  { value: "cdb", label: "CDB" },
  { value: "treasury", label: "Tesouro Direto" },
] as const;

export const INVESTMENT_FOCUS = [
  { value: "income", label: "Gerar renda mensal" },
  { value: "reserve", label: "Reserva com segurança" },
  { value: "growth", label: "Crescimento longo prazo" },
  { value: "diversification", label: "Diversificar carteira" },
] as const;

export const PERMISSION_LEVELS = [
  { value: "ask", label: "Sempre perguntar" },
  { value: "allow", label: "Permitir" },
  { value: "once", label: "Só desta vez" },
  { value: "deny", label: "Não permitir" },
] as const;

export type InvestmentType = (typeof INVESTMENT_TYPES)[number]["value"];
export type InvestmentFocus = (typeof INVESTMENT_FOCUS)[number]["value"];
export type PermissionLevel = (typeof PERMISSION_LEVELS)[number]["value"];

export const INVESTMENT_IDEAS: Record<
  InvestmentFocus,
  { code: string; type: InvestmentType; name: string; reason: string }[]
> = {
  income: [
    {
      code: "XPML11",
      type: "fii",
      name: "FII de shoppings",
      reason: "Distribui rendimento mensal isento de IR.",
    },
    {
      code: "KNCR11",
      type: "fii",
      name: "FII de papel (CRI)",
      reason: "Renda atrelada ao CDI, baixa volatilidade.",
    },
    {
      code: "BBAS3",
      type: "stock",
      name: "Ação pagadora de dividendos",
      reason: "Histórico consistente de proventos.",
    },
  ],
  reserve: [
    {
      code: "TESOURO SELIC 2029",
      type: "treasury",
      name: "Tesouro Selic",
      reason: "Liquidez diária e baixo risco para reserva.",
    },
    {
      code: "CDB 100% CDI",
      type: "cdb",
      name: "CDB de banco grande",
      reason: "Garantido pelo FGC até R$ 250 mil.",
    },
  ],
  growth: [
    {
      code: "BOVA11",
      type: "etf",
      name: "ETF de Ibovespa",
      reason: "Exposição ampla ao mercado brasileiro.",
    },
    {
      code: "IVVB11",
      type: "etf",
      name: "ETF do S&P 500",
      reason: "Diversificação no mercado americano.",
    },
  ],
  diversification: [
    {
      code: "HGLG11",
      type: "fii",
      name: "FII de logística",
      reason: "Setor diferente para equilibrar a carteira.",
    },
    {
      code: "IVVB11",
      type: "etf",
      name: "ETF internacional",
      reason: "Reduz exposição apenas ao Brasil.",
    },
    {
      code: "TESOURO IPCA+ 2035",
      type: "treasury",
      name: "Tesouro IPCA+",
      reason: "Protege o patrimônio da inflação.",
    },
  ],
};

export const ESTIMATED_MONTHLY_YIELD: Record<InvestmentType, number> = {
  fii: 0.85,
  etf: 0.6,
  stock: 0.5,
  cdb: 0.9,
  treasury: 0.85,
};
