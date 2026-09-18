import { Feather } from "@expo/vector-icons";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { SmartDashboard } from "@/components/SmartDashboard";
import { GoalGame, type GoalGameStep } from "@/components/GoalGame";
import { HeroHeader } from "@/components/HeroHeader";
import { Input } from "@/components/Input";
import { MetricCard } from "@/components/MetricCard";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import { formatBRL, parseBRLNumber } from "@/lib/format";

export default function OverviewScreen() {
  const colors = useColors();
  const {
    metrics,
    transactions,
    investments,
    goals,
    setGoals,
    base,
    savingGoals,
    bankAccounts,
  } = useFinance();

  const [monthlyGoalText, setMonthlyGoalText] = useState("");
  const [reserveGoalText, setReserveGoalText] = useState("");

  useEffect(() => {
    setMonthlyGoalText(
      goals.monthly > 0 ? String(goals.monthly).replace(".", ",") : "",
    );
    setReserveGoalText(
      goals.reserve > 0 ? String(goals.reserve).replace(".", ",") : "",
    );
  }, [goals.monthly, goals.reserve]);

  const reserveCurrent = Math.max(0, metrics.balance);

  const gameSteps: GoalGameStep[] = useMemo(
    () => [
      {
        id: "base",
        label: "Cadastrar saldo inicial",
        done: base.startingBalance > 0 || base.fixedIncome > 0,
        rewardLabel: "Selo Início",
        rewardIcon: "flag",
      },
      {
        id: "first-tx",
        label: "Primeiro lançamento",
        done: transactions.length > 0,
        rewardLabel: "Botão de hábito",
        rewardIcon: "edit-3",
      },
      {
        id: "goal",
        label: "Definir meta mensal",
        done: goals.monthly > 0 || goals.reserve > 0,
        rewardLabel: "Capa de foco",
        rewardIcon: "target",
      },
      {
        id: "goal-hit",
        label: "Atingir meta do mês",
        done: goals.monthly > 0 && metrics.monthNet >= goals.monthly,
        rewardLabel: "Coroa do mês",
        rewardIcon: "award",
      },
      {
        id: "first-inv",
        label: "Primeiro investimento",
        done: investments.length > 0,
        rewardLabel: "Item Investidor",
        rewardIcon: "trending-up",
      },
      {
        id: "patrimony",
        label: "50% da meta de patrimônio",
        done:
          goals.investedPatrimony > 0 &&
          metrics.investedTotal >= goals.investedPatrimony * 0.5,
        rewardLabel: "Coroa Patrimônio",
        rewardIcon: "shield",
      },
    ],
    [
      base.startingBalance,
      base.fixedIncome,
      transactions.length,
      goals.monthly,
      goals.reserve,
      goals.investedPatrimony,
      investments.length,
      metrics.monthNet,
      metrics.investedTotal,
    ],
  );

  const completedSteps = gameSteps.filter((s) => s.done).length;
  const status =
    completedSteps === 0
      ? "Começando"
      : completedSteps < gameSteps.length / 2
        ? "Em ritmo"
        : completedSteps < gameSteps.length
          ? "Quase lá"
          : "Tudo no eixo";

  return (
    <Screen>
      <HeroHeader
        balance={metrics.balance}
        movementsCount={transactions.length}
      />

      <View style={styles.metricsGrid}>
        <MetricCard
          tone="balance"
          label="Saldo total"
          value={metrics.balance}
          hint="O retrato completo do que você já construiu"
        />
        <MetricCard
          tone="income"
          label="Entradas do mês"
          value={metrics.monthIncome}
          hint="Tudo o que entrou para sustentar seus planos"
        />
        <MetricCard
          tone="expense"
          label="Saídas do mês"
          value={metrics.monthExpense}
          hint="O que saiu e merece sua atenção"
        />
        <MetricCard
          tone="net"
          label="Resultado do mês"
          value={metrics.monthNet}
          hint="Quanto sobrou para suas metas avançarem"
        />
      </View>

      <Card>
        <SectionHeader
          eyebrow="Jogo das metas"
          title="Sua jornada de evolução"
          tag={status}
          tagColor={colors.primary}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Cada conquista vira moeda, libera um item e move o personagem para o
          próximo degrau. Pequenas vitórias contam.
        </Text>
        <GoalGame steps={gameSteps} />
      </Card>

      {savingGoals.length > 0 ? (
        <Card>
          <SectionHeader
            eyebrow="Metas de sonho"
            title="Progresso das suas metas"
            tag={`${savingGoals.length} ativa${savingGoals.length > 1 ? "s" : ""}`}
            tagColor={colors.invest}
          />
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            Lance uma saída com a categoria da meta para o progresso avançar.
          </Text>
          <View style={styles.dreamGoalList}>
            {savingGoals.map((goal) => {
              const current = metrics.goalProgress[goal.categoryTag] ?? 0;
              const pct =
                goal.targetAmount > 0
                  ? Math.min(100, (current / goal.targetAmount) * 100)
                  : 0;
              const done = pct >= 100;
              return (
                <View
                  key={goal.id}
                  style={[
                    styles.dreamGoalCard,
                    {
                      backgroundColor: colors.cardElevated,
                      borderColor: done ? colors.income : colors.border,
                    },
                  ]}
                >
                  <View style={styles.dreamGoalHeader}>
                    <Text style={styles.dreamEmoji}>{goal.emoji}</Text>
                    <View style={styles.flex1}>
                      <Text
                        style={[
                          styles.dreamName,
                          { color: colors.foreground },
                        ]}
                      >
                        {goal.name}
                        {done ? "  🎉" : ""}
                      </Text>
                      <View style={styles.dreamTagRow}>
                        <Feather
                          name="tag"
                          size={10}
                          color={colors.primary}
                        />
                        <Text
                          style={[
                            styles.dreamTag,
                            { color: colors.primary },
                          ]}
                        >
                          {goal.categoryTag}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.dreamPctBadge}>
                      <Text
                        style={[
                          styles.dreamPct,
                          { color: done ? colors.income : colors.primary },
                        ]}
                      >
                        {pct.toFixed(0)}%
                      </Text>
                    </View>
                  </View>
                  <ProgressBar
                    label={`${formatBRL(current)} de ${formatBRL(goal.targetAmount)}`}
                    current={current}
                    target={goal.targetAmount}
                    color={done ? colors.income : colors.primary}
                  />
                </View>
              );
            })}
          </View>
        </Card>
      ) : null}

      <Card>
        <SectionHeader
          eyebrow="Dashboard inteligente"
          title="Análise dos seus dados"
          tag="Automático"
          tagColor={colors.coin}
        />
        <SmartDashboard />
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Metas"
          title="Guardar dinheiro com propósito"
          tag={
            goals.monthly > 0 || goals.reserve > 0
              ? "Meta ativa"
              : "Meta em construção"
          }
        />
        <View style={styles.formGrid}>
          <Input
            label="Meta de economia do mês"
            value={monthlyGoalText}
            onChangeText={setMonthlyGoalText}
            keyboardType="decimal-pad"
            placeholder="Ex.: 300,00"
            prefix="R$"
            containerStyle={styles.flex1}
          />
          <Input
            label="Meta de reserva total"
            value={reserveGoalText}
            onChangeText={setReserveGoalText}
            keyboardType="decimal-pad"
            placeholder="Ex.: 5000,00"
            prefix="R$"
            containerStyle={styles.flex1}
          />
        </View>
        <Button
          variant="secondary"
          label="Salvar metas"
          onPress={() => {
            setGoals({
              monthly: parseBRLNumber(monthlyGoalText),
              reserve: parseBRLNumber(reserveGoalText),
            });
          }}
        />
        <View style={styles.progressStack}>
          <ProgressBar
            label="Meta do mês"
            current={metrics.monthNet}
            target={goals.monthly}
            color={colors.income}
          />
          <ProgressBar
            label="Reserva acumulada"
            current={reserveCurrent}
            target={goals.reserve}
            color={colors.saldo}
          />
        </View>
      </Card>

      <Card>
        <SectionHeader eyebrow="Resumo" title="Onde seu dinheiro está agora" />
        <View style={styles.summaryRow}>
          <SummaryLine
            label="Saldo inicial cadastrado"
            value={formatBRL(base.startingBalance)}
          />
          <SummaryLine
            label="Salário fixo previsto"
            value={formatBRL(base.fixedIncome)}
          />
          <SummaryLine
            label="Total em investimentos"
            value={formatBRL(metrics.investedTotal)}
            color={colors.invest}
          />
          {bankAccounts.length > 0 ? (
            <>
              <SummaryLine
                label="Saldos informados nos bancos"
                value={formatBRL(metrics.bankPositiveBalance)}
                color={colors.income}
              />
              <SummaryLine
                label="Faturas de cartao em aberto"
                value={formatBRL(metrics.creditCardOpenBalance)}
                color={colors.expense}
              />
            </>
          ) : null}
          <SummaryLine
            label="Renda passiva estimada"
            value={`${formatBRL(metrics.estimatedPassiveIncome)} / mês`}
            color={colors.income}
          />
        </View>
      </Card>
    </Screen>
  );
}

function SummaryLine({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.summaryLine}>
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.summaryValue, { color: color ?? colors.foreground }]}
      >
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  copy: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  formGrid: {
    flexDirection: "row",
    gap: 10,
  },
  flex1: { flex: 1 },
  progressStack: {
    gap: 14,
    marginTop: 4,
  },
  summaryRow: {
    gap: 10,
  },
  summaryLine: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  dreamGoalList: { gap: 12 },
  dreamGoalCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  dreamGoalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dreamEmoji: { fontSize: 24 },
  dreamName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  dreamTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dreamTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  dreamPctBadge: {
    minWidth: 40,
    alignItems: "flex-end",
  },
  dreamPct: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
});
