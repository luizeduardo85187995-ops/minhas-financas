import { Feather } from "@expo/vector-icons";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import React, { useEffect, useState } from "react";
import { Alert, Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { Button } from "@/components/Button";
import { Card, SectionHeader } from "@/components/Card";
import { CategoryToken } from "@/components/CategoryToken";
import { Input } from "@/components/Input";
import { ProgressBar } from "@/components/ProgressBar";
import { Screen } from "@/components/Screen";
import { Select } from "@/components/Select";
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  PERMISSION_LEVELS,
  type PermissionLevel,
} from "@/constants/categories";
import {
  useFinance,
  type GoogleConnection,
  type TransactionType,
} from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import { formatBRL, parseBRLNumber } from "@/lib/format";

const GOAL_EMOJIS = ["🎯", "✈️", "🏠", "🚗", "📚", "💍", "🌍", "🎓", "💻", "🎸"];
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file";
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const GOOGLE_ANDROID_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID;

WebBrowser.maybeCompleteAuthSession();

function showMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function formatDateTimeBR(iso?: string): string {
  if (!iso) return "Ainda não feito";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeBackupFileName(): string {
  return `minhas-financas-backup-${new Date()
    .toISOString()
    .slice(0, 19)
    .replace(/[:T]/g, "-")}.json`;
}

async function uploadBackupToDrive(accessToken: string, payload: unknown) {
  const boundary = `financas-${Date.now()}`;
  const metadata = {
    name: makeBackupFileName(),
    mimeType: "application/json",
  };
  const body = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(payload, null, 2),
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  );

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google Drive retornou HTTP ${response.status}`);
  }

  return response.json() as Promise<{
    id: string;
    name: string;
    webViewLink?: string;
  }>;
}

export default function PlanningScreen() {
  const colors = useColors();
  const {
    base,
    setBase,
    incomeCategories,
    expenseCategories,
    addCategory,
    removeCategory,
    permissions,
    setPermissions,
    savingGoals,
    addSavingGoal,
    deleteSavingGoal,
    metrics,
    transactions,
    investments,
    bankAccounts,
    goals,
    googleConnection,
    setGoogleConnection,
  } = useFinance();

  const [startingText, setStartingText] = useState("");
  const [fixedText, setFixedText] = useState("");
  const [categoryType, setCategoryType] = useState<TransactionType>("expense");
  const [newCategory, setNewCategory] = useState("");

  const [goalName, setGoalName] = useState("");
  const [goalTargetText, setGoalTargetText] = useState("");
  const [goalEmoji, setGoalEmoji] = useState("🎯");
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);

  const googleConfigured =
    Platform.OS === "web"
      ? Boolean(GOOGLE_WEB_CLIENT_ID)
      : Boolean(GOOGLE_ANDROID_CLIENT_ID);

  const [, googleResponse, promptGoogleAsync] = Google.useAuthRequest(
    {
      androidClientId: GOOGLE_ANDROID_CLIENT_ID,
      webClientId: GOOGLE_WEB_CLIENT_ID,
      scopes: ["openid", "profile", "email", GOOGLE_DRIVE_SCOPE],
      selectAccount: true,
    },
    {
      scheme: "financas",
    },
  );

  useEffect(() => {
    setStartingText(
      base.startingBalance > 0
        ? String(base.startingBalance).replace(".", ",")
        : "",
    );
    setFixedText(
      base.fixedIncome > 0 ? String(base.fixedIncome).replace(".", ",") : "",
    );
  }, [base.startingBalance, base.fixedIncome]);

  useEffect(() => {
    if (!googleResponse) return;

    if (googleResponse.type === "error") {
      setGoogleBusy(false);
      showMessage(
        "Google não conectou",
        googleResponse.error?.message ??
          "O Google retornou um erro. Confira as credenciais OAuth e tente novamente.",
      );
      return;
    }

    if (googleResponse.type !== "success") {
      setGoogleBusy(false);
      return;
    }

    const token =
      googleResponse.authentication?.accessToken ??
      googleResponse.params.access_token;

    if (!token) {
      setGoogleBusy(false);
      showMessage(
        "Token não recebido",
        "O login abriu, mas não retornou autorização para usar o Google Drive.",
      );
      return;
    }

    setGoogleAccessToken(token);
    fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Não foi possível ler o perfil Google.");
        return response.json() as Promise<{
          email?: string;
          name?: string;
          picture?: string;
        }>;
      })
      .then((profile) => {
        if (!profile.email) {
          throw new Error("O Google não retornou o e-mail da conta.");
        }
        const connection: GoogleConnection = {
          email: profile.email,
          name: profile.name,
          picture: profile.picture,
          connectedAt: new Date().toISOString(),
          lastBackupAt: googleConnection?.lastBackupAt,
        };
        setGoogleConnection(connection);
        showMessage(
          "Google conectado",
          `Conta conectada: ${profile.email}\n\nAgora você pode enviar backup para o Google Drive.`,
        );
      })
      .catch((error) => {
        showMessage(
          "Google conectou parcialmente",
          error instanceof Error
            ? error.message
            : "Não consegui ler o perfil da conta.",
        );
      })
      .finally(() => setGoogleBusy(false));
  }, [googleConnection?.lastBackupAt, googleResponse, setGoogleConnection]);

  const handleConnectGoogle = async () => {
    if (!googleConfigured) {
      showMessage(
        "Configuração do Google pendente",
        [
          "Para conectar de verdade, crie os Client IDs no Google Cloud e preencha:",
          "",
          "EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID",
          "EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID",
          "",
          "Depois gere um novo APK.",
        ].join("\n"),
      );
      return;
    }
    setGoogleBusy(true);
    try {
      await promptGoogleAsync();
    } catch {
      setGoogleBusy(false);
      showMessage("Erro ao abrir Google", "Não consegui abrir a tela de login.");
    }
  };

  const handleDisconnectGoogle = () => {
    setGoogleAccessToken(null);
    setGoogleConnection(undefined);
    showMessage("Google desconectado", "A conta Google foi removida deste app.");
  };

  const handleGoogleBackup = async () => {
    if (!googleAccessToken) {
      showMessage(
        "Conecte novamente",
        "Por segurança, o token do Google não fica salvo para sempre. Toque em Conectar Google e depois envie o backup.",
      );
      return;
    }

    setBackupBusy(true);
    try {
      const backup = {
        app: "Minhas Finanças",
        exportedAt: new Date().toISOString(),
        package: "com.financaspessoal.app",
        dataVersion: 1,
        data: {
          transactions,
          investments,
          bankAccounts,
          savingGoals,
          incomeCategories,
          expenseCategories,
          goals,
          base,
          permissions,
          googleConnection,
        },
      };
      const file = await uploadBackupToDrive(googleAccessToken, backup);
      setGoogleConnection({
        ...(googleConnection ?? {
          email: "Conta Google",
          connectedAt: new Date().toISOString(),
        }),
        lastBackupAt: new Date().toISOString(),
      });
      showMessage(
        "Backup enviado",
        `Arquivo criado no Google Drive:\n${file.name}`,
      );
    } catch (error) {
      showMessage(
        "Backup não enviado",
        error instanceof Error
          ? error.message
          : "Não consegui enviar o backup para o Google Drive.",
      );
    } finally {
      setBackupBusy(false);
    }
  };

  const handleAddGoal = () => {
    const name = goalName.trim();
    const target = parseBRLNumber(goalTargetText);
    if (!name) {
      if (Platform.OS === "web") window.alert("Informe o nome da meta.");
      else Alert.alert("Nome obrigatório", "Informe o nome da meta.");
      return;
    }
    if (target <= 0) {
      if (Platform.OS === "web") window.alert("Informe um valor alvo maior que zero.");
      else Alert.alert("Valor inválido", "Informe um valor alvo maior que zero.");
      return;
    }
    addSavingGoal({ name, emoji: goalEmoji, targetAmount: target });
    setGoalName("");
    setGoalTargetText("");
    setGoalEmoji("🎯");
  };

  const confirmDeleteGoal = (id: string, name: string) => {
    const msg = `Isso remove a meta "${name}" e a categoria vinculada. Os lançamentos já feitos são mantidos.`;
    if (Platform.OS === "web") {
      if (window.confirm(msg)) deleteSavingGoal(id);
      return;
    }
    Alert.alert("Remover meta", msg, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => deleteSavingGoal(id) },
    ]);
  };

  return (
    <Screen
      title="Planejar"
      subtitle="Metas, base financeira e configurações do app"
    >
      <Card>
        <SectionHeader
          eyebrow="Google"
          title="Conectar conta Google"
          tag={googleConnection ? "Conectado" : "Opcional"}
          tagColor={googleConnection ? colors.income : colors.primary}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Conecte sua conta Google para preparar backup manual no Google Drive.
          O app não salva sua senha e só guarda o e-mail conectado.
        </Text>

        {googleConnection ? (
          <View
            style={[
              styles.googleBox,
              { backgroundColor: colors.cardElevated, borderColor: colors.border },
            ]}
          >
            <View style={styles.googleIcon}>
              <Text style={styles.googleLetter}>G</Text>
            </View>
            <View style={styles.flex1}>
              <Text style={[styles.googleName, { color: colors.foreground }]}>
                {googleConnection.name ?? "Conta Google"}
              </Text>
              <Text style={[styles.googleEmail, { color: colors.mutedForeground }]}>
                {googleConnection.email}
              </Text>
              <Text style={[styles.googleEmail, { color: colors.mutedForeground }]}>
                Último backup: {formatDateTimeBR(googleConnection.lastBackupAt)}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.googleBox,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="cloud" size={22} color={colors.primary} />
            <Text style={[styles.googleHint, { color: colors.mutedForeground }]}>
              Nenhuma conta Google conectada ainda.
            </Text>
          </View>
        )}

        {!googleConfigured ? (
          <View
            style={[
              styles.setupWarning,
              { backgroundColor: colors.expenseSoft, borderColor: colors.expense },
            ]}
          >
            <Feather name="alert-triangle" size={16} color={colors.expense} />
            <Text style={[styles.setupWarningText, { color: colors.foreground }]}>
              Falta configurar os Client IDs do Google antes desta função
              conectar de verdade.
            </Text>
          </View>
        ) : null}

        <View style={styles.googleActions}>
          <View style={styles.flex1}>
            <Button
              label={googleConnection ? "Reconectar Google" : "Conectar Google"}
              onPress={handleConnectGoogle}
              loading={googleBusy}
              icon={
                <Feather
                  name="user-check"
                  size={18}
                  color={colors.primaryForeground}
                />
              }
            />
          </View>
          <View style={styles.flex1}>
            <Button
              variant="secondary"
              label="Backup no Drive"
              onPress={handleGoogleBackup}
              loading={backupBusy}
              disabled={!googleConnection}
              icon={<Feather name="upload-cloud" size={18} color={colors.foreground} />}
            />
          </View>
        </View>

        {googleConnection ? (
          <Button
            variant="ghost"
            label="Desconectar Google"
            onPress={handleDisconnectGoogle}
          />
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Metas de sonho"
          title="Para onde vai cada real guardado"
          tag={`${savingGoals.length} ${savingGoals.length === 1 ? "meta" : "metas"}`}
          tagColor={colors.primary}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Cada meta cria automaticamente uma categoria de saída (ex.: &quot;Meta: Viagem&quot;).
          Lance uma saída com essa categoria e o progresso aqui avança sozinho.
        </Text>

        <View style={styles.emojiRow}>
          {GOAL_EMOJIS.map((e) => (
            <Pressable
              key={e}
              onPress={() => setGoalEmoji(e)}
              style={({ pressed }) => [
                styles.emojiBtn,
                {
                  backgroundColor:
                    goalEmoji === e ? `${colors.primary}30` : colors.muted,
                  borderColor:
                    goalEmoji === e ? colors.primary : colors.border,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Text style={styles.emojiText}>{e}</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.row}>
          <Input
            label="Nome da meta"
            value={goalName}
            onChangeText={setGoalName}
            placeholder="Ex.: Viagem Europa"
            containerStyle={styles.flex1}
          />
          <Input
            label="Valor alvo"
            value={goalTargetText}
            onChangeText={setGoalTargetText}
            placeholder="0,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
        </View>

        {goalName.trim() ? (
          <View
            style={[
              styles.tagPreview,
              { backgroundColor: colors.muted, borderColor: colors.border },
            ]}
          >
            <Feather name="tag" size={12} color={colors.primary} />
            <Text
              style={[styles.tagPreviewText, { color: colors.mutedForeground }]}
            >
              Categoria criada:{" "}
              <Text style={{ color: colors.primary, fontFamily: "Inter_700Bold" }}>
                Meta: {goalName.trim()}
              </Text>
            </Text>
          </View>
        ) : null}

        <Button
          label={`${goalEmoji} Criar meta`}
          onPress={handleAddGoal}
        />

        {savingGoals.length > 0 ? (
          <View style={styles.goalList}>
            {savingGoals.map((goal) => {
              const current = metrics.goalProgress[goal.categoryTag] ?? 0;
              const pct = goal.targetAmount > 0
                ? Math.min(100, (current / goal.targetAmount) * 100)
                : 0;
              return (
                <View
                  key={goal.id}
                  style={[
                    styles.goalCard,
                    {
                      backgroundColor: colors.cardElevated,
                      borderColor: pct >= 100 ? colors.income : colors.border,
                    },
                  ]}
                >
                  <View style={styles.goalHeader}>
                    <Text style={styles.goalEmoji}>{goal.emoji}</Text>
                    <View style={styles.flex1}>
                      <Text
                        style={[styles.goalName, { color: colors.foreground }]}
                      >
                        {goal.name}
                      </Text>
                      <View style={styles.tagRow}>
                        <Feather name="tag" size={10} color={colors.primary} />
                        <Text
                          style={[
                            styles.goalTag,
                            { color: colors.primary },
                          ]}
                        >
                          {goal.categoryTag}
                        </Text>
                      </View>
                    </View>
                    {pct >= 100 ? (
                      <Text style={styles.doneEmoji}>🎉</Text>
                    ) : null}
                    <Pressable
                      onPress={() => confirmDeleteGoal(goal.id, goal.name)}
                      hitSlop={8}
                    >
                      <Feather
                        name="trash-2"
                        size={15}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>
                  <ProgressBar
                    label={`${formatBRL(current)} de ${formatBRL(goal.targetAmount)} (${pct.toFixed(0)}%)`}
                    current={current}
                    target={goal.targetAmount}
                    color={pct >= 100 ? colors.income : colors.primary}
                  />
                </View>
              );
            })}
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Base financeira"
          title="Saldo inicial e salário"
        />
        <Input
          label="Saldo inicial"
          value={startingText}
          onChangeText={setStartingText}
          placeholder="0,00"
          keyboardType="decimal-pad"
          prefix="R$"
          hint="Quanto você tem hoje, antes do primeiro lançamento"
        />
        <Input
          label="Salário fixo mensal"
          value={fixedText}
          onChangeText={setFixedText}
          placeholder="0,00"
          keyboardType="decimal-pad"
          prefix="R$"
          hint="Usado como referência para metas e planejamento"
        />
        <Button
          label="Salvar base"
          onPress={() =>
            setBase({
              startingBalance: parseBRLNumber(startingText),
              fixedIncome: parseBRLNumber(fixedText),
            })
          }
        />
      </Card>

      <Card>
        <SectionHeader eyebrow="Categorias" title="Personalizar listas" />
        <SegmentedControl
          segments={[
            { value: "income", label: "Entrada" },
            { value: "expense", label: "Saída" },
          ]}
          value={categoryType}
          onChange={(v) => setCategoryType(v as TransactionType)}
          activeColor={
            categoryType === "income" ? colors.income : colors.expense
          }
        />
        <Input
          label="Nova categoria"
          value={newCategory}
          onChangeText={setNewCategory}
          placeholder="Ex.: bônus, farmácia"
        />
        <Button
          variant="secondary"
          label="Adicionar categoria"
          onPress={() => {
            addCategory(categoryType, newCategory);
            setNewCategory("");
          }}
        />
        <View style={styles.catColumn}>
          <Text style={[styles.catTitle, { color: colors.foreground }]}>
            Entradas
          </Text>
          <View style={styles.tokensRow}>
            {incomeCategories.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                Nenhuma categoria de entrada
              </Text>
            ) : (
              incomeCategories.map((c) => (
                <CategoryToken
                  key={c}
                  label={c}
                  tone="income"
                  onRemove={
                    incomeCategories.length > 1
                      ? () => removeCategory("income", c)
                      : undefined
                  }
                />
              ))
            )}
          </View>
        </View>
        <View style={styles.catColumn}>
          <Text style={[styles.catTitle, { color: colors.foreground }]}>
            Saídas
          </Text>
          <View style={styles.tokensRow}>
            {expenseCategories.length === 0 ? (
              <Text style={[styles.empty, { color: colors.mutedForeground }]}>
                Nenhuma categoria de saída
              </Text>
            ) : (
              expenseCategories.map((c) => (
                <CategoryToken
                  key={c}
                  label={c}
                  tone="expense"
                  onRemove={
                    expenseCategories.length > 1
                      ? () => removeCategory("expense", c)
                      : undefined
                  }
                />
              ))
            )}
          </View>
        </View>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Planejamento do app"
          title="Permissões futuras"
          tag="Ideia salva"
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Quando este projeto virar app Android, ele poderá pedir sua
          autorização antes de usar notificações, localização ou leitura de
          alertas bancários. Defina aqui o que você gostaria de permitir.
        </Text>
        <PermissionRow
          label="Notificações do banco"
          value={permissions.notifications}
          onChange={(v) => setPermissions({ notifications: v })}
        />
        <PermissionRow
          label="Localização"
          value={permissions.location}
          onChange={(v) => setPermissions({ location: v })}
        />
        <PermissionRow
          label="Arquivos e backup"
          value={permissions.files}
          onChange={(v) => setPermissions({ files: v })}
        />
      </Card>
    </Screen>
  );
}

function PermissionRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: PermissionLevel;
  onChange: (v: PermissionLevel) => void;
}) {
  return (
    <Select
      label={label}
      value={value}
      options={PERMISSION_LEVELS.map((p) => ({
        value: p.value,
        label: p.label,
      }))}
      onChange={(v) => onChange(v as PermissionLevel)}
    />
  );
}

const styles = StyleSheet.create({
  copy: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  row: { flexDirection: "row", gap: 10 },
  flex1: { flex: 1 },
  googleBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
  },
  googleIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  googleLetter: {
    fontFamily: "Inter_700Bold",
    fontSize: 22,
    color: "#4285F4",
  },
  googleName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  googleEmail: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    marginTop: 2,
  },
  googleHint: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  googleActions: {
    flexDirection: "row",
    gap: 10,
  },
  setupWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
  },
  setupWarningText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    lineHeight: 17,
  },
  emojiRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  emojiBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  emojiText: { fontSize: 20 },
  tagPreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: StyleSheet.hairlineWidth,
  },
  tagPreviewText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    flex: 1,
  },
  goalList: { gap: 12 },
  goalCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 12,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  goalEmoji: { fontSize: 26 },
  goalName: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  goalTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  doneEmoji: { fontSize: 20 },
  catColumn: { gap: 8 },
  catTitle: { fontFamily: "Inter_700Bold", fontSize: 13 },
  tokensRow: { flexDirection: "row", flexWrap: "wrap" },
  empty: { fontFamily: "Inter_500Medium", fontSize: 12 },
});
