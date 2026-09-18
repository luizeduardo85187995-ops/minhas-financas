import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useColors } from "@/hooks/useColors";

const STORAGE_KEY = "@financas/onboarding-done-v2-guided";

export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(STORAGE_KEY);
    return value === "1";
  } catch {
    return false;
  }
}

export async function markOnboardingDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, "1");
  } catch {}
}

interface TourStep {
  tab: string;
  route: "/" | "/banks" | "/planning" | "/transactions" | "/investments";
  title: string;
  description: string;
  action: string;
  example: string;
  accent: string;
}

const STEPS: TourStep[] = [
  {
    tab: "Visao geral",
    route: "/",
    title: "Aqui e o painel principal",
    description:
      "Esta tela junta tudo em um so lugar: saldo, entradas, saidas, investimentos e avisos importantes. Pense nela como o placar do seu dinheiro.",
    action:
      "Quando abrir o app e quiser saber se esta tudo bem, comece por aqui.",
    example:
      "Exemplo: se gastou demais no mes, o app mostra um alerta e te ajuda a enxergar onde apertar.",
    accent: "#5eead4",
  },
  {
    tab: "Bancos",
    route: "/banks",
    title: "Aqui ficam seus bancos",
    description:
      "Esta aba centraliza saldos de contas, cartoes e corretoras. A conexao automatica real depende de Open Finance, mas voce ja pode usar sem mensalidade informando os saldos.",
    action:
      "Cadastre cada banco uma vez. Depois atualize o saldo quando abrir seu aplicativo bancario ou use a leitura de notificacao copiada.",
    example:
      "Exemplo: voce tem R$ 800 no Nubank e R$ 250 de fatura no cartao. O app mostra a visao liquida para voce nao se perder.",
    accent: "#60a5fa",
  },
  {
    tab: "Planejar",
    route: "/planning",
    title: "Agora vamos para Planejar",
    description:
      "Aqui voce coloca sua base: quanto tem hoje, quanto recebe e quais sonhos quer realizar. Sem essa parte, o app fica sem saber qual e o seu ponto de partida.",
    action:
      "Primeiro preencha saldo atual e salario. Depois crie metas simples, como reserva, viagem, moto ou quitar divida.",
    example:
      "Exemplo: meta de R$ 1.000 para reserva. Cada economia lancada ajuda o app a mostrar o progresso.",
    accent: "#38bdf8",
  },
  {
    tab: "Lancamentos",
    route: "/transactions",
    title: "Esta e a aba Lancamentos",
    description:
      "Aqui entram as movimentacoes do dia a dia. Todo dinheiro que entra e todo dinheiro que sai deve virar um lancamento.",
    action:
      "Use entrada para salario, pix recebido e freela. Use saida para mercado, conta, transporte, lazer e compras.",
    example:
      "Exemplo: pagou R$ 35 no mercado. Cadastre como saida, escolha a categoria e pronto: o resumo ja entende esse gasto.",
    accent: "#a3e635",
  },
  {
    tab: "Investir",
    route: "/investments",
    title: "Aqui voce cuida dos investimentos",
    description:
      "Nesta aba voce registra acoes, FIIs, ETFs, CDBs e Tesouro. Para ativos da bolsa, o app mostra a ideia de quantidade, preco e valor investido.",
    action:
      "Digite o codigo do ativo, confira a cotacao quando estiver disponivel e registre o aporte com calma.",
    example:
      "Exemplo: se voce tem R$ 1.000 e a acao custa R$ 52, o app ajuda a entender quantas unidades cabem e se sobra algum valor.",
    accent: "#c084fc",
  },
  {
    tab: "Visao geral",
    route: "/",
    title: "Voltamos ao resumo",
    description:
      "Depois de planejar, lancar gastos e registrar investimentos, a Visao geral fica mais inteligente. Ela passa a contar a historia do seu dinheiro.",
    action:
      "Volte aqui sempre que quiser uma resposta rapida: sobrou, faltou, melhorou ou piorou?",
    example:
      "Quanto mais voce usa, mais claras ficam as dicas. O app nao faz milagre, mas acende a luz onde antes ficava escuro.",
    accent: "#fbbf24",
  },
];

interface OnboardingProps {
  visible: boolean;
  onDone: () => void;
}

