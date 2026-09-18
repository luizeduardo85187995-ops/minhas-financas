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
import { SegmentedControl } from "@/components/SegmentedControl";
import {
  useFinance,
  type Transaction,
  type TransactionType,
} from "@/context/FinanceContext";
import { useColors } from "@/hooks/useColors";
import {
  formatBRL,
  formatDateBR,
  parseBRLNumber,
  parseDateBR,
  todayISO,
} from "@/lib/format";
import { parseBankNotification, type ParsedTransaction } from "@/lib/bankParser";

export default function TransactionsScreen() {
  const colors = useColors();
  const {
    transactions,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    incomeCategories,
    expenseCategories,
  } = useFinance();

  const [type, setType] = useState<TransactionType>("expense");
  const [category, setCategory] = useState<string>("");
  const [amountText, setAmountText] = useState("");
  const [dateText, setDateText] = useState(formatDateBR(todayISO()));
  const [note, setNote] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editType, setEditType] = useState<TransactionType>("expense");
  const [editCategory, setEditCategory] = useState("");
  const [editAmountText, setEditAmountText] = useState("");
  const [editDateText, setEditDateText] = useState("");
  const [editNote, setEditNote] = useState("");

  // Bank detection state
  const [detecting, setDetecting] = useState(false);
  const [detected, setDetected] = useState<ParsedTransaction | null>(null);
  const [rawClipboard, setRawClipboard] = useState("");

  const categories = type === "income" ? incomeCategories : expenseCategories;
  const editCategories =
    editType === "income" ? incomeCategories : expenseCategories;

  const categoryOptions = useMemo(
    () => categories.map((c) => ({ value: c, label: c })),
    [categories],
  );
  const editCategoryOptions = useMemo(
    () => editCategories.map((c) => ({ value: c, label: c })),
    [editCategories],
  );

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      if (a.date === b.date) return 0;
      return a.date < b.date ? 1 : -1;
    });
  }, [transactions]);

  // ── Bank notification detection ────────────────────────────────────────────

  const handleDetect = async () => {
    setDetecting(true);
    try {
      const text = await Clipboard.getStringAsync();
      if (!text || text.trim().length < 5) {
        const msg =
          "Área de transferência vazia.\n\nCopie o texto de uma notificação do banco (toque longo na notificação → Copiar) e tente novamente.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Nada copiado", msg);
        return;
      }
      const result = parseBankNotification(text);
      if (!result) {
        const msg =
          "Não consegui identificar um lançamento nesse texto. Verifique se copiou a notificação completa do banco.";
        if (Platform.OS === "web") window.alert(msg);
        else Alert.alert("Não reconhecido", msg);
        return;
      }
      setRawClipboard(text.slice(0, 160));
      setDetected(result);
    } catch {
      const msg = "Não foi possível ler a área de transferência.";
      if (Platform.OS === "web") window.alert(msg);
      else Alert.alert("Erro", msg);
    } finally {
      setDetecting(false);
    }
  };

  const applyDetected = () => {
    if (!detected) return;
    const allCats =
      detected.type === "income" ? incomeCategories : expenseCategories;
    const matchedCat = allCats.find(
      (c) => c.toLowerCase() === detected.category.toLowerCase(),
    ) ?? allCats[0] ?? "Outros";

    setType(detected.type);
    setCategory(matchedCat);
    setAmountText(detected.amount.toFixed(2).replace(".", ","));
    setNote(detected.note);
    setDateText(formatDateBR(todayISO()));
    setDetected(null);
    setRawClipboard("");
  };

  const dismissDetected = () => {
    setDetected(null);
    setRawClipboard("");
  };

  // ── Form submission ────────────────────────────────────────────────────────

  const submit = () => {
    const amount = parseBRLNumber(amountText);
    if (amount <= 0) {
      if (Platform.OS === "web") {
        window.alert("Informe um valor maior que zero.");
      } else {
        Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      }
      return;
    }
    const finalCategory = category || categories[0] || "Outros";
    const isoDate = parseDateBR(dateText) ?? todayISO();
    addTransaction({
      type,
      amount,
      category: finalCategory,
      date: isoDate,
      note: note.trim() || undefined,
    });
    setAmountText("");
    setNote("");
    setDateText(formatDateBR(todayISO()));
  };

  const openEdit = (t: Transaction) => {
    setEditingId(t.id);
    setEditType(t.type);
    setEditCategory(t.category);
    setEditAmountText(t.amount.toFixed(2).replace(".", ","));
    setEditDateText(formatDateBR(t.date));
    setEditNote(t.note ?? "");
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = () => {
    if (!editingId) return;
    const amount = parseBRLNumber(editAmountText);
    if (amount <= 0) {
      if (Platform.OS === "web") {
        window.alert("Informe um valor maior que zero.");
      } else {
        Alert.alert("Valor inválido", "Informe um valor maior que zero.");
      }
      return;
    }
    const isoDate = parseDateBR(editDateText) ?? todayISO();
    const finalCategory = editCategory || editCategories[0] || "Outros";
    updateTransaction(editingId, {
      type: editType,
      amount,
      category: finalCategory,
      date: isoDate,
      note: editNote.trim() || undefined,
    });
    setEditingId(null);
  };

  const confirmDelete = (id: string) => {
    if (editingId === id) setEditingId(null);
    if (Platform.OS === "web") {
      if (window.confirm("Apagar este lançamento?")) deleteTransaction(id);
      return;
    }
    Alert.alert("Apagar lançamento", "Tem certeza?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Apagar",
        style: "destructive",
        onPress: () => deleteTransaction(id),
      },
    ]);
  };

  const confidenceColor = (c: ParsedTransaction["confidence"]) => {
    if (c === "high") return colors.income;
    if (c === "medium") return colors.coin;
    return colors.mutedForeground;
  };

  const confidenceLabel = (c: ParsedTransaction["confidence"]) => {
    if (c === "high") return "Alta confiança ✓";
    if (c === "medium") return "Confiança média";
    return "Baixa confiança — revise";
  };

  return (
    <Screen
      title="Lançamentos"
      subtitle="Registre cada entrada e cada saída para o gráfico se mover"
    >
      {/* ── Smart bank detector ─────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          eyebrow="Detecção inteligente"
          title="Lançamento pelo banco"
          tag="Automático"
          tagColor={colors.primary}
        />
        <Text style={[styles.copy, { color: colors.mutedForeground }]}>
          Copie qualquer notificação do seu banco (Nubank, Itaú, Bradesco, C6,
          Inter, PicPay e outros) e toque no botão abaixo. O app detecta o
          valor, tipo e categoria sozinho.
        </Text>

        {/* How-to steps */}
        <View
          style={[
            styles.howTo,
            { backgroundColor: colors.muted, borderColor: colors.border },
          ]}
        >
          {[
            "Abra as notificações do celular",
            "Toque e segure na notificação do banco",
            "Selecione \"Copiar\"",
            "Volte aqui e toque em Detectar",
          ].map((step, i) => (
            <View key={i} style={styles.howToRow}>
              <View
                style={[styles.howToNum, { backgroundColor: colors.primary }]}
              >
                <Text style={[styles.howToNumText, { color: colors.primaryForeground }]}>
                  {i + 1}
                </Text>
              </View>
              <Text style={[styles.howToText, { color: colors.mutedForeground }]}>
                {step}
              </Text>
            </View>
          ))}
        </View>

        <Button
          label={detecting ? "Detectando..." : "📋  Detectar notificação copiada"}
          onPress={handleDetect}
          loading={detecting}
        />

        {/* Detection result */}
        {detected ? (
          <View
            style={[
              styles.resultBox,
              {
                backgroundColor: colors.cardElevated,
                borderColor: confidenceColor(detected.confidence),
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <Text style={[styles.resultTitle, { color: colors.foreground }]}>
                Lançamento detectado
              </Text>
              <Text
                style={[
                  styles.confidenceBadge,
                  { color: confidenceColor(detected.confidence) },
                ]}
              >
                {confidenceLabel(detected.confidence)}
              </Text>
            </View>

            {rawClipboard ? (
              <View
                style={[
                  styles.rawBox,
                  { backgroundColor: colors.muted, borderColor: colors.border },
                ]}
              >
                <Text
                  style={[styles.rawText, { color: colors.mutedForeground }]}
                  numberOfLines={3}
                >
                  "{rawClipboard}"
                </Text>
              </View>
            ) : null}

            <View style={styles.resultGrid}>
              <ResultRow
                label="Tipo"
                value={detected.type === "income" ? "✅ Entrada" : "🔴 Saída"}
                valueColor={
                  detected.type === "income" ? colors.income : colors.expense
                }
              />
              <ResultRow
                label="Valor"
                value={formatBRL(detected.amount)}
                valueColor={colors.foreground}
              />
              <ResultRow
                label="Categoria"
                value={detected.category}
                valueColor={colors.primary}
              />
              <ResultRow
                label="Descrição"
                value={detected.note}
                valueColor={colors.foreground}
              />
              {detected.bank ? (
                <ResultRow
                  label="Banco"
                  value={detected.bank}
                  valueColor={colors.mutedForeground}
                />
              ) : null}
            </View>

            <Text
              style={[styles.reviewHint, { color: colors.mutedForeground }]}
            >
              Confira os dados acima. Ao confirmar, o formulário é preenchido
              automaticamente — você ainda pode ajustar antes de salvar.
            </Text>

            <View style={styles.resultActions}>
              <View style={styles.flex1}>
                <Button
                  variant="secondary"
                  label="Ignorar"
                  onPress={dismissDetected}
                />
              </View>
              <View style={styles.flex1}>
                <Button label="✓ Usar este" onPress={applyDetected} />
              </View>
            </View>
          </View>
        ) : null}
      </Card>

      {/* ── Manual entry form ────────────────────────────────────────────── */}
      <Card>
        <SectionHeader eyebrow="Novo lançamento" title="Entrada ou saída" />
        <SegmentedControl
          segments={[
            { value: "income", label: "Entrada" },
            { value: "expense", label: "Saída" },
          ]}
          value={type}
          onChange={(v) => {
            setType(v as TransactionType);
            setCategory("");
          }}
          activeColor={type === "income" ? colors.income : colors.expense}
        />
        <Select
          label="Categoria"
          value={category || categories[0] || ""}
          options={
            categoryOptions.length > 0
              ? categoryOptions
              : [{ value: "Outros", label: "Outros" }]
          }
          onChange={setCategory}
        />
        <View style={styles.row}>
          <Input
            label="Valor"
            value={amountText}
            onChangeText={setAmountText}
            placeholder="0,00"
            keyboardType="decimal-pad"
            prefix="R$"
            containerStyle={styles.flex1}
          />
          <Input
            label="Data"
            value={dateText}
            onChangeText={setDateText}
            placeholder="DD/MM/AAAA"
            containerStyle={styles.flex1}
          />
        </View>
        <View style={styles.quickRow}>
          <QuickChip
            label="Hoje"
            onPress={() => setDateText(formatDateBR(todayISO()))}
          />
          <QuickChip
            label="Ontem"
            onPress={() => {
              const d = new Date();
              d.setDate(d.getDate() - 1);
              setDateText(formatDateBR(d.toISOString().slice(0, 10)));
            }}
          />
        </View>
        <Input
          label="Descrição"
          value={note}
          onChangeText={setNote}
          placeholder="Ex.: mercado da semana, freela"
        />
        <Button
          label={`Adicionar ${type === "income" ? "entrada" : "saída"}`}
          onPress={submit}
        />
      </Card>

      {/* ── Transaction list ─────────────────────────────────────────────── */}
      <Card>
        <SectionHeader
          eyebrow="Histórico"
          title="Últimos lançamentos"
          tag={`${transactions.length} ${transactions.length === 1 ? "item" : "itens"}`}
        />
        {sortedTransactions.length === 0 ? (
          <EmptyState
            icon="inbox"
            title="Nenhum lançamento ainda"
            description="Adicione um lançamento acima para ver o histórico e o mini gráfico mexer"
          />
        ) : (
          <View style={styles.list}>
            {sortedTransactions.map((t) => {
              const isIncome = t.type === "income";
              const tone = isIncome ? colors.income : colors.expense;
              const bg = isIncome ? colors.incomeSoft : colors.expenseSoft;
              const isEditing = editingId === t.id;

              return (
                <View key={t.id}>
                  <View style={styles.txRow}>
                    <View style={[styles.bullet, { backgroundColor: bg }]}>
                      <Feather
                        name={isIncome ? "arrow-down-left" : "arrow-up-right"}
                        size={16}
                        color={tone}
                      />
                    </View>
                    <View style={styles.itemBody}>
                      <Text
                        style={[styles.itemTitle, { color: colors.foreground }]}
                        numberOfLines={1}
                      >
                        {t.category}
                      </Text>
                      <Text
                        style={[
                          styles.itemSub,
                          { color: colors.mutedForeground },
                        ]}
                        numberOfLines={1}
                      >
                        {formatDateBR(t.date)}
                        {t.note ? `  •  ${t.note}` : ""}
                      </Text>
                    </View>
                    <Text style={[styles.itemAmount, { color: tone }]}>
                      {isIncome ? "+" : "-"} {formatBRL(t.amount)}
                    </Text>
                    <Pressable
                      onPress={() => (isEditing ? cancelEdit() : openEdit(t))}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Feather
                        name={isEditing ? "x" : "edit-2"}
                        size={15}
                        color={isEditing ? colors.expense : colors.primary}
                      />
                    </Pressable>
                    <Pressable
                      onPress={() => confirmDelete(t.id)}
                      hitSlop={8}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        { opacity: pressed ? 0.5 : 1 },
                      ]}
                    >
                      <Feather
                        name="trash-2"
                        size={15}
                        color={colors.mutedForeground}
                      />
                    </Pressable>
                  </View>

                  {isEditing ? (
                    <View
                      style={[
                        styles.editBox,
                        {
                          backgroundColor: colors.muted,
                          borderColor: colors.primary,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.editTitle,
                          { color: colors.foreground },
                        ]}
                      >
                        Editar lançamento
                      </Text>
                      <SegmentedControl
                        segments={[
                          { value: "income", label: "Entrada" },
                          { value: "expense", label: "Saída" },
                        ]}
                        value={editType}
                        onChange={(v) => {
                          setEditType(v as TransactionType);
                          setEditCategory("");
                        }}
                        activeColor={
                          editType === "income" ? colors.income : colors.expense
                        }
                      />
                      <Select
                        label="Categoria"
                        value={editCategory || editCategories[0] || ""}
                        options={
                          editCategoryOptions.length > 0
                            ? editCategoryOptions
                            : [{ value: "Outros", label: "Outros" }]
                        }
                        onChange={setEditCategory}
                      />
                      <View style={styles.row}>
                        <Input
                          label="Valor"
                          value={editAmountText}
                          onChangeText={setEditAmountText}
                          placeholder="0,00"
                          keyboardType="decimal-pad"
                          prefix="R$"
                          containerStyle={styles.flex1}
                        />
                        <Input
                          label="Data"
                          value={editDateText}
                          onChangeText={setEditDateText}
                          placeholder="DD/MM/AAAA"
                          containerStyle={styles.flex1}
                        />
                      </View>
                      <Input
                        label="Descrição"
                        value={editNote}
                        onChangeText={setEditNote}
                        placeholder="Ex.: mercado da semana"
                      />
                      <View style={styles.editActions}>
                        <View style={styles.flex1}>
                          <Button
                            variant="secondary"
                            label="Cancelar"
                            onPress={cancelEdit}
                          />
                        </View>
                        <View style={styles.flex1}>
                          <Button label="Salvar" onPress={saveEdit} />
                        </View>
                      </View>
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

function ResultRow({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor: string;
}) {
  const colors = useColors();
  return (
    <View style={styles.resultRow}>
      <Text style={[styles.resultLabel, { color: colors.mutedForeground }]}>
        {label}
      </Text>
      <Text
        style={[styles.resultValue, { color: valueColor }]}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}

function QuickChip({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) {
  const colors = useColors();
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: colors.muted,
          borderColor: colors.border,
          opacity: pressed ? 0.6 : 1,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: colors.foreground }]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  copy: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    lineHeight: 18,
  },
  howTo: {
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    gap: 10,
  },
  howToRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  howToNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  howToNumText: {
    fontFamily: "Inter_700Bold",
    fontSize: 12,
  },
  howToText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
    flex: 1,
  },
  resultBox: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  resultHeader: {
    gap: 4,
  },
  resultTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  confidenceBadge: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  rawBox: {
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 10,
  },
  rawText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    fontStyle: "italic",
  },
  resultGrid: {
    gap: 8,
  },
  resultRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  resultLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  resultValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    flex: 1,
    textAlign: "right",
  },
  reviewHint: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  resultActions: {
    flexDirection: "row",
    gap: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  flex1: { flex: 1 },
  quickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
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
  itemBody: {
    flex: 1,
    gap: 2,
  },
  itemTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  itemSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
  },
  itemAmount: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  actionBtn: {
    padding: 6,
  },
  editBox: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 10,
  },
  editTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
  },
  editActions: {
    flexDirection: "row",
    gap: 10,
  },
});
