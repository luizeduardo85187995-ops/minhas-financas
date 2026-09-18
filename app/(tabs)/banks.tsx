import { Feather } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
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
import { EmptyState } from "@/components/EmptyState";
import { Input } from "@/components/Input";
import { Screen } from "@/components/Screen";
import { Select } from "@/components/Select";
import {
  useFinance,
  type BankAccount,
  type BankAccountType,
} from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import {
  formatBRL,
  formatDateBR,
  parseBRLNumber,
  todayISO,
} from "@/lib/format";
import { parseBankNotification, type ParsedTransaction } from "@/lib/bankParser";

const BANK_OPTIONS = [
  "Nubank",
  "Itau",
  "Bradesco",
  "Banco do Brasil",
  "Caixa",
  "Santander",
  "Banco Inter",
  "C6 Bank",
  "PicPay",
  "Mercado Pago",
  "XP",
  "BTG",
  "Outro banco",
];

const ACCOUNT_TYPES: { value: BankAccountType; label: string }[] = [
  { value: "checking", label: "Conta corrente" },
  { value: "savings", label: "Poupanca" },
  { value: "wallet", label: "Carteira digital" },
  { value: "broker", label: "Corretora" },
  { value: "credit-card", label: "Cartao de credito" },
];

function accountTypeLabel(type: BankAccountType): string {
  return ACCOUNT_TYPES.find((item) => item.value === type)?.label ?? "Conta";
}

function formatUpdatedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "sem data";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function alertMessage(title: string, message: string) {
  if (Platform.OS === "web") {
    window.alert(`${title}\n\n${message}`);
    return;
  }
  Alert.alert(title, message);
}

function signedAccountBalance(account: BankAccount): number {
  if (account.accountType === "credit-card") {
    return -Math.abs(account.balance);
  }
  return account.balance;
}

