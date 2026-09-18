import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  DEFAULT_EXPENSE_CATEGORIES,
  DEFAULT_INCOME_CATEGORIES,
  ESTIMATED_MONTHLY_YIELD,
  type InvestmentFocus,
  type InvestmentType,
  type PermissionLevel,
} from "@/constants/categories";
import { monthKey, todayISO } from "@/lib/format";
import { fetchQuote } from "@/lib/marketApi";

export type TransactionType = "income" | "expense";

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  category: string;
  date: string;
  note?: string;
}

export interface Investment {
  id: string;
  type: InvestmentType;
  code: string;
  name?: string;
  amount: number;
  date: string;
  quantity?: number;
  monthlyYield?: number;
  nextPayment?: string;
  transactionId?: string;
  lastPrice?: number;
  lastPriceAt?: string;
  lastPriceError?: string;
}

export interface SavingGoal {
  id: string;
  name: string;
  emoji: string;
  targetAmount: number;
  categoryTag: string;
  createdAt: string;
}

export interface Goals {
  monthly: number;
  reserve: number;
  passiveIncome: number;
  investedPatrimony: number;
}

export interface BaseSettings {
  startingBalance: number;
  fixedIncome: number;
}

export type BankAccountType =
  | "checking"
  | "savings"
  | "wallet"
  | "broker"
  | "credit-card";

export interface BankAccount {
  id: string;
  bankName: string;
  accountType: BankAccountType;
  nickname?: string;
  balance: number;
  updatedAt: string;
  connectionMode: "manual" | "open-finance-ready";
}

export interface Permissions {
  notifications: PermissionLevel;
  location: PermissionLevel;
  files: PermissionLevel;
}

export interface GoogleConnection {
  email: string;
  name?: string;
  picture?: string;
  connectedAt: string;
  lastBackupAt?: string;
}

interface FinanceState {
  transactions: Transaction[];
  investments: Investment[];
  bankAccounts: BankAccount[];
  savingGoals: SavingGoal[];
  incomeCategories: string[];
  expenseCategories: string[];
  goals: Goals;
  base: BaseSettings;
  permissions: Permissions;
  investmentFocus: InvestmentFocus;
  googleConnection?: GoogleConnection;
  marketRefreshedAt?: string;
}

interface FinanceContextValue extends FinanceState {
  loaded: boolean;
  addTransaction: (tx: Omit<Transaction, "id">) => Transaction;
  updateTransaction: (
    id: string,
    changes: Partial<Omit<Transaction, "id">>,
  ) => void;
  deleteTransaction: (id: string) => void;
  addInvestment: (
    inv: Omit<Investment, "id" | "transactionId">,
  ) => Investment;
  deleteInvestment: (id: string) => void;
  addBankAccount: (
    account: Omit<BankAccount, "id" | "updatedAt" | "connectionMode"> &
      Partial<Pick<BankAccount, "updatedAt" | "connectionMode">>,
  ) => BankAccount;
  updateBankAccount: (
    id: string,
    changes: Partial<Omit<BankAccount, "id">>,
  ) => void;
  deleteBankAccount: (id: string) => void;
  addSavingGoal: (
    goal: Omit<SavingGoal, "id" | "categoryTag" | "createdAt">,
  ) => SavingGoal;
  deleteSavingGoal: (id: string) => void;
  addCategory: (type: TransactionType, name: string) => void;
  removeCategory: (type: TransactionType, name: string) => void;
  setGoals: (g: Partial<Goals>) => void;
  setBase: (b: Partial<BaseSettings>) => void;
  setPermissions: (p: Partial<Permissions>) => void;
  setInvestmentFocus: (f: InvestmentFocus) => void;
  setGoogleConnection: (connection?: GoogleConnection) => void;
  refreshMarketPrices: (force?: boolean) => Promise<{
    updated: number;
    failed: number;
  }>;
  refreshing: boolean;
  metrics: {
    balance: number;
    monthIncome: number;
    monthExpense: number;
    monthNet: number;
    estimatedPassiveIncome: number;
    investedTotal: number;
    marketTotal: number;
    marketProfit: number;
    bankBalance: number;
    bankPositiveBalance: number;
    creditCardOpenBalance: number;
    staleBankAccounts: number;
    goalProgress: Record<string, number>;
  };
}

