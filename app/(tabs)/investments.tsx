import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { Select } from "@/components/Select";
import {
  ESTIMATED_MONTHLY_YIELD,
  INVESTMENT_FOCUS,
  INVESTMENT_IDEAS,
  INVESTMENT_TYPES,
  type InvestmentType,
} from "@/constants/categories";
import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import {
  formatBRL,
  formatDateBR,
  parseBRLNumber,
  parseDateBR,
  todayISO,
} from "@/lib/format";
import { fetchQuote } from "@/lib/marketApi";

const TYPE_LABELS: Record<InvestmentType, string> = {
  fii: "FII",
  etf: "ETF",
  stock: "Ação",
  cdb: "CDB",
  treasury: "Tesouro",
};

const PRICEABLE_TYPES: InvestmentType[] = ["fii", "etf", "stock"];

function isPriceable(t: InvestmentType): boolean {
  return PRICEABLE_TYPES.includes(t);
}

function formatTimestamp(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function InvestmentsScreen() {
  const colors = useColors();
  const {
    investments,
    investmentFocus,
    setInvestmentFocus,
    addInvestment,
    deleteInvestment,
    metrics,
    goals,
    setGoals,
    refreshMarketPrices,
    refreshing,
    marketRefreshedAt,
  } = useFinance();

  const [type, setType] = useState<InvestmentType>("fii");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [quantityText, setQuantityText] = useState("");
  const [dateText, setDateText] = useState(formatDateBR(todayISO()));
  const [yieldText, setYieldText] = useState("");
  const [nextPaymentText, setNextPaymentText] = useState("");
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{
    price: number;
    name: string;
    at: string;
  } | null>(null);

  const [passiveIncomeText, setPassiveIncomeText] = useState("");
  const [investedPatrimonyText, setInvestedPatrimonyText] = useState("");

  useEffect(() => {
    setPassiveIncomeText(
      goals.passiveIncome > 0
        ? String(goals.passiveIncome).replace(".", ",")
        : "",
    );
    setInvestedPatrimonyText(
      goals.investedPatrimony > 0
        ? String(goals.investedPatrimony).replace(".", ",")
        : "",
    );
  }, [goals.passiveIncome, goals.investedPatrimony]);

  useEffect(() => {
    refreshMarketPrices(false).catch(() => {});
  }, [refreshMarketPrices]);

  const ideas = INVESTMENT_IDEAS[investmentFocus];

  const focusLabel = useMemo(
    () =>
      INVESTMENT_FOCUS.find((f) => f.value === investmentFocus)?.label ??
      "Explorando",
    [investmentFocus],
  );

  const amountNumber = parseBRLNumber(amountText);
  const yieldNumber = yieldText
    ? parseBRLNumber(yieldText)
    : ESTIMATED_MONTHLY_YIELD[type];
  const previewMonthly = amountNumber * (yieldNumber / 100);
  const previewYearly = previewMonthly * 12;

  const handleLookup = async () => {
    if (!code.trim()) {
      const message = "Informe o código do ativo (ex.: HGLG11) antes de buscar.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Buscar cotação", message);
      return;
    }
    setLookupLoading(true);
    setLookupResult(null);
    try {
      const quote = await fetchQuote(code.trim());
      setLookupResult({
        price: quote.price,
        name: quote.shortName || quote.longName || "",
        at: quote.regularMarketTime,
      });
      if (!name && (quote.shortName || quote.longName)) {
        setName((quote.shortName || quote.longName || "").trim());
      }
      const qty = parseBRLNumber(quantityText);
      if (qty > 0 && !amountText) {
        setAmountText(
          (qty * quote.price).toFixed(2).replace(".", ","),
        );
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Não foi possível buscar.";
      if (Platform.OS === "web") window.alert(message);
      else Alert.alert("Buscar cotação", message);
    } finally {
      setLookupLoading(false);
    }
  };

  const submit = () => {
    if (amountNumber <= 0 || !code.trim()) {
      const message = !code.trim()
        ? "Informe o código ou referência do ativo."
        : "Informe um valor maior que zero.";
      if (Platform.OS === "web") {
        window.alert(message);
      } else {
        Alert.alert("Dados incompletos", message);
      }
      return;
    }
    const isoDate = parseDateBR(dateText) ?? todayISO();
    const isoNext = nextPaymentText
      ? parseDateBR(nextPaymentText) ?? undefined
      : undefined;
    const qtyNumber = parseBRLNumber(quantityText);
    addInvestment({
      type,
      code: code.trim().toUpperCase(),
      name: name.trim() || undefined,
      amount: amountNumber,
      quantity:
        isPriceable(type) && qtyNumber > 0 ? qtyNumber : undefined,
      date: isoDate,
      monthlyYield: yieldText ? parseBRLNumber(yieldText) : undefined,
      nextPayment: isoNext,
      lastPrice: lookupResult?.price,
      lastPriceAt: lookupResult?.at,
    });
    setCode("");
    setName("");
    setAmountText("");
    setQuantityText("");
    setYieldText("");
    setNextPaymentText("");
    setDateText(formatDateBR(todayISO()));
    setLookupResult(null);
    if (isPriceable(type)) {
      refreshMarketPrices(true).catch(() => {});
    }
  };

  const confirmDelete = (id: string) => {
    if (Platform.OS === "web") {
      if (window.confirm("Remover este investimento?")) deleteInvestment(id);
      return;
    }
    Alert.alert(
      "Remover investimento",
      "Isso também apaga o lançamento de saída relacionado.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: () => deleteInvestment(id),
        },
      ],
    );
  };

  const handleManualRefresh = async () => {
    const result = await refreshMarketPrices(true);
    if (Platform.OS === "web" || result.failed === 0) return;
    Alert.alert(
      "Atualização parcial",
      `${result.updated} cotação(ões) atualizada(s). ${result.failed} falhou(aram).`,
    );
  };

  const showQuantityField = isPriceable(type);
  const hasPriceableInWallet = investments.some((i) => isPriceable(i.type));

  return (
    <Screen
      title="Investimentos"
      subtitle="Construir patrimônio com clareza, sem fórmulas mágicas"
    >
      <Card>
        <SectionHeader
          eyebrow="Investimentos"
          title="Ideias para crescer com intenção"
          tag={focusLabel}
          tagColor={colors.invest}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Sugestões educativas para organizar suas decisões. Sem promessa de
          retorno — escolha sempre olhando seu objetivo.
        </Text>
        <Select
          label="Objetivo principal"
          value={investmentFocus}
          options={INVESTMENT_FOCUS.map((f) => ({
            value: f.value,
            label: f.label,
          }))}
          onChange={(v) => setInvestmentFocus(v as typeof investmentFocus)}
        />
        <View style={styles.ideaList}>
          {ideas.map((idea) => (
            <View
              key={idea.code}
              style={[
                styles.ideaCard,
                {
                  backgroundColor: colors.investSoft,
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.ideaHeader}>
                <Text style={[styles.ideaCode, { color: colors.invest }]}>
                  {idea.code}
                </Text>
                <View
                  style={[styles.ideaTag, { backgroundColor: colors.invest }]}
                >
                  <Text style={styles.ideaTagText}>
                    {TYPE_LABELS[idea.type]}
                  </Text>
                </View>
              </View>
              <Text
                style={[styles.ideaName, { color: colors.foreground }]}
                numberOfLines={2}
              >
                {idea.name}
              </Text>
              <Text
                style={[styles.ideaReason, { color: colors.mutedForeground }]}
              >
                {idea.reason}
              </Text>
              <Pressable
                onPress={() => {
                  setType(idea.type);
                  setCode(idea.code);
                  setName(idea.name);
                  setLookupResult(null);
                }}
                hitSlop={6}
                style={({ pressed }) => [
                  styles.ideaCta,
                  { opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <Feather name="plus" size={12} color={colors.invest} />
                <Text style={[styles.ideaCtaText, { color: colors.invest }]}>
                  Usar no formulário
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Registro de investimento"
          title="Lançar aporte e acompanhar retorno"
          tag="Saída inteligente"
          tagColor={colors.invest}
        />
        <View style={styles.row}>
          <Select
            label="Tipo"
            value={type}
            options={INVESTMENT_TYPES.map((t) => ({
              value: t.value,
              label: t.label,
            }))}
            onChange={(v) => {
              setType(v as InvestmentType);
              setLookupResult(null);
            }}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Código ou referência"
            value={code}
            onChangeText={(v) => {
              setCode(v);
              setLookupResult(null);
            }}
            placeholder="Ex.: XPML11"
            autoCapitalize="characters"
            containerStyle={styles.flex1}
          />
          <Input
            label="Nome resumido"
            value={name}
            onChangeText={setName}
            placeholder="Ex.: FII de shoppings"
            containerStyle={styles.flex1}
          />
        </View>
        {showQuantityField ? (
          <View style={styles.row}>
            <Input
              label="Cotas / quantidade"
              value={quantityText}
              onChangeText={setQuantityText}
              placeholder="Ex.: 10"
              keyboardType="decimal-pad"
              containerStyle={styles.flex1}
            />
            <View style={styles.lookupBtnWrap}>
              <Pressable
                onPress={handleLookup}
                disabled={lookupLoading}
                style={({ pressed }) => [
                  styles.lookupBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: lookupLoading || pressed ? 0.7 : 1,
                  },
                ]}
              >
                {lookupLoading ? (
                  <ActivityIndicator
                    size="small"
                    color={colors.primaryForeground}
                  />
                ) : (
                  <Feather
                    name="search"
                    size={14}
                    color={colors.primaryForeground}
                  />
                )}
                <Text
                  style={[
                    styles.lookupBtnText,
                    { color: colors.primaryForeground },
                  ]}
                >
                  Buscar cotação
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        {lookupResult ? (
          <View
            style={[
              styles.lookupResult,
              {
                backgroundColor: colors.netSoft,
                borderColor: colors.net,
              },
            ]}
          >
            <Feather name="check-circle" size={14} color={colors.net} />
            <View style={styles.flex1}>
              <Text
                style={[styles.lookupTitle, { color: colors.foreground }]}
                numberOfLines={1}
              >
                {code.toUpperCase()} — {formatBRL(lookupResult.price)}
              </Text>
              <Text style={[styles.lookupMeta, { color: colors.mutedForeground }]}>
                {lookupResult.name
                  ? `${lookupResult.name} • `
                  : ""}
                Atualizado {formatTimestamp(lookupResult.at)}
              </Text>
            </View>
          </View>
        ) : null}
        <View style={styles.row}>
          <Input
            label="Valor investido"
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
          <Input
            label="Data do aporte"
            value={dateText}
            onChangeText={setDateText}
            placeholder="DD/MM/AAAA"
            containerStyle={styles.flex1}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Rendimento mensal estimado (%)"
            value={yieldText}
            onChangeText={setYieldText}
            placeholder={`Ex.: ${ESTIMATED_MONTHLY_YIELD[type]}`}
            keyboardType="decimal-pad"
            containerStyle={styles.flex1}
          />
          <Input
            label="Próximo pagamento"
            value={nextPaymentText}
            onChangeText={setNextPaymentText}
            placeholder="DD/MM/AAAA"
            containerStyle={styles.flex1}
          />
        </View>
        {amountNumber > 0 ? (
          <View
            style={[
              styles.previewBox,
              {
                backgroundColor: colors.muted,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.previewItem}>
              <Text
                style={[styles.previewLabel, { color: colors.mutedForeground }]}
              >
                Rendimento estimado / mês
              </Text>
              <Text style={[styles.previewValue, { color: colors.income }]}>
                {formatBRL(previewMonthly)}
              </Text>
            </View>
            <View style={styles.previewDivider} />
            <View style={styles.previewItem}>
              <Text
                style={[styles.previewLabel, { color: colors.mutedForeground }]}
              >
                Em 12 meses
              </Text>
              <Text style={[styles.previewValue, { color: colors.foreground }]}>
                {formatBRL(previewYearly)}
              </Text>
            </View>
          </View>
        ) : null}
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Ao salvar, registramos automaticamente uma saída em
          &quot;Investimentos&quot; e adicionamos esse item à sua carteira.
        </Text>
        <Button label="Adicionar investimento" onPress={submit} />
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Carteira"
          title="Seus investimentos registrados"
          tag={`${investments.length} ${investments.length === 1 ? "ativo" : "ativos"}`}
        />
        {hasPriceableInWallet ? (
          <View
            style={[
              styles.summaryBox,
              {
                backgroundColor: colors.cardElevated,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.summaryRow}>
              <SummaryItem
                label="Aportado"
                value={formatBRL(metrics.investedTotal)}
              />
              <SummaryItem
                label="Valor de mercado"
                value={formatBRL(metrics.marketTotal)}
              />
              <SummaryItem
                label={metrics.marketProfit >= 0 ? "Lucro" : "Prejuízo"}
                value={`${metrics.marketProfit >= 0 ? "+" : ""}${formatBRL(metrics.marketProfit)}`}
                tone={
                  metrics.marketProfit >= 0 ? colors.income : colors.expense
                }
              />
            </View>
            <View style={styles.refreshRow}>
              <Text
                style={[styles.refreshMeta, { color: colors.mutedForeground }]}
              >
                {marketRefreshedAt
                  ? `Cotações atualizadas em ${formatTimestamp(marketRefreshedAt)}`
                  : "Cotações ainda não atualizadas"}
              </Text>
              <Pressable
                onPress={handleManualRefresh}
                disabled={refreshing}
                hitSlop={8}
                style={({ pressed }) => [
                  styles.refreshBtn,
                  {
                    borderColor: colors.primary,
                    opacity: refreshing || pressed ? 0.6 : 1,
                  },
                ]}
              >
                {refreshing ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : (
                  <Feather
                    name="refresh-cw"
                    size={12}
                    color={colors.primary}
                  />
                )}
                <Text
                  style={[styles.refreshBtnText, { color: colors.primary }]}
                >
                  {refreshing ? "Atualizando" : "Atualizar"}
                </Text>
              </Pressable>
            </View>
          </View>
        ) : null}
        <View style={styles.metaStack}>
          <ProgressBar
            label="Meta de renda passiva"
            current={metrics.estimatedPassiveIncome}
            target={goals.passiveIncome}
            color={colors.income}
          />
          <ProgressBar
            label="Meta de patrimônio investido"
            current={metrics.investedTotal}
            target={goals.investedPatrimony}
            color={colors.invest}
          />
        </View>
        <View style={styles.row}>
          <Input
            label="Renda passiva mensal alvo"
            value={passiveIncomeText}
            onChangeText={setPassiveIncomeText}
            placeholder="Ex.: 500,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
          <Input
            label="Patrimônio investido alvo"
            value={investedPatrimonyText}
            onChangeText={setInvestedPatrimonyText}
            placeholder="Ex.: 20000,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
        </View>
        <Button
          variant="secondary"
          label="Salvar metas de investimento"
          onPress={() =>
            setGoals({
              passiveIncome: parseBRLNumber(passiveIncomeText),
              investedPatrimony: parseBRLNumber(investedPatrimonyText),
            })
          }
        />
        {investments.length === 0 ? (
          <EmptyState
            icon="trending-up"
            title="Nenhum aporte ainda"
            description="Use o formulário acima ou as ideias para começar"
          />
        ) : (
          <View style={styles.list}>
            {investments.map((inv) => {
              const monthly = inv.amount * ((inv.monthlyYield ?? 0) / 100);
              const hasMarket =
                isPriceable(inv.type) &&
                inv.lastPrice != null &&
                inv.quantity != null &&
                inv.quantity > 0;
              const marketValue = hasMarket
                ? (inv.lastPrice ?? 0) * (inv.quantity ?? 0)
                : null;
              const profit =
                marketValue != null ? marketValue - inv.amount : null;
              const profitPct =
                profit != null && inv.amount > 0
                  ? (profit / inv.amount) * 100
                  : null;
              return (
                <View
                  key={inv.id}
                  style={[
                    styles.invCard,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.invHeader}>
                    <View style={styles.invIdentity}>
                      <Text
                        style={[styles.invCode, { color: colors.foreground }]}
                      >
                        {inv.code}
                      </Text>
                      <View
                        style={[
                          styles.invTypeTag,
                          { backgroundColor: colors.invest },
                        ]}
                      >
                        <Text style={styles.ideaTagText}>
                          {TYPE_LABELS[inv.type]}
                        </Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => confirmDelete(inv.id)}
                      hitSlop={8}
                    >
                      <Feather
                        name="trash-2"
                        size={16}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                  {inv.name ? (
                    <Text
                      style={[styles.invName, { color: colors.mutedForeground }]}
                    >
                      {inv.name}
                    </Text>
                  ) : null}
                  <View style={styles.invMetricsRow}>
                    <InvMetric label="Aporte" value={formatBRL(inv.amount)} />
                    <InvMetric
                      label="Rendimento estimado/mês"
                      value={formatBRL(monthly)}
                      tone={colors.income}
                    />
                  </View>
                  {hasMarket ? (
                    <View
                      style={[
                        styles.marketBox,
                        {
                          backgroundColor: colors.cardElevated,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.marketRow}>
                        <View style={styles.flex1}>
                          <Text
                            style={[
                              styles.marketLabel,
                              { color: colors.mutedForeground },
                            ]}
                          >
                            {inv.quantity} {inv.quantity === 1 ? "cota" : "cotas"} • Preço {formatBRL(inv.lastPrice ?? 0)}
                          </Text>
                          <Text
                            style={[
                              styles.marketValue,
                              { color: colors.foreground },
                            ]}
                          >
                            {formatBRL(marketValue ?? 0)}
                          </Text>
                        </View>
                        <View style={styles.marketProfit}>
                          <Text
                            style={[
                              styles.profitValue,
                              {
                                color:
                                  (profit ?? 0) >= 0
                                    ? colors.income
                                    : colors.expense,
                              },
                            ]}
                          >
                            {(profit ?? 0) >= 0 ? "+" : ""}
                            {formatBRL(profit ?? 0)}
                          </Text>
                          {profitPct != null ? (
                            <Text
                              style={[
                                styles.profitPct,
                                {
                                  color:
                                    profitPct >= 0
                                      ? colors.income
                                      : colors.expense,
                                },
                              ]}
                            >
                              {profitPct >= 0 ? "+" : ""}
                              {profitPct.toFixed(2)}%
                            </Text>
                          ) : null}
                        </View>
                      </View>
                      <Text
                        style={[
                          styles.marketMeta,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Cotação de {formatTimestamp(inv.lastPriceAt)}
                      </Text>
                    </View>
                  ) : isPriceable(inv.type) ? (
                    <View
                      style={[
                        styles.marketBox,
                        {
                          backgroundColor: colors.muted,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.marketMeta,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        {inv.lastPriceError
                          ? `Cotação indisponível: ${inv.lastPriceError}`
                          : "Defina a quantidade de cotas e busque a cotação para ver o valor de mercado."}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.invFooter}>
                    <Text
                      style={[
                        styles.invFooterText,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Aporte em {formatDateBR(inv.date)}
                    </Text>
                    {inv.nextPayment ? (
                      <Text
                        style={[
                          styles.invFooterText,
                          { color: colors.mutedForeground },
                        ]}
                      >
                        Próx. pagamento {formatDateBR(inv.nextPayment)}
                      </Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function InvMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.invMetric}>
      <Text style={[styles.invMetricLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.invMetricValue, { color: tone ?? colors.foreground }]}
      >
        {value}
      </Text>
    </View>
  );
}

function SummaryItem({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.summaryItem}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: tone ?? colors.foreground }]}>
        {value}
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
  row: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: { flex: 1 },
  ideaList: {
    gap: 10,
  },
  ideaCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 6,
  },
  ideaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  ideaCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  ideaTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  ideaTagText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
    color: "#ffffff",
    letterSpacing: 0.5,
  },
  ideaName: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  ideaReason: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  ideaCta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  ideaCtaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  metaStack: {
    gap: 14,
  },
  list: {
    gap: 12,
  },
  invCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 8,
  },
  invHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  invIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  invCode: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  invTypeTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  invName: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  invMetricsRow: {
    flexDirection: "row",
    gap: 14,
  },
  invMetric: {
    flex: 1,
  },
  invMetricLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  invMetricValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  invFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  invFooterText: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
  },
  lookupBtnWrap: {
    flex: 1,
    justifyContent: "flex-end",
    paddingBottom: 2,
  },
  lookupBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
  },
  lookupBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  lookupResult: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  lookupTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  lookupMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
  previewBox: {
    flexDirection: "row",
    alignItems: "stretch",
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  previewItem: {
    flex: 1,
    gap: 4,
  },
  previewDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  previewLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  previewValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  summaryBox: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 8,
  },
  summaryItem: {
    flex: 1,
    gap: 2,
  },
  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  refreshRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  refreshMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    flex: 1,
  },
  refreshBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  refreshBtnText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  marketBox: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 6,
  },
  marketRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  marketLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  marketValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginTop: 2,
  },
  marketProfit: {
    alignItems: "flex-end",
  },
  profitValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  profitPct: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  marketMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
