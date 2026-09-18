import React, { useMemo, useState } from "react";
import {
  LayoutChangeEvent,
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

import { useColors } from "@/hooks/useColors";
import {
  formatBRL,
  lastSixMonthKeys,
  monthKey,
  monthLabel,
} from "@/lib/format";
import type { Transaction } from "@/context/FinanceContext";

interface CashflowChartProps {
  transactions: Transaction[];
}

interface MonthAgg {
  key: string;
  income: number;
  expense: number;
  net: number;
}

const CHART_HEIGHT = 200;

export function CashflowChart({ transactions }: CashflowChartProps) {
  const colors = useColors();
  const [width, setWidth] = useState(0);

  const data = useMemo<MonthAgg[]>(() => {
    const keys = lastSixMonthKeys();
    const map = new Map<string, MonthAgg>();
    for (const k of keys) {
      map.set(k, { key: k, income: 0, expense: 0, net: 0 });
    }
    for (const t of transactions) {
      const k = monthKey(t.date);
      const entry = map.get(k);
      if (!entry) continue;
      if (t.type === "income") entry.income += t.amount;
      else entry.expense += t.amount;
    }
    for (const entry of map.values()) {
      entry.net = entry.income - entry.expense;
    }
    return keys.map((k) => map.get(k)!);
  }, [transactions]);

  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(e.nativeEvent.layout.width);
  };

  const allValues = useMemo(() => {
    const list: number[] = [0];
    for (const d of data) {
      list.push(d.income, d.expense, d.net);
    }
    return list;
  }, [data]);

  const maxV = Math.max(...allValues, 100);
  const minV = Math.min(...allValues, 0);
  const span = maxV - minV || 1;

  const padding = { top: 12, right: 12, bottom: 28, left: 12 };
  const innerW = Math.max(0, width - padding.left - padding.right);
  const innerH = CHART_HEIGHT - padding.top - padding.bottom;

  const xFor = (i: number) => {
    if (data.length <= 1) return padding.left + innerW / 2;
    const step = innerW / (data.length - 1);
    return padding.left + i * step;
  };
  const yFor = (v: number) => {
    const ratio = (v - minV) / span;
    return padding.top + (1 - ratio) * innerH;
  };

  const buildPath = (key: "income" | "expense" | "net") => {
    if (data.length === 0 || width === 0) return "";
    return data
      .map((d, i) => {
        const x = xFor(i);
        const y = yFor(d[key]);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
  };

  const buildAreaPath = (key: "income" | "expense") => {
    if (data.length === 0 || width === 0) return "";
    const top = data
      .map((d, i) => {
        const x = xFor(i);
        const y = yFor(d[key]);
        return `${i === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
      })
      .join(" ");
    const baseY = yFor(0);
    const last = xFor(data.length - 1);
    const first = xFor(0);
    return `${top} L ${last.toFixed(2)} ${baseY.toFixed(2)} L ${first.toFixed(2)} ${baseY.toFixed(2)} Z`;
  };

  const zeroY = yFor(0);
  const hasAnyData = transactions.length > 0;

  return (
    <View style={styles.container}>
      <View
        onLayout={onLayout}
        style={[styles.chartWrap, { borderColor: colors.border }]}
      >
        {width > 0 ? (
          <Svg width={width} height={CHART_HEIGHT}>
            <Defs>
              <LinearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.income} stopOpacity={0.25} />
                <Stop offset="1" stopColor={colors.income} stopOpacity={0.02} />
              </LinearGradient>
              <LinearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={colors.expense} stopOpacity={0.18} />
                <Stop
                  offset="1"
                  stopColor={colors.expense}
                  stopOpacity={0.02}
                />
              </LinearGradient>
            </Defs>
            <Rect
              x={padding.left}
              y={padding.top}
              width={innerW}
              height={innerH}
              fill="transparent"
            />
            <Line
              x1={padding.left}
              x2={padding.left + innerW}
              y1={zeroY}
              y2={zeroY}
              stroke={colors.border}
              strokeDasharray="4,4"
              strokeWidth={1}
            />
            {hasAnyData ? (
              <>
                <Path d={buildAreaPath("income")} fill="url(#incomeGrad)" />
                <Path d={buildAreaPath("expense")} fill="url(#expenseGrad)" />
                <Path
                  d={buildPath("income")}
                  stroke={colors.income}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Path
                  d={buildPath("expense")}
                  stroke={colors.expense}
                  strokeWidth={2.5}
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <Path
                  d={buildPath("net")}
                  stroke={colors.net}
                  strokeWidth={2}
                  strokeDasharray="3,3"
                  fill="none"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
                <G>
                  {data.map((d, i) => (
                    <G key={`pts-${d.key}`}>
                      {d.income > 0 ? (
                        <Rect
                          x={xFor(i) - 3}
                          y={yFor(d.income) - 3}
                          width={6}
                          height={6}
                          rx={3}
                          fill={colors.income}
                        />
                      ) : null}
                      {d.expense > 0 ? (
                        <Rect
                          x={xFor(i) - 3}
                          y={yFor(d.expense) - 3}
                          width={6}
                          height={6}
                          rx={3}
                          fill={colors.expense}
                        />
                      ) : null}
                    </G>
                  ))}
                </G>
              </>
            ) : null}
          </Svg>
        ) : null}
        {!hasAnyData ? (
          <View style={styles.emptyOverlay} pointerEvents="none">
            <Text
              style={[styles.emptyText, { color: colors.mutedForeground }]}
            >
              Adicione lançamentos para ver o fluxo de 6 meses
            </Text>
          </View>
        ) : null}
      </View>
      <View style={styles.axisRow}>
        {data.map((d) => (
          <Text
            key={`label-${d.key}`}
            style={[styles.axisLabel, { color: colors.mutedForeground }]}
          >
            {monthLabel(d.key)}
          </Text>
        ))}
      </View>
      <View style={styles.legend}>
        <LegendDot color={colors.income} label="Entradas" />
        <LegendDot color={colors.expense} label="Saídas" />
        <LegendDot color={colors.net} label="Resultado" dashed />
      </View>
      <View style={styles.legend}>
        <Text style={[styles.summary, { color: colors.mutedForeground }]}>
          Maior entrada: {formatBRL(Math.max(...data.map((d) => d.income), 0))}
          {"  •  "}
          Maior saída: {formatBRL(Math.max(...data.map((d) => d.expense), 0))}
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
  container: {
    gap: 8,
  },
  chartWrap: {
    height: CHART_HEIGHT,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
  },
  emptyOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
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
  axisLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  legend: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  dashedDot: {
    width: 14,
    height: 4,
    flexDirection: "row",
    gap: 2,
  },
  dashedSeg: {
    flex: 1,
    height: 2,
    borderRadius: 1,
    alignSelf: "center",
  },
  legendText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  summary: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
});