const STORAGE_KEY = "@financas/state-v1";

const DEFAULT_STATE: FinanceState = {
  transactions: [],
  investments: [],
  bankAccounts: [],
  savingGoals: [],
  incomeCategories: DEFAULT_INCOME_CATEGORIES,
  expenseCategories: DEFAULT_EXPENSE_CATEGORIES,
  goals: {
    monthly: 0,
    reserve: 0,
    passiveIncome: 0,
    investedPatrimony: 0,
  },
  base: {
    startingBalance: 0,
    fixedIncome: 0,
  },
  permissions: {
    notifications: "ask",
    location: "ask",
    files: "ask",
  },
  investmentFocus: "income",
};

const FinanceContext = createContext<FinanceContextValue | null>(null);

const PRICEABLE_TYPES: InvestmentType[] = ["fii", "etf", "stock"];

function newId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function finiteNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function stringArray(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return fallback;
  const items = value.filter(
    (item): item is string => typeof item === "string" && item.trim().length > 0,
  );
  return items.length > 0 ? items : fallback;
}

function permissionLevel(value: unknown): PermissionLevel {
  if (value === "allow" || value === "once" || value === "deny") return value;
  return "ask";
}

function investmentFocus(value: unknown): InvestmentFocus {
  if (
    value === "reserve" ||
    value === "growth" ||
    value === "diversification"
  ) {
    return value;
  }
  return "income";
}

function investmentType(value: unknown): InvestmentType {
  if (
    value === "fii" ||
    value === "etf" ||
    value === "stock" ||
    value === "treasury"
  ) {
    return value;
  }
  return "cdb";
}

function bankAccountType(value: unknown): BankAccountType {
  if (
    value === "savings" ||
    value === "wallet" ||
    value === "broker" ||
    value === "credit-card"
  ) {
    return value;
  }
  return "checking";
}

function googleConnection(value: unknown): GoogleConnection | undefined {
  if (!isRecord(value)) return undefined;
  if (typeof value.email !== "string" || !value.email.includes("@")) {
    return undefined;
  }
  return {
    email: value.email,
    connectedAt:
      typeof value.connectedAt === "string"
        ? value.connectedAt
        : new Date().toISOString(),
    ...(typeof value.name === "string" ? { name: value.name } : {}),
    ...(typeof value.picture === "string" ? { picture: value.picture } : {}),
    ...(typeof value.lastBackupAt === "string"
      ? { lastBackupAt: value.lastBackupAt }
      : {}),
  };
}

/**
 * Dados do AsyncStorage sobrevivem a atualizacoes do APK. Esta migracao
 * preserva o que ainda e valido e completa campos adicionados em versoes
 * posteriores, impedindo que um registro antigo derrube o app inteiro.
 */
