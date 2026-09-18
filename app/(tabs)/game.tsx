import { Feather } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { GoalGame, type GoalGameStep } from "@/components/GoalGame";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { useFinance } from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import { formatBRL } from "@/lib/format";

const DIADEMETA_URL = "https://diademeta.ai.studio";

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

export default function GameScreen() {
  const colors = useColors();
  const {
    base,
    goals,
    metrics,
    transactions,
    investments,
    savingGoals,
  } = useFinance();
  const [resetHintVisible, setResetHintVisible] = useState(false);

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
        label: "Criar meta financeira",
        done: goals.monthly > 0 || goals.reserve > 0 || savingGoals.length > 0,
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
      savingGoals.length,
      metrics.monthNet,
      metrics.investedTotal,
      investments.length,
    ],
  );

  const completedSteps = gameSteps.filter((step) => step.done).length;
  const totalSteps = gameSteps.length;
  const percent = Math.round((completedSteps / totalSteps) * 100);
  const dreamGoal = savingGoals[0];
  const dreamProgress = dreamGoal
    ? metrics.goalProgress[dreamGoal.categoryTag] ?? 0
    : 0;

  const openDiaDeMeta = async () => {
    try {
      await WebBrowser.openBrowserAsync(DIADEMETA_URL);
    } catch {
      showMessage(
        "Não abriu",
        "Não consegui abrir o DiaDeMeta agora. Tente novamente com internet.",
      );
    }
  };

  return (
    <Screen
      title="Jogo"
      subtitle="Transforme suas metas financeiras em uma jornada com degraus, moedas e conquistas"
    >
      <View style={styles.hero}>
        <View style={[styles.glow, styles.glowA]} />
        <View style={[styles.glow, styles.glowB]} />
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroHeader}>
            <View style={styles.gameIcon}>
              <Text style={styles.gameEmoji}>🎮</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.heroEyebrow, { color: colors.coin }]}>
                JORNADA DA META
              </Text>
              <Text style={[styles.heroTitle, { color: colors.foreground }]}>
                Seu dinheiro subindo degrau por degrau
              </Text>
              <Text
                style={[styles.heroSubtitle, { color: colors.mutedForeground }]}
              >
                Inspirado na tela que você criou com Qwen: visual de jogo,
                progresso e link para o DiaDeMeta.
              </Text>
            </View>
          </View>

          <View style={styles.heroStats}>
            <GameStat
              icon="award"
              label="Progresso"
              value={`${percent}%`}
              color={colors.coin}
            />
            <GameStat
              icon="target"
              label="Degraus"
              value={`${completedSteps}/${totalSteps}`}
              color={colors.primary}
            />
            <GameStat
              icon="dollar-sign"
              label="Resultado mês"
              value={formatBRL(metrics.monthNet)}
              color={metrics.monthNet >= 0 ? colors.income : colors.expense}
            />
          </View>

          <Button
            label="Abrir DiaDeMeta"
            onPress={openDiaDeMeta}
            icon={
              <Feather
                name="external-link"
                size={18}
                color={colors.primaryForeground}
              />
            }
          />
        </View>
      </View>

      <Card>
        <SectionHeader
          eyebrow="Jogo integrado"
          title="Sua escada financeira"
          tag={`${completedSteps}/${totalSteps}`}
          tagColor={colors.primary}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Esta parte usa seus dados reais do app. Quando você cadastra salário,
          lançamentos, metas e investimentos, o personagem avança.
        </Text>
        <GoalGame steps={gameSteps} />
      </Card>

      {dreamGoal ? (
        <Card>
          <SectionHeader
            eyebrow="Meta em destaque"
            title={`${dreamGoal.emoji} ${dreamGoal.name}`}
            tag={`${Math.min(100, (dreamProgress / dreamGoal.targetAmount) * 100).toFixed(0)}%`}
            tagColor={colors.invest}
          />
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            Lance uma saída usando a categoria{" "}
            <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
              {dreamGoal.categoryTag}
            </Text>{" "}
            para essa meta evoluir.
          </Text>
          <ProgressBar
            label={`${formatBRL(dreamProgress)} de ${formatBRL(dreamGoal.targetAmount)}`}
            current={dreamProgress}
            target={dreamGoal.targetAmount}
            color={colors.invest}
          />
        </Card>
      ) : (
        <Card>
          <SectionHeader
            eyebrow="Crie uma missão"
            title="Você ainda não tem meta de sonho"
            tag="Dica"
            tagColor={colors.coin}
          />
          <Text style={[styles.copy, { color: colors.mutedForeground }]}>
            Vá em Planejar e crie uma meta, como viagem, notebook, reserva ou
            carro. Ela aparece aqui como missão do jogo.
          </Text>
        </Card>
      )}

      <Card>
        <SectionHeader
          eyebrow="DiaDeMeta"
          title="Jogo externo do Qwen"
          tag="Link"
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          O projeto que você mandou abria o DiaDeMeta dentro de um iframe. No
          Android isso precisa ser feito pelo navegador ou por uma WebView
          nativa. Por segurança, deixei o botão para abrir o jogo externo sem
          travar o app.
        </Text>

        <View style={styles.actionRow}>
          <View style={styles.flex1}>
            <Button
              variant="secondary"
              label="Abrir em nova aba"
              onPress={openDiaDeMeta}
              icon={
                <Feather
                  name="external-link"
                  size={18}
                  color={colors.foreground}
                />
              }
            />
          </View>
          <View style={styles.flex1}>
            <Button
              variant="ghost"
              label="Resetar?"
              onPress={() => setResetHintVisible((value) => !value)}
              icon={
                <Feather name="refresh-cw" size={18} color={colors.primary} />
              }
            />
          </View>
        </View>

        {resetHintVisible ? (
          <View
            style={[
              styles.hintBox,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="info" size={16} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.mutedForeground }]}>
              O reset do DiaDeMeta precisa ser feito dentro do próprio site,
              porque os dados ficam salvos no navegador dele. Não vou apagar os
              dados do seu app de finanças automaticamente.
            </Text>
          </View>
        ) : null}
      </Card>
    </Screen>
  );
}

function GameStat({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Feather.glyphMap;
  label: string;
  value: string;
  color: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.stat,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={15} color={color} />
      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.statValue, { color }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    position: "relative",
  },
  glow: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.5,
  },
  glowA: {
    width: 160,
    height: 160,
    backgroundColor: "#5eead455",
    top: -20,
    left: -30,
  },
  glowB: {
    width: 180,
    height: 180,
    backgroundColor: "#c084fc33",
    right: -50,
    bottom: -30,
  },
  heroCard: {
    borderRadius: 28,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    gap: 18,
    overflow: "hidden",
  },
  heroHeader: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
  },
  gameIcon: {
    width: 54,
    height: 54,
    borderRadius: 18,
    backgroundColor: "#fbbf2430",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "#fbbf2470",
  },
  gameEmoji: {
    fontSize: 28,
  },
  flex1: {
    flex: 1,
  },
  heroEyebrow: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.3,
  },
  heroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginTop: 2,
  },
  heroSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 4,
  },
  heroStats: {
    flexDirection: "row",
    gap: 8,
  },
  stat: {
    flex: 1,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
    gap: 4,
  },
  statLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
  },
  statValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  copy: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  hintText: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
});
