import { Feather } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Screen } from "@/components/Screen";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useFinance,
  type BankAccount,
  type Investment,
  type SavingGoal,
  type Transaction,
  type TransactionType,
} from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import { formatBRL, formatDateBR } from "@/lib/format";

type ReportPeriod = "weekly" | "monthly";
type FinanceSnapshot = ReturnType<typeof useFinance>;
type Metrics = FinanceSnapshot["metrics"];

interface PeriodRange {
  startISO: string;
  endISO: string;
  title: string;
  fileSuffix: string;
}

interface CategoryTotal {
  category: string;
  total: number;
}

interface ReportData {
  period: ReportPeriod;
  range: PeriodRange;
  transactions: Transaction[];
  income: number;
  expense: number;
  net: number;
  topExpenses: CategoryTotal[];
  topIncome: CategoryTotal[];
  metrics: Metrics;
  investments: Investment[];
  bankAccounts: BankAccount[];
  savingGoals: SavingGoal[];
}

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
];

function dateToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function getPeriodRange(period: ReportPeriod): PeriodRange {
  const now = new Date();

  if (period === "weekly") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekday = start.getDay();
    const diffToMonday = weekday === 0 ? -6 : 1 - weekday;
    start.setDate(start.getDate() + diffToMonday);

    const end = new Date(start);
    end.setDate(start.getDate() + 6);

    const startISO = dateToISO(start);
    const endISO = dateToISO(end);
    return {
      startISO,
      endISO,
      title: `Semana de ${formatLongDate(startISO)} a ${formatLongDate(endISO)}`,
      fileSuffix: `${startISO}_a_${endISO}`,
    };
  }

  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const startISO = dateToISO(start);
  const endISO = dateToISO(end);
  const monthLabel = start.toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return {
    startISO,
    endISO,
    title: `Mês de ${monthLabel}`,
    fileSuffix: startISO.slice(0, 7),
  };
}

function getCategoryTotals(
  transactions: Transaction[],
  type: TransactionType,
): CategoryTotal[] {
  const totals = new Map<string, number>();
  for (const transaction of transactions) {
    if (transaction.type !== type) continue;
    totals.set(
      transaction.category,
      (totals.get(transaction.category) ?? 0) + transaction.amount,
    );
  }
  return Array.from(totals.entries())
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total);
}