function hydrateFinanceState(value: unknown): FinanceState {
  if (!isRecord(value)) return DEFAULT_STATE;

  const transactions = Array.isArray(value.transactions)
    ? value.transactions
        .filter(isRecord)
        .map((item): Transaction => ({
          id: typeof item.id === "string" ? item.id : newId(),
          type: item.type === "income" ? "income" : "expense",
          amount: finiteNumber(item.amount),
          category:
            typeof item.category === "string" && item.category.trim()
              ? item.category
              : "Outros",
          date:
            typeof item.date === "string" && item.date.trim()
              ? item.date
              : todayISO(),
          ...(typeof item.note === "string" ? { note: item.note } : {}),
        }))
    : [];

  const goals = isRecord(value.goals) ? value.goals : {};
  const base = isRecord(value.base) ? value.base : {};
  const permissions = isRecord(value.permissions) ? value.permissions : {};
  const investments = Array.isArray(value.investments)
    ? value.investments.filter(isRecord).map(
        (item): Investment => ({
          id: typeof item.id === "string" ? item.id : newId(),
          type: investmentType(item.type),
          code: typeof item.code === "string" ? item.code : "",
          amount: finiteNumber(item.amount),
          date:
            typeof item.date === "string" && item.date.trim()
              ? item.date
              : todayISO(),
          ...(typeof item.name === "string" ? { name: item.name } : {}),
          ...(typeof item.quantity === "number"
            ? { quantity: finiteNumber(item.quantity) }
            : {}),
          ...(typeof item.monthlyYield === "number"
            ? { monthlyYield: finiteNumber(item.monthlyYield) }
            : {}),
          ...(typeof item.nextPayment === "string"
            ? { nextPayment: item.nextPayment }
            : {}),
          ...(typeof item.transactionId === "string"
            ? { transactionId: item.transactionId }
            : {}),
          ...(typeof item.lastPrice === "number"
            ? { lastPrice: finiteNumber(item.lastPrice) }
            : {}),
          ...(typeof item.lastPriceAt === "string"
            ? { lastPriceAt: item.lastPriceAt }
            : {}),
          ...(typeof item.lastPriceError === "string"
            ? { lastPriceError: item.lastPriceError }
            : {}),
        }),
      )
    : [];
  const bankAccounts = Array.isArray(value.bankAccounts)
    ? value.bankAccounts.filter(isRecord).map(
        (item): BankAccount => ({
          id: typeof item.id === "string" ? item.id : newId(),
          bankName:
            typeof item.bankName === "string" && item.bankName.trim()
              ? item.bankName
              : "Conta",
          accountType: bankAccountType(item.accountType),
          ...(typeof item.nickname === "string"
            ? { nickname: item.nickname }
            : {}),
          balance: finiteNumber(item.balance),
          updatedAt:
            typeof item.updatedAt === "string"
              ? item.updatedAt
              : new Date().toISOString(),
          connectionMode:
            item.connectionMode === "open-finance-ready"
              ? "open-finance-ready"
              : "manual",
        }),
      )
    : [];
  const savingGoals = Array.isArray(value.savingGoals)
    ? value.savingGoals.filter(isRecord).map(
        (item): SavingGoal => ({
          id: typeof item.id === "string" ? item.id : newId(),
          name:
            typeof item.name === "string" && item.name.trim()
              ? item.name
              : "Minha meta",
          emoji:
            typeof item.emoji === "string" && item.emoji.trim()
              ? item.emoji
              : "🎯",
          targetAmount: finiteNumber(item.targetAmount),
          categoryTag:
            typeof item.categoryTag === "string" && item.categoryTag.trim()
              ? item.categoryTag
              : goalCategoryTag(
                  typeof item.name === "string" ? item.name : "Minha meta",
                ),
          createdAt:
            typeof item.createdAt === "string" ? item.createdAt : todayISO(),
        }),
      )
    : [];

  return {
    ...DEFAULT_STATE,
    ...value,
    transactions,
    investments,
    bankAccounts,
    savingGoals,
    incomeCategories: stringArray(
      value.incomeCategories,
      DEFAULT_INCOME_CATEGORIES,
    ),
    expenseCategories: stringArray(
      value.expenseCategories,
      DEFAULT_EXPENSE_CATEGORIES,
    ),
    goals: {
      monthly: finiteNumber(goals.monthly),
      reserve: finiteNumber(goals.reserve),
      passiveIncome: finiteNumber(goals.passiveIncome),
      investedPatrimony: finiteNumber(goals.investedPatrimony),
    },
    base: {
      startingBalance: finiteNumber(base.startingBalance),
      fixedIncome: finiteNumber(base.fixedIncome),
    },
    permissions: {
      notifications: permissionLevel(permissions.notifications),
      location: permissionLevel(permissions.location),
      files: permissionLevel(permissions.files),
    },
    investmentFocus: investmentFocus(value.investmentFocus),
    googleConnection: googleConnection(value.googleConnection),
    marketRefreshedAt:
      typeof value.marketRefreshedAt === "string"
        ? value.marketRefreshedAt
        : undefined,
  };
}

