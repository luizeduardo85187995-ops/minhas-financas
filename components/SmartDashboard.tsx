import { Feather } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Svg, {
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from "react-native-svg";

import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import {
  formatBRL,
  lastSixMonthKeys,
  monthKey,
  monthLabel,
  todayISO,
} from "@/lib/format";

type Tab = "flow" | "expense" | "income";

interface Insight {
  icon: keyof typeof Feather.glyphMap;
  text: string;
  tone: "good" | "warn" | "alert" | "info";
}

const CHART_HEIGHT = 180;

function prevMonthKey(key: string): string {
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function SmartDashboard() {
  const colors = useColors();
  const { transactions, investments, goals, savingGoals, metrics, bankAccounts } =
    useFinance();

  const [activeTab, setActiveTab] = useState<Tab>("flow");
  const [chartWidth, setChartWidth] = useState(0);

  const currentMonth = monthKey(todayISO());
  const lastMonth = prevMonthKey(currentMonth);

  const thisMonthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === currentMonth),
    [transactions, currentMonth],
  );
  const lastMonthTx = useMemo(
    () => transactions.filter((t) => monthKey(t.date) === lastMonth),
    [transactions, lastMonth],
  );

  const thisExpense = useMemo(
    () =>
      thisMonthTx
        .filter((t) => t.type === "expense")
        .reduce((a, t) => a + t.amount, 0),
    [thisMonthTx],
  );
  const thisIncome = useMemo(
    () =>
      thisMonthTx
        .filter((t) => t.type === "income")
        .reduce((a, t) => a + t.amount, 0),
    [thisMonthTx],
  );
  const lastExpense = useMemo(
    () =>
      lastMonthTx
        .filter((t) => t.type === "expense")
        .reduce((a, t) => a + t.amount, 0),
    [lastMonthTx],
  );

  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of thisMonthTx.filter((t) => t.type === "expense")) {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    }
    return Object.entries(map)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [thisMonthTx]);

  const incomeByCategory = useMemo(() => {
    const map: Record<string, number> = {};
    for (const t of thisMonthTx.filter((t) => t.type === "income")) {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    }
    return Object.entries(map)
      .map(([cat, total]) => ({ cat, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 6);
  }, [thisMonthTx]);

  const insights = useMemo<Insight[]>(() => {
    const list: Insight[] = [];
    const noData = transactions.length === 0;

    if (noData) {
      list.push({
        icon: "info",
        tone: "info",
        text: "Adicione seu primeiro lançamento para receber dicas personalizadas baseadas nos seus dados.",
      });
      return list;
    }

    if (thisMonthTx.length === 0) {
      list.push({
        icon: "alert-circle",
        tone: "warn",
        text: "Nenhum lançamento este mês ainda. Não esqueça de registrar entradas e saídas.",
      });
    }

    if (expenseByCategory.length > 0) {
      const top = expenseByCategory[0];
      const pct =
        thisExpense > 0
          ? Math.round((top.total / thisExpense) * 100)
          : 0;
      list.push({
        icon: "trending-down",
        tone: pct > 50 ? "warn" : "info",
        text: `Seu maior gasto este mês foi em "${top.cat}" — ${formatBRL(top.total)} (${pct}% das saídas).`,
      });
    }

    if (incomeByCategory.length > 0) {
      const top = incomeByCategory[0];
      list.push({
        icon: "trending-up",
        tone: "good",
        text: `Sua principal fonte de renda este mês foi "${top.cat}" — ${formatBRL(top.total)}.`,
      });
    }

    if (thisIncome > 0 && thisExpense > 0) {
      const net = thisIncome - thisExpense;
      const rate = Math.round((net / thisIncome) * 100);
      if (net >= 0) {
        list.push({
          icon: "check-circle",
          tone: rate > 20 ? "good" : "info",
          text: `Você economizou ${formatBRL(net)} este mês — ${rate}% da sua renda. ${rate > 30 ? "Ótima disciplina!" : rate > 10 ? "Bom resultado." : "Ainda dá para melhorar."}`,
        });
      } else {
        list.push({
          icon: "alert-triangle",
          tone: "alert",
          text: `Você gastou ${formatBRL(Math.abs(net))} a mais do que ganhou este mês. Revise as saídas para equilibrar.`,
        });
      }
    }

    if (lastExpense > 0 && thisExpense > 0) {
      const diff = thisExpense - lastExpense;
      const pct = Math.round(Math.abs(diff / lastExpense) * 100);
      if (diff > 0) {
        list.push({
          icon: "arrow-up",
          tone: pct > 20 ? "warn" : "info",
          text: `Seus gastos subiram ${pct}% comparado ao mês passado (+${formatBRL(diff)}).`,
        });
      } else if (diff < 0) {
        list.push({
          icon: "arrow-down",
          tone: "good",
          text: `Você reduziu os gastos em ${pct}% em relação ao mês passado (${formatBRL(diff)}).`,
        });
      }
    }

    if (goals.monthly > 0) {
      const net = metrics.monthNet;
      if (net >= goals.monthly) {
        list.push({
          icon: "award",
          tone: "good",
          text: `Meta mensal de ${formatBRL(goals.monthly)} atingida! Você está em ${formatBRL(net)} de resultado. Parabéns!`,
        });
      } else if (net > 0) {
        const pct = Math.round((net / goals.monthly) * 100);
        list.push({
          icon: "target",
          tone: "info",
          text: `Você está em ${pct}% da sua meta mensal (${formatBRL(net)} de ${formatBRL(goals.monthly)}).`,
        });
      }
    }

    if (investments.length === 0) {
      list.push({
        icon: "briefcase",
        tone: "info",
        text: "Você ainda não tem investimentos registrados. Até pequenos aportes mensais fazem diferença no longo prazo.",
      });
    } else if (metrics.marketProfit > 0) {
      list.push({
        icon: "trending-up",
        tone: "good",
        text: `Sua carteira está ${formatBRL(metrics.marketProfit)} acima do valor aportado. Continue investindo.`,
      });
    }

    if (bankAccounts.length > 0 && metrics.staleBankAccounts > 0) {
      list.push({
        icon: "credit-card",
        tone: "warn",
        text: `${metrics.staleBankAccounts} conta(s) bancaria(s) precisam de saldo atualizado para o resumo ficar confiavel.`,
      });
    }

    if (savingGoals.length > 0) {
      const active = savingGoals.filter(
        (g) => (metrics.goalProgress[g.categoryTag] ?? 0) < g.targetAmount,
      );
      if (active.length > 0) {
        const nearest = active.reduce((best, g) => {
          const bPct =
            (metrics.goalProgress[best.categoryTag] ?? 0) / best.targetAmount;
          const gPct =
            (metrics.goalProgress[g.categoryTag] ?? 0) / g.targetAmount;
          return gPct > bPct ? g : best;
        });
        const pct = Math.round(
          ((metrics.goalProgress[nearest.categoryTag] ?? 0) /
            nearest.targetAmount) *
            100,
        );
        list.push({
          icon: "flag",
          tone: "info",
          text: `Sua meta "${nearest.name}" está em ${pct}%. Lance uma saída com "${nearest.categoryTag}" para avançar.`,
        });
      }
    }

    const allExpenseCats = new Set(
      transactions
        .filter((t) => t.type === "expense")
        .map((t) => t.category),
    );
    const allMonths = new Set(
      transactions.map((t) => monthKey(t.date)),
    );
    for (const cat of allExpenseCats) {
      const months = new Set(
        transactions
          .filter((t) => t.type === "expense" && t.category === cat)
          .map((t) => monthKey(t.date)),
      );
      if (months.size >= 3 && allMonths.size >= 3) {
        const avg =
          transactions
            .filter((t) => t.type === "expense" && t.category === cat)
            .reduce((a, t) => a + t.amount, 0) / months.size;
        list.push({
          icon: "repeat",
          tone: "info",
          text: `"${cat}" é um gasto recorrente — média de ${formatBRL(avg)}/mês nos últimos ${months.size} meses.`,
        });
        break;
      }
    }

    return list.slice(0, 5);
  }, [
    transactions,
    thisMonthTx,
    expenseByCategory,
    incomeByCategory,
    thisExpense,
    thisIncome,
    lastExpense,
    goals.monthly,
    metrics,
    investments.length,
    bankAccounts.length,
    savingGoals,
  ]);

  const flowData = useMemo(() => {
    const keys = lastSixMonthKeys();
    const map = new Map(
      keys.map((k) => [k, { key: k, income: 0, expense: 0, net: 0 }]),
    );
    for (const t of transactions) {
      const entry = map.get(monthKey(t.date));
      if (!entry) continue;
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
    }
    for (const e of map.values()) e.net = e.income - e.expense;
    return keys.map((k) => map.get(k)!);
  }, [transactions]);

  const TONE_CONFIG: Record<
    Insight["tone"],
    { bg: string; border: string; icon: string }
  > = {
    good: {
      bg: `${colors.income}15`,
      border: `${colors.income}55`,
      icon: colors.income,
    },
    warn: {
      bg: `${colors.coin}15`,
      border: `${colors.coin}55`,
      icon: colors.coin,
    },
    alert: {
      bg: `${colors.expense}15`,
      border: `${colors.expense}55`,
      icon: colors.expense,
    },
    info: {
      bg: `${colors.primary}15`,
      border: `${colors.primary}40`,
      icon: colors.primary,
    },
  };

  return (
    <View style={styles.wrap}>
      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        {(
          [
            { key: "flow", label: "Fluxo 6m", icon: "activity" },
            { key: "expense", label: "Gastos", icon: "pie-chart" },
            { key: "income", label: "Entradas", icon: "dollar-sign" },
          ] as const
        ).map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={({ pressed }) => [
              styles.tabBtn,
              activeTab === tab.key && {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
              { opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Feather
              name={tab.icon}
              size={12}
              color={
                activeTab === tab.key ? colors.primary : colors.mutedForeground
              }
            />
            <Text
              style={[
                styles.tabText,
                {
                  color:
                    activeTab === tab.key
                      ? colors.foreground
                      : colors.mutedForeground,
                },
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === "flow" && (
        <FlowChart
          data={flowData}
          width={chartWidth}
          onLayout={(e: LayoutChangeEvent) =>
            setChartWidth(e.nativeEvent.layout.width)
          }
          hasData={transactions.length > 0}
        />
      )}

      {activeTab === "expense" && (
        <CategoryBars
          items={expenseByCategory}
          total={thisExpense}
          color={colors.expense}
          emptyText="Nenhuma saída registrada este mês"
          label="Gastos por categoria — mês atual"
        />
      )}

      {activeTab === "income" && (
        <CategoryBars
          items={incomeByCategory}
          total={thisIncome}
          color={colors.income}
          emptyText="Nenhuma entrada registrada este mês"
          label="Entradas por categoria — mês atual"
        />
      )}

      <View style={styles.insightSection}>
        <View style={styles.insightHeader}>
          <Feather name="zap" size={13} color={colors.coin} />
          <Text style={[styles.insightTitle, { color: colors.foreground }]}>
            Análise automática
          </Text>
        </View>
        {insights.map((ins, i) => {
          const cfg = TONE_CONFIG[ins.tone];
          return (
            <View
              key={i}
              style={[
                styles.insightCard,
                { backgroundColor: cfg.bg, borderColor: cfg.border },
              ]}
            >
              <Feather name={ins.icon} size={14} color={cfg.icon} />
              <Text
                style={[
                  styles.insightText,
                  { color: colors.foreground },
                ]}
              >
                {ins.text}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function FlowChart({
  data,
  width,
  onLayout,
  hasData,
}: {
  data: { key: string; income: number; expense: number; net: number }[];
  width: number;
  onLayout: (e: LayoutChangeEvent) => void;
  hasData: boolean;
}) {
  const colors = useColors();
  const pad = { top: 12, right: 10, bottom: 28, left: 10 };
  const innerW = Math.max(0, width - pad.left - pad.right);
  const innerH = CHART_HEIGHT - pad.top - pad.bottom;

  const allValues = [0, ...data.flatMap((d) => [d.income, d.expense, d.net])];
  const maxV = Math.max(...allValues, 100);
  const minV = Math.min(...allValues, 0);
  const span = maxV - minV || 1;

  const xFor = (i: number) => {
    if (data.length <= 1) return pad.left + innerW / 2;
    return pad.left + i * (innerW / (data.length - 1));
  };
  const yFor = (v: number) =>
    pad.top + (1 - (v - minV) / span) * innerH;

  const buildPath = (key: "income" | "expense" | "net") => {
    if (!width || !data.length) return "";
    return data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`)
      .join(" ");
  };

  const buildArea = (key: "income" | "expense") => {
    if (!width || !data.length) return "";
    const top = data
      .map((d, i) => `${i === 0 ? "M" : "L"} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`)
      .join(" ");
    return `${top} L ${xFor(data.length - 1).toFixed(1)} ${yFor(0).toFixed(1)} L ${xFor(0).toFixed(1)} ${yFor(0).toFixed(1)} Z`;
  };

  const zeroY = yFor(0);

  return (
    <View>
      <View
        onLayout={onLayout}
        style={[styles.chartBox, { borderColor: colors.border }]}
      >
        {width > 0 && (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="ig" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.income} stopOpacity={0.22} />
                <Stop offset="1" stopColor={colors.income} stopOpacity={0.01} />
              </LinearGradient>
              <LinearGradient id="eg" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.expense} stopOpacity={0.16} />
                <Stop offset="1" stopColor={colors.expense} stopOpacity={0.01} />
              </LinearGradient>
            </Defs>
            <Line x1={pad.left} x2={pad.left + innerW} y1={zeroY} y2={zeroY}
              stroke={colors.border} strokeDasharray="4,4" strokeWidth={1} />
            {hasData && (
              <>
                <Path d={buildArea("income")} fill="url(#ig)" />
                <Path d={buildArea("expense")} fill="url(#eg)" />
                <Path d={buildPath("income")} stroke={colors.income} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <Path d={buildPath("expense")} stroke={colors.expense} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <Path d={buildPath("net")} stroke={colors.net} strokeWidth={2} strokeDasharray="3,3" fill="none" strokeLinejoin="round" strokeLinecap="round" />
                <G>
                  {data.map((d, i) => (
                    <G key={d.key}>
                      {d.income > 0 && <Rect x={xFor(i)-3} y={yFor(d.income)-3} width={6} height={6} rx={3} fill={colors.income} />}
                      {d.expense > 0 && <Rect x={xFor(i)-3} y={yFor(d.expense)-3} width={6} height={6} rx={3} fill={colors.expense} />}
                    </G>
                  ))}
                </G>
              </>
            )}
          </Svg>
        )}
        {!hasData && (
          <View style={styles.emptyOverlay} pointerEvents="none">
            <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
              Adicione lançamentos para ver o fluxo de 6 meses
            </Text>
          </View>
        )}
      </View>
      <View style={styles.axisRow}>
        {data.map((d) => (
          <Text key={d.key} style={[styles.axisLabel, { color: colors.mutedForeground }]}>
            {monthLabel(d.key)}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.income} label="Entradas" />
        <LegendDot color={colors.expense} label="Saídas" />
        <LegendDot color={colors.net} label="Resultado" dashed />
      </View>
    </View>
  );
}

function CategoryBars({
  items,
  total,
  color,
  emptyText,
  label,
}: {
  items: { cat: string; total: number }[];
  total: number;
  color: string;
  emptyText: string;
  label: string;
}) {
  const colors = useColors();

  if (items.length === 0) {
    return (
      <View style={[styles.emptyBars, { borderColor: colors.border }]}>
        <Feather name="inbox" size={22} color={colors.mutedForeground} />
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
          {emptyText}
        </Text>
      </View>
    );
  }

  const maxItem = items[0].total;

  return (
    <View style={styles.barsWrap}>
      <Text style={[styles.barsLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      {items.map((item, idx) => {
        const pct = total > 0 ? (item.total / total) * 100 : 0;
        const barPct = maxItem > 0 ? (item.total / maxItem) * 100 : 0;
        const isTop = idx === 0;
        return (
          <View key={item.cat} style={styles.barRow}>
            <View style={styles.barMeta}>
              <Text
                style={[
                  styles.barCat,
                  {
                    color: isTop ? colors.foreground : colors.mutedForeground,
                    fontFamily: isTop ? "Inter_700Bold" : "Inter_600SemiBold",
                  },
                ]}
                numberOfLines={1}
              >
                {isTop ? "★ " : ""}{item.cat}
              </Text>
              <View style={styles.barAmounts}>
                <Text style={[styles.barValue, { color: isTop ? color : colors.mutedForeground }]}>
                  {formatBRL(item.total)}
                </Text>
                <Text style={[styles.barPct, { color: colors.mutedForeground }]}>
                  {pct.toFixed(0)}%
                </Text>
              </View>
            </View>
            <View style={[styles.barTrack, { backgroundColor: `${color}18` }]}>
              <View
                style={[
                  styles.barFill,
                  {
                    width: `${barPct}%`,
                    backgroundColor: isTop ? color : `${color}88`,
                  },
                ]}
              />
            </View>
          </View>
        );
      })}
      <View style={[styles.totalRow, { borderColor: colors.border }]}>
        <Text style={[styles.totalLabel, { color: colors.mutedForeground }]}>
          Total
        </Text>
        <Text style={[styles.totalValue, { color }]}>
          {formatBRL(total)}
        </Text>
      </View>
    </View>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      {dashed ? (
        <View style={styles.dashedDot}>
          <View style={[styles.dashedSeg, { backgroundColor: color }]} />
          <View style={[styles.dashedSeg, { backgroundColor: color }]} />
        </View>
      ) : (
        <View style={[styles.dot, { backgroundColor: color }]} />
      )}
      <Text style={[styles.legendText, { color: colors.mutedForeground }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "transparent",
  },
  tabText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  chartBox: {
    height: CHART_HEIGHT,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  emptyBars: {
    height: 110,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    textAlign: "center",
  },
  axisRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  axisLabel: { fontFamily: "Inter_500Medium", fontSize: 11 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dashedDot: {
    width: 14,
    height: 4,
    flexDirection: "row",
    gap: 2,
  },
  dashedSeg: { flex: 1, height: 2, borderRadius: 1, alignSelf: "center" },
  legendText: { fontFamily: "Inter_500Medium", fontSize: 11 },
  barsWrap: { gap: 10 },
  barsLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  barRow: { gap: 5 },
  barMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  barCat: { fontSize: 13, flex: 1 },
  barAmounts: { flexDirection: "row", gap: 6, alignItems: "center" },
  barValue: { fontFamily: "Inter_700Bold", fontSize: 13 },
  barPct: { fontFamily: "Inter_500Medium", fontSize: 11 },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 4,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 8,
    marginTop: 2,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  totalLabel: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  totalValue: { fontFamily: "Inter_700Bold", fontSize: 14 },
  insightSection: { gap: 8 },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  insightTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  insightCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  insightText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
    flex: 1,
  },
});