export function Onboarding({ visible, onDone }: OnboardingProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  useEffect(() => {
    if (!visible) return;
    router.replace(current.route);
  }, [current.route, router, visible]);

  const animateToStep = useCallback(
    (nextStep: number, direction: 1 | -1 = 1) => {
      if (Platform.OS !== "web") {
        Haptics.selectionAsync().catch(() => {});
      }
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 140,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: direction * -18,
          duration: 140,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setStep(nextStep);
        slideAnim.setValue(direction * 18);
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 190,
            useNativeDriver: true,
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 190,
            useNativeDriver: true,
          }),
        ]).start();
      });
    },
    [fadeAnim, slideAnim],
  );

  const finish = useCallback(() => {
    markOnboardingDone();
    onDone();
  }, [onDone]);

  const handleNext = useCallback(() => {
    if (isLast) {
      finish();
      return;
    }
    animateToStep(step + 1, 1);
  }, [animateToStep, finish, isLast, step]);

  const handleSkip = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync().catch(() => {});
    }
    finish();
  }, [finish]);

  const handleBack = useCallback(() => {
    if (step <= 0) return;
    animateToStep(step - 1, -1);
  }, [animateToStep, step]);

  const handleDotPress = useCallback(
    (idx: number) => {
      if (idx === step) return;
      animateToStep(idx, idx > step ? 1 : -1);
    },
    [animateToStep, step],
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.root}>
        <View style={styles.dim} />
        <Pressable
          onPress={handleSkip}
          hitSlop={12}
          style={[styles.skipBtn, { top: insets.top + 12 }]}
        >
          <Text style={styles.skipText}>Pular tutorial</Text>
        </Pressable>

        <View style={[styles.pointer, { borderColor: current.accent }]}>
          <Text style={styles.pointerText}>
            Olhe a aba "{current.tab}" aberta por tras deste aviso.
          </Text>
        </View>

        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: `${current.accent}66`,
              marginBottom: insets.bottom + 14,
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.header}>
            <View
              style={[
                styles.badge,
                { backgroundColor: `${current.accent}22` },
              ]}
            >
              <Text style={[styles.badgeText, { color: current.accent }]}>
                Passo {step + 1} de {STEPS.length}
              </Text>
            </View>
            <Text style={[styles.tabName, { color: colors.mutedForeground }]}>
              Aba: {current.tab}
            </Text>
          </View>

          <ScrollView
            style={styles.copyScroll}
            contentContainerStyle={styles.copy}
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.title, { color: colors.foreground }]}>
              {current.title}
            </Text>
            <Text style={[styles.description, { color: colors.mutedForeground }]}>
              {current.description}
            </Text>

            <View
              style={[
                styles.helpBox,
                {
                  backgroundColor: `${current.accent}14`,
                  borderColor: `${current.accent}40`,
                },
              ]}
            >
              <Text style={[styles.helpLabel, { color: current.accent }]}>
                O que fazer aqui
              </Text>
              <Text style={[styles.helpText, { color: colors.foreground }]}>
                {current.action}
              </Text>
            </View>

            <View style={[styles.exampleBox, { borderColor: colors.border }]}>
              <Text style={[styles.exampleLabel, { color: colors.mutedForeground }]}>
                Exemplo simples
              </Text>
              <Text style={[styles.exampleText, { color: colors.foreground }]}>
                {current.example}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.dots}>
            {STEPS.map((_, idx) => (
              <Pressable
                key={idx}
                onPress={() => handleDotPress(idx)}
                hitSlop={8}
              >
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor:
                        idx === step ? current.accent : colors.border,
                      width: idx === step ? 24 : 8,
                    },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={handleBack}
              disabled={step === 0}
              style={({ pressed }) => [
                styles.secondaryBtn,
                {
                  borderColor: colors.border,
                  opacity: step === 0 ? 0.35 : pressed ? 0.75 : 1,
                },
              ]}
            >
              <Text style={[styles.secondaryText, { color: colors.foreground }]}>
                Voltar
              </Text>
            </Pressable>
            <Pressable
              onPress={handleNext}
              style={({ pressed }) => [
                styles.primaryBtn,
                {
                  backgroundColor: current.accent,
                  opacity: pressed ? 0.86 : 1,
                },
              ]}
            >
              <Text style={styles.primaryText}>
                {isLast ? "Entendi, comecar" : "Proximo"}
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: "flex-end",
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.46)",
  },
  skipBtn: {
    position: "absolute",
    right: 18,
    zIndex: 10,
    borderRadius: 999,
    backgroundColor: "rgba(0, 0, 0, 0.58)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  skipText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  pointer: {
    alignSelf: "center",
    marginHorizontal: 18,
    marginBottom: 10,
    borderRadius: 999,
    borderWidth: 1,
    backgroundColor: "rgba(0, 0, 0, 0.68)",
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  pointerText: {
    color: "#ffffff",
    fontFamily: "Inter_700Bold",
    fontSize: 12,
    textAlign: "center",
  },
  panel: {
    maxHeight: "72%",
    marginHorizontal: 14,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.24,
    shadowRadius: 22,
    elevation: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
  },
  tabName: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    textAlign: "right",
  },
  copyScroll: {
    flexGrow: 0,
  },
  copy: {
    gap: 12,
  },
  title: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    lineHeight: 28,
  },
  description: {
    fontFamily: "Inter_500Medium",
    fontSize: 15,
    lineHeight: 22,
  },
  helpBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  helpLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  helpText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    lineHeight: 20,
  },
  exampleBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 6,
  },
  exampleLabel: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    textTransform: "uppercase",
  },
  exampleText: {
    fontFamily: "Inter_500Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  dots: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 14,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  secondaryBtn: {
    minWidth: 96,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  secondaryText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  primaryBtn: {
    flex: 1,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  primaryText: {
    color: "#062420",
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
});
