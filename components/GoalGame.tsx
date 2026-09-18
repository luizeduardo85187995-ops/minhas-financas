import { Feather } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import {
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";

export interface GoalGameStep {
  id: string;
  label: string;
  done: boolean;
  rewardLabel: string;
  rewardIcon: keyof typeof Feather.glyphMap;
}

interface GoalGameProps {
  steps: GoalGameStep[];
}

const AVATAR_STATUSES = [
  "Começando a jornada",
  "No primeiro degrau",
  "Construindo o hábito",
  "Foco ativado",
  "Mente disciplinada",
  "Investidor em ação",
  "Patrimônio conquistado",
];

const STEP_COUNT = 6;
const CONTAINER_H = 260;
const STEP_H = 34;
const STEP_INDENT = 30;
const CHAR_SIZE = 36;

function stepTop(i: number): number {
  return CONTAINER_H - (i + 1) * STEP_H - 4;
}
function stepLeft(i: number): number {
  return i * STEP_INDENT;
}

export function GoalGame({ steps }: GoalGameProps) {
  const colors = useColors();
  const completed = Math.min(steps.filter((s) => s.done).length, STEP_COUNT);
  const coins = completed * 5;
  const status = AVATAR_STATUSES[completed] ?? AVATAR_STATUSES[0];

  const animProgress = useRef(new Animated.Value(completed)).current;
  const bounceScale = useRef(new Animated.Value(1)).current;
  const prevCompleted = useRef(completed);

  useEffect(() => {
    if (prevCompleted.current === completed) return;
    prevCompleted.current = completed;

    Animated.sequence([
      Animated.timing(bounceScale, {
        toValue: 1.35,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: false,
      }),
      Animated.spring(bounceScale, {
        toValue: 1,
        friction: 4,
        tension: 180,
        useNativeDriver: false,
      }),
    ]).start();

    Animated.spring(animProgress, {
      toValue: completed,
      friction: 5,
      tension: 60,
      useNativeDriver: false,
    }).start();
  }, [completed, animProgress, bounceScale]);

  const yPositions = Array.from({ length: STEP_COUNT + 1 }, (_, i) =>
    i < STEP_COUNT ? stepTop(i) - CHAR_SIZE + 4 : stepTop(STEP_COUNT - 1) - CHAR_SIZE - 24,
  );
  const xPositions = Array.from({ length: STEP_COUNT + 1 }, (_, i) =>
    i < STEP_COUNT
      ? stepLeft(i) + 4
      : stepLeft(STEP_COUNT - 1) + 4,
  );

  const charTop = animProgress.interpolate({
    inputRange: Array.from({ length: STEP_COUNT + 1 }, (_, i) => i),
    outputRange: yPositions,
  });
  const charLeft = animProgress.interpolate({
    inputRange: Array.from({ length: STEP_COUNT + 1 }, (_, i) => i),
    outputRange: xPositions,
  });

  const isComplete = completed >= STEP_COUNT;

  return (
    <View style={styles.wrap}>
      <View style={styles.tagsRow}>
        <View
          style={[
            styles.tag,
            { backgroundColor: `${colors.coin}22`, borderColor: colors.coin },
          ]}
        >
          <Feather name="award" size={12} color={colors.coin} />
          <Text style={[styles.tagText, { color: colors.coin }]}>
            {coins} moedas
          </Text>
        </View>
        <View
          style={[
            styles.tag,
            {
              backgroundColor: `${colors.primary}22`,
              borderColor: colors.primary,
            },
          ]}
        >
          <Feather name="trending-up" size={12} color={colors.primary} />
          <Text style={[styles.tagText, { color: colors.primary }]}>
            {completed}/{STEP_COUNT} degraus
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.stageWrap,
          { backgroundColor: colors.cardElevated, borderColor: colors.border },
        ]}
      >
        <View style={[styles.stage, { height: CONTAINER_H }]}>
          {steps.map((step, i) => {
            const isDone = step.done;
            const isNext = !isDone && i === completed;
            const top = stepTop(i);
            const left = stepLeft(i);
            const stepW = 300 - left;
            return (
              <View
                key={step.id}
                style={[
                  styles.step,
                  {
                    top,
                    left,
                    width: stepW,
                    height: STEP_H,
                    backgroundColor: isDone
                      ? `${colors.primary}30`
                      : isNext
                        ? `${colors.primary}14`
                        : colors.muted,
                    borderColor: isDone
                      ? colors.primary
                      : isNext
                        ? `${colors.primary}66`
                        : colors.border,
                  },
                ]}
              >
                <View style={styles.stepContent}>
                  {isDone ? (
                    <View
                      style={[
                        styles.stepDot,
                        { backgroundColor: colors.primary },
                      ]}
                    >
                      <Feather
                        name="check"
                        size={9}
                        color={colors.primaryForeground}
                      />
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.stepDot,
                        {
                          backgroundColor: "transparent",
                          borderWidth: 1.5,
                          borderColor: isNext
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.stepNum,
                          {
                            color: isNext
                              ? colors.primary
                              : colors.mutedForeground,
                          },
                        ]}
                      >
                        {i + 1}
                      </Text>
                    </View>
                  )}
                  <Text
                    style={[
                      styles.stepLabel,
                      {
                        color: isDone
                          ? colors.foreground
                          : isNext
                            ? colors.foreground
                            : colors.mutedForeground,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                  {isDone ? (
                    <Feather
                      name={step.rewardIcon}
                      size={13}
                      color={colors.primary}
                    />
                  ) : null}
                </View>
              </View>
            );
          })}

          <View
            style={[
              styles.trophy,
              {
                top: stepTop(STEP_COUNT - 1) - 42,
                left: stepLeft(STEP_COUNT - 1) + 4,
                backgroundColor: isComplete
                  ? `${colors.coin}22`
                  : colors.muted,
                borderColor: isComplete ? colors.coin : colors.border,
              },
            ]}
          >
            <Text style={styles.trophyEmoji}>{isComplete ? "🏆" : "🎯"}</Text>
          </View>

          <Animated.View
            style={[
              styles.char,
              {
                top: charTop,
                left: charLeft,
                width: CHAR_SIZE,
                height: CHAR_SIZE,
                borderColor: isComplete ? colors.coin : colors.primary,
                backgroundColor: isComplete
                  ? `${colors.coin}22`
                  : `${colors.primary}22`,
                transform: [{ scale: bounceScale }],
              },
            ]}
          >
            <Text style={styles.charEmoji}>
              {isComplete ? "🌟" : completed >= 4 ? "🚀" : completed >= 2 ? "🏃" : "🚶"}
            </Text>
          </Animated.View>
        </View>
      </View>

      <View
        style={[
          styles.statusRow,
          { backgroundColor: colors.muted, borderColor: colors.border },
        ]}
      >
        <Text style={[styles.statusText, { color: colors.foreground }]}>
          {status}
        </Text>
        {completed < STEP_COUNT ? (
          <Text
            style={[styles.statusHint, { color: colors.mutedForeground }]}
          >
            {steps.find((s) => !s.done)?.label ?? "Continue avançando"}
          </Text>
        ) : (
          <Text style={[styles.statusHint, { color: colors.coin }]}>
            Todos os degraus conquistados nesta temporada!
          </Text>
        )}
      </View>

      <View style={styles.rewardSection}>
        <Text style={[styles.rewardTitle, { color: colors.foreground }]}>
          Itens e recompensas
        </Text>
        <View style={styles.rewardTrack}>
          {steps.map((step) => {
            const unlocked = step.done;
            return (
              <View
                key={`reward-${step.id}`}
                style={[
                  styles.rewardItem,
                  {
                    backgroundColor: unlocked
                      ? `${colors.primary}1f`
                      : colors.muted,
                    borderColor: unlocked ? colors.primary : colors.border,
                  },
                ]}
              >
                <Feather
                  name={step.rewardIcon}
                  size={15}
                  color={unlocked ? colors.primary : colors.mutedForeground}
                />
                <Text
                  style={[
                    styles.rewardLabel,
                    {
                      color: unlocked
                        ? colors.foreground
                        : colors.mutedForeground,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {step.rewardLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 14 },
  tagsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagText: { fontFamily: "Inter_700Bold", fontSize: 11 },
  stageWrap: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: "hidden",
    padding: 12,
  },
  stage: {
    position: "relative",
    overflow: "visible",
  },
  step: {
    position: "absolute",
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
    justifyContent: "center",
    paddingHorizontal: 10,
  },
  stepContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  stepDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: { fontFamily: "Inter_700Bold", fontSize: 9 },
  stepLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    flex: 1,
  },
  trophy: {
    position: "absolute",
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  trophyEmoji: { fontSize: 18 },
  char: {
    position: "absolute",
    borderRadius: CHAR_SIZE / 2,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  charEmoji: { fontSize: 18 },
  statusRow: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 4,
  },
  statusText: { fontFamily: "Inter_700Bold", fontSize: 14 },
  statusHint: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 16,
  },
  rewardSection: { gap: 10 },
  rewardTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  rewardTrack: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: "30%",
    flex: 1,
  },
  rewardLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    flex: 1,
  },
});
