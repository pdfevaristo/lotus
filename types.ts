export type Transaction = { id: string; type: 'income' | 'expense'; description: string; amount: number; category: string; date: string };
export type Goal = { id: string; name: string; target: number; saved: number };
export type Budget = { category: string; limit: number };
export type EducationResult = { attempts: number; firstTry?: boolean; best?: number; max?: number };
export type AppData = {
  onboarded: boolean;
  name: string;
  initialBalance: number;
  currency: string;
  theme: 'light' | 'dark';
  transactions: Transaction[];
  goals: Goal[];
  budgets: Budget[];
  /** Ids dos tópicos (ex.: 'm1-t1') e das missões (ex.: 'm1-mission') concluídos. */
  educationDone: string[];
  /** Resultados dos mini-desafios e das missões, por id. */
  educationResults: Record<string, EducationResult>;
};