function signedBankBalance(account: BankAccount): number {
  if (account.accountType === "credit-card") {
    return -Math.abs(account.balance);
  }
  return account.balance;
}

function goalCategoryTag(name: string): string {
  return `Meta: ${name.trim()}`;
}

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<FinanceState>(DEFAULT_STATE);
  const [loaded, setLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(STORAGE_KEY)
      .then((raw) => {
        if (cancelled) return;
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            setState(hydrateFinanceState(parsed));
          } catch {
            // ignore corrupted state
          }
        }
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch(() => {});
  }, [state, loaded]);

  const addTransaction = useCallback(
    (tx: Omit<Transaction, "id">): Transaction => {
      const created: Transaction = { id: newId(), ...tx };
      setState((s) => ({
        ...s,
        transactions: [created, ...s.transactions],
      }));
      return created;
    },
    [],
  );

  const updateTransaction = useCallback(
    (id: string, changes: Partial<Omit<Transaction, "id">>) => {
      setState((s) => ({
        ...s,
        transactions: s.transactions.map((t) =>
          t.id === id ? { ...t, ...changes } : t,
        ),
      }));
    },
    [],
  );

  const deleteTransaction = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
      investments: s.investments.map((i) =>
        i.transactionId === id ? { ...i, transactionId: undefined } : i,
      ),
    }));
  }, []);

  const addInvestment = useCallback(
    (inv: Omit<Investment, "id" | "transactionId">): Investment => {
      const txId = newId();
      const investment: Investment = {
        id: newId(),
        transactionId: txId,
        ...inv,
        monthlyYield:
          inv.monthlyYield && inv.monthlyYield > 0
            ? inv.monthlyYield
            : ESTIMATED_MONTHLY_YIELD[inv.type],
      };
      const tx: Transaction = {
        id: txId,
        type: "expense",
        amount: inv.amount,
        category: "Investimentos",
        date: inv.date,
        note: `Aporte: ${inv.code}${inv.name ? ` — ${inv.name}` : ""}`,
      };
      setState((s) => {
        const expenseCategories = s.expenseCategories.includes("Investimentos")
          ? s.expenseCategories
          : [...s.expenseCategories, "Investimentos"];
        return {
          ...s,
          investments: [investment, ...s.investments],
          transactions: [tx, ...s.transactions],
          expenseCategories,
        };
      });
      return investment;
    },
    [],
  );

  const deleteInvestment = useCallback((id: string) => {
    setState((s) => {
      const inv = s.investments.find((i) => i.id === id);
      const txId = inv?.transactionId;
      return {
        ...s,
        investments: s.investments.filter((i) => i.id !== id),
        transactions: txId
          ? s.transactions.filter((t) => t.id !== txId)
          : s.transactions,
      };
    });
  }, []);

  const addBankAccount = useCallback(
    (
      account: Omit<BankAccount, "id" | "updatedAt" | "connectionMode"> &
        Partial<Pick<BankAccount, "updatedAt" | "connectionMode">>,
    ): BankAccount => {
      const created: BankAccount = {
        id: newId(),
        updatedAt: account.updatedAt ?? new Date().toISOString(),
        connectionMode: account.connectionMode ?? "manual",
        ...account,
      };
      setState((s) => ({
        ...s,
        bankAccounts: [created, ...s.bankAccounts],
      }));
      return created;
    },
    [],
  );

  const updateBankAccount = useCallback(
    (id: string, changes: Partial<Omit<BankAccount, "id">>) => {
      setState((s) => ({
        ...s,
        bankAccounts: s.bankAccounts.map((account) =>
          account.id === id
            ? {
                ...account,
                ...changes,
                updatedAt: changes.updatedAt ?? new Date().toISOString(),
              }
            : account,
        ),
      }));
    },
    [],
  );

  const deleteBankAccount = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      bankAccounts: s.bankAccounts.filter((account) => account.id !== id),
    }));
  }, []);

  const addSavingGoal = useCallback(
    (
      goal: Omit<SavingGoal, "id" | "categoryTag" | "createdAt">,
    ): SavingGoal => {
      const tag = goalCategoryTag(goal.name);
      const created: SavingGoal = {
        id: newId(),
        ...goal,
        categoryTag: tag,
        createdAt: todayISO(),
      };
      setState((s) => {
        const expenseCategories = s.expenseCategories.includes(tag)
          ? s.expenseCategories
          : [...s.expenseCategories, tag];
        return {
          ...s,
          savingGoals: [...s.savingGoals, created],
          expenseCategories,
        };
      });
      return created;
    },
    [],
  );

  const deleteSavingGoal = useCallback((id: string) => {
    setState((s) => {
      const goal = s.savingGoals.find((g) => g.id === id);
      const tag = goal?.categoryTag;
      return {
        ...s,
        savingGoals: s.savingGoals.filter((g) => g.id !== id),
        expenseCategories: tag
          ? s.expenseCategories.filter((c) => c !== tag)
          : s.expenseCategories,
      };
    });
  }, []);

  const addCategory = useCallback((type: TransactionType, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setState((s) => {
      if (type === "income") {
        if (s.incomeCategories.includes(trimmed)) return s;
        return { ...s, incomeCategories: [...s.incomeCategories, trimmed] };
      }
      if (s.expenseCategories.includes(trimmed)) return s;
      return { ...s, expenseCategories: [...s.expenseCategories, trimmed] };
    });
  }, []);

  const removeCategory = useCallback((type: TransactionType, name: string) => {
    setState((s) => ({
      ...s,
      incomeCategories:
        type === "income"
          ? s.incomeCategories.filter((c) => c !== name)
          : s.incomeCategories,
      expenseCategories:
        type === "expense"
          ? s.expenseCategories.filter((c) => c !== name)
          : s.expenseCategories,
    }));
  }, []);

  const setGoals = useCallback((g: Partial<Goals>) => {
    setState((s) => ({ ...s, goals: { ...s.goals, ...g } }));
  }, []);

  const setBase = useCallback((b: Partial<BaseSettings>) => {
    setState((s) => ({ ...s, base: { ...s.base, ...b } }));
  }, []);

  const setPermissions = useCallback((p: Partial<Permissions>) => {
    setState((s) => ({ ...s, permissions: { ...s.permissions, ...p } }));
  }, []);

  const setInvestmentFocus = useCallback((f: InvestmentFocus) => {
    setState((s) => ({ ...s, investmentFocus: f }));
  }, []);

  const setGoogleConnection = useCallback((connection?: GoogleConnection) => {
    setState((s) => ({ ...s, googleConnection: connection }));
  }, []);

  const refreshMarketPrices = useCallback(
    async (force = false) => {
      let updated = 0;
      let failed = 0;
      const targets: Investment[] = [];
      const stale = (iso?: string) => {
        if (!iso) return true;
        const ts = Date.parse(iso);
        if (Number.isNaN(ts)) return true;
        return Date.now() - ts > 12 * 60 * 60 * 1000;
      };
      setState((s) => {
        for (const inv of s.investments) {
          if (!PRICEABLE_TYPES.includes(inv.type)) continue;
          if (!inv.code) continue;
          if (force || stale(inv.lastPriceAt)) {
            targets.push(inv);
          }
        }
        return s;
      });
      if (targets.length === 0) {
        return { updated: 0, failed: 0 };
      }
      setRefreshing(true);
      try {
        const results = await Promise.all(
          targets.map(async (inv) => {
            try {
              const quote = await fetchQuote(inv.code);
              return {
                id: inv.id,
                price: quote.price,
                at: quote.regularMarketTime,
                error: undefined as string | undefined,
              };
            } catch (err) {
              const message =
                err instanceof Error ? err.message : "Erro desconhecido";
              return {
                id: inv.id,
                price: undefined as number | undefined,
                at: undefined as string | undefined,
                error: message,
              };
            }
          }),
        );
        for (const r of results) {
          if (r.price != null) updated += 1;
          else failed += 1;
        }
        const map = new Map(results.map((r) => [r.id, r]));
        setState((s) => ({
          ...s,
          investments: s.investments.map((inv) => {
            const r = map.get(inv.id);
            if (!r) return inv;
            if (r.price != null && r.at) {
              return {
                ...inv,
                lastPrice: r.price,
                lastPriceAt: r.at,
                lastPriceError: undefined,
              };
            }
            return { ...inv, lastPriceError: r.error };
          }),
          marketRefreshedAt: new Date().toISOString(),
        }));
      } finally {
        setRefreshing(false);
      }
      return { updated, failed };
    },
    [],
  );

  const metrics = useMemo(() => {
    const today = todayISO();
    const currentMonth = monthKey(today);
    let monthIncome = 0;
    let monthExpense = 0;
    let totalIncome = 0;
    let totalExpense = 0;
    const goalProgress: Record<string, number> = {};
    for (const t of state.transactions) {
      if (t.type === "income") totalIncome += t.amount;
      else totalExpense += t.amount;
      if (monthKey(t.date) === currentMonth) {
        if (t.type === "income") monthIncome += t.amount;
        else monthExpense += t.amount;
      }
      if (t.category.startsWith("Meta: ")) {
        goalProgress[t.category] =
          (goalProgress[t.category] ?? 0) + t.amount;
      }
    }
    const balance = state.base.startingBalance + totalIncome - totalExpense;
    const monthNet = monthIncome - monthExpense;
    const investedTotal = state.investments.reduce(
      (acc, i) => acc + i.amount,
      0,
    );
    const estimatedPassiveIncome = state.investments.reduce(
      (acc, i) => acc + i.amount * ((i.monthlyYield ?? 0) / 100),
      0,
    );
    const marketTotal = state.investments.reduce((acc, i) => {
      if (i.lastPrice != null && i.quantity != null && i.quantity > 0) {
        return acc + i.lastPrice * i.quantity;
      }
      return acc + i.amount;
    }, 0);
    const marketProfit = marketTotal - investedTotal;
    const bankPositiveBalance = state.bankAccounts.reduce((acc, account) => {
      if (account.accountType === "credit-card") return acc;
      return acc + account.balance;
    }, 0);
    const creditCardOpenBalance = state.bankAccounts.reduce((acc, account) => {
      if (account.accountType !== "credit-card") return acc;
      return acc + Math.abs(account.balance);
    }, 0);
    const bankBalance = state.bankAccounts.reduce(
      (acc, account) => acc + signedBankBalance(account),
      0,
    );
    const staleLimit = 7 * 24 * 60 * 60 * 1000;
    const staleBankAccounts = state.bankAccounts.filter((account) => {
      const ts = Date.parse(account.updatedAt);
      if (Number.isNaN(ts)) return true;
      return Date.now() - ts > staleLimit;
    }).length;
    return {
      balance,
      monthIncome,
      monthExpense,
      monthNet,
      estimatedPassiveIncome,
      investedTotal,
      marketTotal,
      marketProfit,
      bankBalance,
      bankPositiveBalance,
      creditCardOpenBalance,
      staleBankAccounts,
      goalProgress,
    };
  }, [
    state.transactions,
    state.investments,
    state.base.startingBalance,
    state.bankAccounts,
  ]);

  const value: FinanceContextValue = {
    ...state,
    loaded,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInvestment,
    deleteInvestment,
    addBankAccount,
    updateBankAccount,
    deleteBankAccount,
    addSavingGoal,
    deleteSavingGoal,
    addCategory,
    removeCategory,
    setGoals,
    setBase,
    setPermissions,
    setInvestmentFocus,
    setGoogleConnection,
    refreshMarketPrices,
    refreshing,
    metrics,
  };

  return (
    <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
  );
}

export function useFinance(): FinanceContextValue {
  const ctx = useContext(FinanceContext);
  if (!ctx) throw new Error("useFinance must be used inside FinanceProvider");
  return ctx;
}