export default function BanksScreen() {
  const colors = useColors();
  const {
    bankAccounts,
    metrics,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addTransaction,
  } = useFinance();

  const [bankName, setBankName] = useState(BANK_OPTIONS[0]);
  const [accountType, setAccountType] = useState<BankAccountType>("checking");
  const [nickname, setNickname] = useState("");
  const [balanceText, setBalanceText] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBalanceText, setEditBalanceText] = useState("");

  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<ParsedTransaction | null>(null);

  const bankOptions = useMemo(
    () => BANK_OPTIONS.map((bank) => ({ value: bank, label: bank })),
    [],
  );

  const submitAccount = () => {
    const amount = parseBRLNumber(balanceText);
    if (!bankName || amount < 0) {
      alertMessage(
        "Revise os dados",
        "Escolha o banco e informe um saldo maior ou igual a zero.",
      );
      return;
    }
    addBankAccount({
      bankName,
      accountType,
      nickname: nickname.trim() || undefined,
      balance: amount,
    });
    setNickname("");
    setBalanceText("");
  };

  const openEdit = (account: BankAccount) => {
    setEditingId(account.id);
    setEditBalanceText(account.balance.toFixed(2).replace(".", ","));
  };

  const saveEdit = (account: BankAccount) => {
    const amount = parseBRLNumber(editBalanceText);
    if (amount < 0) {
      alertMessage("Saldo invalido", "Informe um valor maior ou igual a zero.");
      return;
    }
    updateBankAccount(account.id, { balance: amount });
    setEditingId(null);
    setEditBalanceText("");
  };

  const confirmDelete = (account: BankAccount) => {
    const message = `Remover ${account.nickname || account.bankName}?`;
    if (Platform.OS === "web") {
      if (window.confirm(message)) deleteBankAccount(account.id);
      return;
    }
    Alert.alert("Remover conta", message, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => deleteBankAccount(account.id),
      },
    ]);
  };

  const handleDetect = async () => {
    setDetecting(true);
    setDetected(null);
    try {
      const text = await Clipboard.getStringAsync();
      const parsed = parseBankNotification(text);
      if (!parsed) {
        alertMessage(
          "Nao reconheci",
          "Copie uma notificacao completa do banco com valor e tente novamente.",
        );
        return;
      }
      setDetected(parsed);
    } catch {
      alertMessage("Erro", "Nao foi possivel ler a area de transferencia.");
    } finally {
      setDetecting(false);
    }
  };

  const createDetectedTransaction = () => {
    if (!detected) return;
    addTransaction({
      type: detected.type,
      amount: detected.amount,
      category: detected.category,
      date: todayISO(),
      note: detected.bank
        ? `${detected.bank}: ${detected.note}`
        : detected.note,
    });
    setDetected(null);
    alertMessage(
      "Lancamento criado",
      "O app registrou esse movimento no historico.",
    );
  };

  return (
    <Screen
      title="Bancos"
      subtitle="Saldos e movimentos em um lugar, sem pedir senha do banco"
    >
      <Card>
        <SectionHeader
          eyebrow="Central bancaria"
          title="Seu mapa de contas"
          tag={
            bankAccounts.length > 0
              ? `${bankAccounts.length} conta${bankAccounts.length > 1 ? "s" : ""}`
              : "Comecar"
          }
          tagColor={colors.primary}
        />
        <View style={styles.summaryGrid}>
          <SummaryBox
            label="Saldo informado"
            value={formatBRL(metrics.bankPositiveBalance)}
            tone={colors.income}
          />
          <SummaryBox
            label="Cartoes em aberto"
            value={formatBRL(metrics.creditCardOpenBalance)}
            tone={colors.expense}
          />
          <SummaryBox
            label="Visao liquida"
            value={formatBRL(metrics.bankBalance)}
            tone={metrics.bankBalance >= 0 ? colors.foreground : colors.expense}
          />
        </View>
        {metrics.staleBankAccounts > 0 ? (
          <View
            style={[
              styles.notice,
              { backgroundColor: colors.coin + "18", borderColor: colors.coin },
            ]}
          >
            <Feather name="clock" size={14} color={colors.coin} />
            <Text style={[styles.noticeText, { color: colors.foreground }]}>
              {metrics.staleBankAccounts} conta(s) sem atualizacao ha mais de 7
              dias.
            </Text>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Conexao real"
          title="Open Finance preparado"
          tag="Sem senha"
          tagColor={colors.invest}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Para puxar saldo real automaticamente, o caminho correto e Open
          Finance com consentimento. Hoje este app roda no modo sem mensalidade:
          voce informa os saldos e usa a leitura inteligente de notificacoes.
        </Text>
        <View style={styles.modeGrid}>
          <ModePill icon="shield" title="Seguro" text="Nao pede senha bancaria" />
          <ModePill icon="wifi" title="Pronto" text="Pluggy, Belvo ou Klavi depois" />
          <ModePill icon="dollar-sign" title="Zero mensalidade" text="Funciona manualmente agora" />
        </View>
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Adicionar"
          title="Conta, cartao ou corretora"
        />
        <View style={styles.row}>
          <View style={styles.flex1}>
            <Select
              label="Banco"
              value={bankName}
              options={bankOptions}
              onChange={setBankName}
            />
          </View>
          <View style={styles.flex1}>
            <Select
              label="Tipo"
              value={accountType}
              options={ACCOUNT_TYPES}
              onChange={(value) => setAccountType(value as BankAccountType)}
            />
          </View>
        </View>
        <View style={styles.row}>
          <Input
            label="Apelido"
            value={nickname}
            onChangeText={setNickname}
            placeholder="Ex.: conta salario"
            containerStyle={styles.flex1}
          />
          <Input
            label={accountType === "credit-card" ? "Fatura atual" : "Saldo atual"}
            value={balanceText}
            onChangeText={setBalanceText}
            placeholder="0,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
        </View>
        <Button label="Adicionar" onPress={submitAccount} />
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Importacao rapida"
          title="Ler notificacao copiada"
          tag="IA local"
          tagColor={colors.coin}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Copie uma notificacao do banco. O app tenta identificar valor, tipo,
          categoria e banco, sem enviar esse texto para servidor.
        </Text>
        <Button
          label={detecting ? "Analisando" : "Detectar texto copiado"}
          onPress={handleDetect}
          loading={detecting}
          icon={<Feather name="clipboard" size={16} color={colors.primaryForeground} />}
        />
        {detected ? (
          <View
            style={[
              styles.detectedBox,
              {
                backgroundColor: colors.cardElevated,
                borderColor:
                  detected.type === "income" ? colors.income : colors.expense,
              },
            ]}
          >
            <View style={styles.detectedHeader}>
              <Text style={[styles.detectedTitle, { color: colors.foreground }]}>
                {detected.type === "income" ? "Entrada" : "Saida"} detectada
              </Text>
              <Text
                style={[
                  styles.detectedAmount,
                  {
                    color:
                      detected.type === "income" ? colors.income : colors.expense,
                  },
                ]}
              >
                {formatBRL(detected.amount)}
              </Text>
            </View>
            <Text style={[styles.detectedMeta, { color: colors.mutedForeground }]}>
              {detected.bank ? `${detected.bank} - ` : ""}
              {detected.category} - {detected.note}
            </Text>
            <View style={styles.actions}>
              <View style={styles.flex1}>
                <Button
                  variant="secondary"
                  label="Descartar"
                  onPress={() => setDetected(null)}
                />
              </View>
              <View style={styles.flex1}>
                <Button label="Registrar" onPress={createDetectedTransaction} />
              </View>
            </View>
          </View>
        ) : null}
      </Card>

      <Card>
        <SectionHeader
          eyebrow="Contas"
          title="Saldos cadastrados"
          tag={formatDateBR(todayISO())}
        />
        {bankAccounts.length === 0 ? (
          <EmptyState
            icon="credit-card"
            title="Nenhuma conta ainda"
            description="Adicione uma conta para acompanhar seus saldos sem depender de mensalidade."
          />
        ) : (
          <View style={styles.accountList}>
            {bankAccounts.map((account) => {
              const signed = signedAccountBalance(account);
              const tone = signed >= 0 ? colors.income : colors.expense;
              const isEditing = editingId === account.id;
              return (
                <View
                  key={account.id}
                  style={[
                    styles.accountCard,
                    {
                      backgroundColor: colors.muted,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.accountHeader}>
                    <View style={styles.accountIcon}>
                      <Feather
                        name={
                          account.accountType === "credit-card"
                            ? "credit-card"
                            : "briefcase"
                        }
                        size={17}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.flex1}>
                      <Text
                        style={[styles.accountTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {account.nickname || account.bankName}
                      </Text>
                      <Text
                        style={[
                          styles.accountSubtitle,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {account.bankName} - {accountTypeLabel(account.accountType)}
                      </Text>
                    </View>
                    <Text style={[styles.accountAmount, { color: tone }]}>
                      {formatBRL(signed)}
                    </Text>
                  </View>
                  <View style={styles.accountFooter}>
                    <Text
                      style={[
                        styles.accountUpdated,
                        { color: colors.mutedForeground },
                      ]}
                    >
                      Atualizado {formatUpdatedAt(account.updatedAt)}
                    </Text>
                    <View style={styles.iconActions}>
                      <Pressable
                        onPress={() =>
                          isEditing ? setEditingId(null) : openEdit(account)
                        }
                        hitSlop={8}
                        style={styles.iconButton}
                      >
                        <Feather
                          name={isEditing ? "x" : "edit-2"}
                          size={15}
                          color={isEditing ? colors.expense : colors.primary}
                        />
                      </Pressable>
                      <Pressable
                        onPress={() => confirmDelete(account)}
                        hitSlop={8}
                        style={styles.iconButton}
                      >
                        <Feather
                          name="trash-2"
                          size={15}
                          color={colors.mutedForeground}
                        />
                      </Pressable>
                    </View>
                  </View>
                  {isEditing ? (
                    <View
                      style={[
                        styles.editBox,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Input
                        label={
                          account.accountType === "credit-card"
                            ? "Nova fatura"
                            : "Novo saldo"
                        }
                        value={editBalanceText}
                        onChangeText={setEditBalanceText}
                        placeholder="0,00"
                        keyboardType="decimal-pad"
                        prefix="R$"
                      />
                      <Button label="Salvar saldo" onPress={() => saveEdit(account)} />
                    </View>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}
      </Card>
    </Screen>
  );
}

function SummaryBox({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.summaryBox,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Text style={[styles.summaryLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text style={[styles.summaryValue, { color: tone }]}>{value}</Text>
    </View>
  );
}

function ModePill({
  icon,
  title,
  text,
}: {
  icon: keyof typeof Feather.glyphMap;
  title: string;
  text: string;
}) {
  const colors = useColors();
  return (
    <View
      style={[
        styles.modePill,
        { backgroundColor: colors.muted, borderColor: colors.border },
      ]}
    >
      <Feather name={icon} size={15} color={colors.primary} />
      <Text style={[styles.modeTitle, { color: colors.foreground }]}>
        {title}
      </Text>
      <Text style={[styles.modeText, { color: colors.mutedForeground }]}>
        {text}
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
    flexWrap: "wrap",
    gap: 10,
  },
  flex1: {
    flex: 1,
    minWidth: 140,
  },
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  summaryBox: {
    flex: 1,
    minWidth: 118,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  summaryLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  summaryValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  notice: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  noticeText: {
    flex: 1,
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  modeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  modePill: {
    flex: 1,
    minWidth: 120,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 4,
  },
  modeTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
  },
  modeText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    lineHeight: 15,
  },
  detectedBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  detectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
  },
  detectedTitle: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  detectedAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  detectedMeta: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    lineHeight: 17,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  accountList: {
    gap: 12,
  },
  accountCard: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 12,
    gap: 10,
  },
  accountHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accountIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  accountTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  accountSubtitle: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 2,
  },
  accountAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  accountFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  accountUpdated: {
    flex: 1,
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  iconActions: {
    flexDirection: "row",
    gap: 4,
  },
  iconButton: {
    padding: 6,
  },
  editBox: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
});