function buildReportData(
  period: ReportPeriod,
  transactions: Transaction[],
  investments: Investment[],
  bankAccounts: BankAccount[],
  savingGoals: SavingGoal[],
  metrics: Metrics,
): ReportData {
  const range = getPeriodRange(period);
  const periodTransactions = transactions
    .filter((transaction) => {
      return transaction.date >= range.startISO && transaction.date <= range.endISO;
    })
    .sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });

  const income = periodTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expense = periodTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((sum, transaction) => sum + transaction.amount, 0);

  return {
    period,
    range,
    transactions: periodTransactions,
    income,
    expense,
    net: income - expense,
    topExpenses: getCategoryTotals(periodTransactions, "expense"),
    topIncome: getCategoryTotals(periodTransactions, "income"),
    metrics,
    investments,
    bankAccounts,
    savingGoals,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function reportKindLabel(period: ReportPeriod): string {
  return period === "weekly" ? "Relatório semanal" : "Relatório mensal";
}

function buildPlainTextReport(report: ReportData): string {
  const expenseLines = report.topExpenses.slice(0, 5).map((item, index) => {
    return `${index + 1}. ${item.category}: ${formatBRL(item.total)}`;
  });

  return [
    `${reportKindLabel(report.period)} - Minhas Finanças`,
    report.range.title,
    "",
    `Entradas: ${formatBRL(report.income)}`,
    `Saídas: ${formatBRL(report.expense)}`,
    `Resultado: ${formatBRL(report.net)}`,
    `Saldo total no app: ${formatBRL(report.metrics.balance)}`,
    "",
    "Maiores gastos:",
    expenseLines.length > 0 ? expenseLines.join("\n") : "Sem gastos nesse período.",
    "",
    `Gerado em ${new Date().toLocaleString("pt-BR")}`,
  ].join("\n");
}

function htmlRows(rows: string[]): string {
  if (rows.length === 0) {
    return `<tr><td colspan="3" class="muted">Nenhum item neste período.</td></tr>`;
  }
  return rows.join("");
}

function buildCategoryRows(items: CategoryTotal[]): string {
  return htmlRows(
    items.slice(0, 8).map((item) => {
      return `<tr><td>${escapeHtml(item.category)}</td><td class="right">${formatBRL(item.total)}</td></tr>`;
    }),
  );
}

function buildTransactionRows(transactions: Transaction[]): string {
  return htmlRows(
    transactions.slice(0, 40).map((transaction) => {
      const sign = transaction.type === "income" ? "+" : "-";
      const tone = transaction.type === "income" ? "income" : "expense";
      return `<tr>
        <td>${formatDateBR(transaction.date)}</td>
        <td>
          <strong>${escapeHtml(transaction.category)}</strong>
          ${transaction.note ? `<br /><span class="muted">${escapeHtml(transaction.note)}</span>` : ""}
        </td>
        <td class="right ${tone}">${sign} ${formatBRL(transaction.amount)}</td>
      </tr>`;
    }),
  );
}

function buildGoalRows(report: ReportData): string {
  return htmlRows(
    report.savingGoals.map((goal) => {
      const current = report.metrics.goalProgress[goal.categoryTag] ?? 0;
      const percent =
        goal.targetAmount > 0 ? Math.min(100, (current / goal.targetAmount) * 100) : 0;
      return `<tr>
        <td>${escapeHtml(goal.emoji)} ${escapeHtml(goal.name)}</td>
        <td>${formatBRL(current)} de ${formatBRL(goal.targetAmount)}</td>
        <td class="right">${percent.toFixed(0)}%</td>
      </tr>`;
    }),
  );
}

function buildBankRows(bankAccounts: BankAccount[]): string {
  return htmlRows(
    bankAccounts.map((account) => {
      const name = account.nickname
        ? `${account.bankName} - ${account.nickname}`
        : account.bankName;
      return `<tr>
        <td>${escapeHtml(name)}</td>
        <td>${escapeHtml(account.accountType)}</td>
        <td class="right">${formatBRL(account.balance)}</td>
      </tr>`;
    }),
  );
}

function buildInvestmentRows(investments: Investment[]): string {
  return htmlRows(
    investments.map((investment) => {
      const label = investment.name
        ? `${investment.code} - ${investment.name}`
        : investment.code;
      return `<tr>
        <td>${escapeHtml(label || "Investimento")}</td>
        <td>${escapeHtml(investment.type)}</td>
        <td class="right">${formatBRL(investment.amount)}</td>
      </tr>`;
    }),
  );
}

function buildReportHtml(report: ReportData): string {
  const generatedAt = new Date().toLocaleString("pt-BR");
  const positiveNet = report.net >= 0;

  return `<!doctype html>
  <html lang="pt-BR">
    <head>
      <meta charset="utf-8" />
      <title>${escapeHtml(reportKindLabel(report.period))}</title>
      <style>
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 28px;
          background: #f4f7fb;
          color: #0f172a;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          font-size: 13px;
        }
        .page {
          background: #ffffff;
          border-radius: 22px;
          padding: 28px;
          border: 1px solid #dce5f2;
        }
        .brand {
          color: #14b8a6;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
          text-transform: uppercase;
        }
        h1 {
          margin: 6px 0 4px;
          font-size: 28px;
        }
        h2 {
          margin: 0 0 12px;
          font-size: 17px;
        }
        .muted { color: #64748b; }
        .grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin: 22px 0;
        }
        .metric {
          border-radius: 16px;
          border: 1px solid #dce5f2;
          padding: 14px;
          background: #f8fafc;
        }
        .label {
          color: #64748b;
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: .7px;
        }
        .value {
          margin-top: 5px;
          font-size: 21px;
          font-weight: 800;
        }
        .income { color: #16a34a; }
        .expense { color: #dc2626; }
        .net-positive { color: #0f766e; }
        .net-negative { color: #dc2626; }
        section {
          margin-top: 24px;
          break-inside: avoid;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          overflow: hidden;
          border-radius: 14px;
          border: 1px solid #e2e8f0;
        }
        th, td {
          padding: 10px 11px;
          border-bottom: 1px solid #e2e8f0;
          vertical-align: top;
        }
        th {
          background: #ecfeff;
          color: #0f766e;
          text-align: left;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: .7px;
        }
        tr:last-child td { border-bottom: 0; }
        .right { text-align: right; }
        .footer {
          margin-top: 26px;
          color: #64748b;
          font-size: 11px;
          text-align: center;
        }
      </style>
    </head>
    <body>
      <div class="page">
        <div class="brand">Minhas Finanças</div>
        <h1>${escapeHtml(reportKindLabel(report.period))}</h1>
        <div class="muted">${escapeHtml(report.range.title)} • Gerado em ${escapeHtml(generatedAt)}</div>

        <div class="grid">
          <div class="metric">
            <div class="label">Entradas no período</div>
            <div class="value income">${formatBRL(report.income)}</div>
          </div>
          <div class="metric">
            <div class="label">Saídas no período</div>
            <div class="value expense">${formatBRL(report.expense)}</div>
          </div>
          <div class="metric">
            <div class="label">Resultado</div>
            <div class="value ${positiveNet ? "net-positive" : "net-negative"}">${formatBRL(report.net)}</div>
          </div>
          <div class="metric">
            <div class="label">Saldo total no app</div>
            <div class="value">${formatBRL(report.metrics.balance)}</div>
          </div>
        </div>

        <section>
          <h2>Maiores gastos por categoria</h2>
          <table>
            <thead><tr><th>Categoria</th><th class="right">Total</th></tr></thead>
            <tbody>${buildCategoryRows(report.topExpenses)}</tbody>
          </table>
        </section>

        <section>
          <h2>Entradas por categoria</h2>
          <table>
            <thead><tr><th>Categoria</th><th class="right">Total</th></tr></thead>
            <tbody>${buildCategoryRows(report.topIncome)}</tbody>
          </table>
        </section>

        <section>
          <h2>Lançamentos do período</h2>
          <table>
            <thead><tr><th>Data</th><th>Descrição</th><th class="right">Valor</th></tr></thead>
            <tbody>${buildTransactionRows(report.transactions)}</tbody>
          </table>
        </section>

        <section>
          <h2>Metas</h2>
          <table>
            <thead><tr><th>Meta</th><th>Progresso</th><th class="right">%</th></tr></thead>
            <tbody>${buildGoalRows(report)}</tbody>
          </table>
        </section>

        <section>
          <h2>Contas e bancos</h2>
          <table>
            <thead><tr><th>Conta</th><th>Tipo</th><th class="right">Saldo</th></tr></thead>
            <tbody>${buildBankRows(report.bankAccounts)}</tbody>
          </table>
        </section>

        <section>
          <h2>Investimentos</h2>
          <table>
            <thead><tr><th>Ativo</th><th>Tipo</th><th class="right">Valor aplicado</th></tr></thead>
            <tbody>${buildInvestmentRows(report.investments)}</tbody>
          </table>
        </section>

        <div class="footer">
          Relatório gerado localmente no app Minhas Finanças. Confira os dados antes de enviar.
        </div>
      </div>
    </body>
  </html>`;
}

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function ReportsScreen() {
  const colors = useColors();
  const {
    transactions,
    investments,
    bankAccounts,
    savingGoals,
    metrics,
  } = useFinance();
  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [sharingText, setSharingText] = useState(false);

  const report = useMemo(
    () =>
      buildReportData(
        period,
        transactions,
        investments,
        bankAccounts,
        savingGoals,
        metrics,
      ),
    [period, transactions, investments, bankAccounts, savingGoals, metrics],
  );

  const handleShareText = async () => {
    setSharingText(true);
    try {
      await Share.share({
        title: reportKindLabel(period),
        message: buildPlainTextReport(report),
      });
    } catch {
      showMessage("Não foi possível compartilhar", "Tente gerar o PDF e enviar por lá.");
    } finally {
      setSharingText(false);
    }
  };

  const handleGeneratePdf = async () => {
    setGeneratingPdf(true);
    try {
      const html = buildReportHtml(report);
      const file = await Print.printToFileAsync({
        html,
        base64: false,
      });

      if (Platform.OS === "web") {
        showMessage(
          "PDF gerado",
          "No computador, use a opção de imprimir/salvar em PDF do navegador.",
        );
        return;
      }

      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showMessage(
          "PDF criado",
          `Arquivo gerado em: ${file.uri}`,
        );
        return;
      }

      await Sharing.shareAsync(file.uri, {
        mimeType: "application/pdf",
        dialogTitle: "Enviar ou salvar relatório",
        UTI: "com.adobe.pdf",
      });
    } catch {
      showMessage(
        "Erro ao gerar PDF",
        "Não consegui criar o relatório agora. Confira se o app está atualizado e tente novamente.",
      );
    } finally {
      setGeneratingPdf(false);
    }
  };

  const positiveNet = report.net >= 0;
  const latestTransactions = report.transactions.slice(0, 5);

  return (
    <Screen
      title="Relatórios"
      subtitle="Gere um resumo semanal ou mensal para enviar por WhatsApp, e-mail ou salvar em PDF"
    >
      <Card>
        <SectionHeader
          eyebrow="Período"
          title="Escolha o relatório"
          tag={period === "weekly" ? "Semana atual" : "Mês atual"}
          tagColor={colors.primary}
        />
        <SegmentedControl
          segments={PERIOD_OPTIONS}
          value={period}
          onChange={(value) => setPeriod(value as ReportPeriod)}
          activeColor={colors.primary}
        />
        <View
          style={[
            styles.periodBox,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          <Feather name="calendar" size={17} color={colors.primary} />
          <Text style={[styles.periodText, { color: colors.foreground }]}>
            {report.range.title}
          </Text>
        </View>
      </Card>

      <View style={styles.metricsGrid}>
        <MiniMetric label="Entradas" value={report.income} color={colors.income} />
        <MiniMetric label="Saídas" value={report.expense} color={colors.expense} />
        <MiniMetric
          label="Resultado"
          value={report.net}
          color={positiveNet ? colors.income : colors.expense}
        />
        <MiniMetric label="Lançamentos" textValue={String(report.transactions.length)} />
      </View>

      <Card>
        <SectionHeader
          eyebrow="PDF e envio"
          title="Enviar, baixar ou salvar"
          tag="Novo"
          tagColor={colors.income}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          O PDF é criado no seu celular. Depois o Android abre as opções para
          enviar no WhatsApp, e-mail, Drive ou salvar onde preferir.
        </Text>
        <Button
          label="Gerar PDF para enviar/baixar"
          onPress={handleGeneratePdf}
          loading={generatingPdf}
          icon={<Feather name="file-text" size={18} color={colors.primaryForeground} />}
        />
        <Button
          variant="secondary"
          label="Compartilhar resumo em texto"
          onPress={handleShareText}
          loading={sharingText}
          icon={<Feather name="share-2" size={18} color={colors.foreground} />}
        />
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Prévia"
          title="O que vai no relatório"
          tag={`${report.transactions.length} itens`}
        />
        {latestTransactions.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Sem lançamentos no período"
            description="Mesmo assim o PDF sai com saldo, metas, bancos e investimentos cadastrados."
          />
        ) : (
          <View style={styles.list}>
            {latestTransactions.map((transaction) => {
              const isIncome = transaction.type === "income";
              const tone = isIncome ? colors.income : colors.expense;
              return (
                <View key={transaction.id} style={styles.txRow}>
                  <View
                    style={[
                      styles.bullet,
                      { backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft },
                    ]}
                  >
                    <Feather
                      name={isIncome ? "arrow-down-left" : "arrow-up-right"}
                      size={16}
                      color={tone}
                    />
                  </View>
                  <View style={styles.flex1}>
                    <Text style={[styles.txTitle, { color: colors.foreground }]}>
                      {transaction.category}
                    </Text>
                    <Text style={[styles.txSub, { color: colors.mutedForeground }]}>
                      {formatDateBR(transaction.date)}
                      {transaction.note ? ` • ${transaction.note}` : ""}
                    </Text>
                  </View>
                  <Text style={[styles.txValue, { color: tone }]}>
                    {isIncome ? "+" : "-"} {formatBRL(transaction.amount)}
                  </Text>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      <Card>
        <SectionHeader eyebrow="Segurança dos dados" title="Atualização sem apagar nada" />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Esta tela só lê os dados já cadastrados. Para manter tudo no celular,
          instale a atualização por cima do app atual e não desinstale o app antigo.
        </Text>
      </Card>
    </Screen>
  );
}

function MiniMetric({
  label,
  value,
  textValue,
  color,
}: {
  label: string;
  value?: number;
  textValue?: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.metric,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.metricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.metricValue, { color: color ?? colors.foreground }]}>
        {textValue ?? formatBRL(value ?? 0)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  periodBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 13,
  },
  periodText: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metric: {
    width: "48%",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  metricLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  metricValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
  },
  list: {
    gap: 12,
  },
  txRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  bullet: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  flex1: {
    flex: 1,
  },
  txTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  txSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  txValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
});
