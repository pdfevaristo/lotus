/**
 * Serviço de lembretes e notificações locais da LOTUS.
 *
 * - 100% offline: usa apenas `expo-notifications` (agendamento local) e AsyncStorage.
 * - Sem backend, sem Firebase e sem push remoto.
 * - A lógica está separada da interface (ver `NotificationSettings.tsx` e `useNotifications.ts`).
 * - Todas as operações que alteram agendamentos passam por uma fila (`enqueue`), para que
 *   duas chamadas concorrentes nunca criem notificações duplicadas.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { moduleStatus, modules } from './education';
import { AppData } from './types';

/* ------------------------------------------------------------------ */
/* Tipos e definição dos seis lembretes                                */
/* ------------------------------------------------------------------ */

export type ReminderType = 'expenses' | 'savings' | 'education' | 'challenge' | 'budget' | 'weekly';
/** Ordem de apresentação (a mesma do ponto 7 da especificação). */
export const REMINDER_TYPES: ReminderType[] = ['expenses', 'savings', 'education', 'challenge', 'budget', 'weekly'];

/** daily = todos os dias · weekly-multi = vários dias da semana · weekly-single = um dia por semana */
export type ScheduleKind = 'daily' | 'weekly-multi' | 'weekly-single';

type ReminderDef = {
  /** Título da notificação (o conteúdo é sempre a mensagem genérica definida na especificação). */
  title: string;
  /** Mensagem EXATA da especificação (ponto 7). Não contém valores financeiros pessoais. */
  message: string;
  description: string;
  /** Nota apresentada quando o lembrete depende de uma funcionalidade que o utilizador ainda não usa. */
  conditionHint?: string;
  actionLabel: string;
  schedule: ScheduleKind;
  channelId: string;
};

export const REMINDER_DEFS: Record<ReminderType, ReminderDef> = {
  expenses: {
    title: 'Registo de despesas',
    message: 'Já registaste os teus gastos de hoje?',
    description: 'Todos os dias, à hora que escolheres.',
    actionLabel: 'Registar',
    schedule: 'daily',
    channelId: 'lotus-despesas',
  },
  savings: {
    title: 'Poupança',
    message: 'Não te esqueças da tua meta de poupança!',
    description: 'Uma vez por semana, enquanto tiveres uma meta por concluir.',
    conditionHint: 'Só é enviado se existir uma meta de poupança por concluir.',
    actionLabel: 'Ver metas',
    schedule: 'weekly-single',
    channelId: 'lotus-poupanca',
  },
  education: {
    title: 'Educação financeira',
    message: 'Que tal aprenderes uma dica financeira hoje?',
    description: 'Nos dias que escolheres (poucos, para não haver excesso).',
    actionLabel: 'Aprender',
    schedule: 'weekly-multi',
    channelId: 'lotus-educacao',
  },
  challenge: {
    title: 'Desafio',
    message: 'Tens um desafio à tua espera!',
    description: 'Uma vez por semana, enquanto tiveres uma missão final disponível.',
    conditionHint: 'Só é enviado se existir uma missão final desbloqueada e por concluir.',
    actionLabel: 'Ver desafio',
    schedule: 'weekly-single',
    channelId: 'lotus-desafio',
  },
  budget: {
    title: 'Orçamento',
    message: 'Já deste uma vista de olhos ao teu orçamento?',
    description: 'Uma vez por semana, enquanto tiveres limites de orçamento definidos.',
    conditionHint: 'Só é enviado se existir pelo menos um limite de orçamento.',
    actionLabel: 'Ver orçamento',
    schedule: 'weekly-single',
    channelId: 'lotus-orcamento',
  },
  weekly: {
    title: 'Resumo semanal',
    message: 'Está na hora de rever a tua semana financeira!',
    description: 'Uma vez por semana, no dia e à hora que escolheres.',
    actionLabel: 'Ver resumo',
    schedule: 'weekly-single',
    channelId: 'lotus-resumo',
  },
};

/** Dias da semana. `value` segue o `expo-notifications`: 1 = domingo … 7 = sábado. */
export const WEEKDAY_OPTIONS = [
  { value: 2, label: 'Seg' }, { value: 3, label: 'Ter' }, { value: 4, label: 'Qua' },
  { value: 5, label: 'Qui' }, { value: 6, label: 'Sex' }, { value: 7, label: 'Sáb' }, { value: 1, label: 'Dom' },
];

/* ------------------------------------------------------------------ */
/* Preferências (persistidas localmente)                               */
/* ------------------------------------------------------------------ */

export type ReminderConfig = { enabled: boolean; hour: number; minute: number; days: number[] };
export type NotificationPrefs = Record<ReminderType, ReminderConfig>;

const DEFAULT_CONFIG: NotificationPrefs = {
  expenses: { enabled: true, hour: 20, minute: 0, days: [] },
  savings: { enabled: true, hour: 18, minute: 0, days: [6] },       // sexta
  education: { enabled: true, hour: 19, minute: 0, days: [3, 7] },  // terça e sábado
  challenge: { enabled: true, hour: 17, minute: 0, days: [4] },     // quarta
  budget: { enabled: true, hour: 9, minute: 0, days: [2] },         // segunda
  weekly: { enabled: true, hour: 18, minute: 0, days: [1] },        // domingo
};

export const defaultPrefs = (): NotificationPrefs => {
  const out = {} as NotificationPrefs;
  for (const t of REMINDER_TYPES) out[t] = { ...DEFAULT_CONFIG[t], days: [...DEFAULT_CONFIG[t].days] };
  return out;
};

const PREFS_KEY = 'lotus_notifications_v1';
/** Identificadores dos agendamentos ativos, por tipo (para os conseguir cancelar com segurança). */
const IDS_KEY = 'lotus_notification_ids_v1';

const clampInt = (value: unknown, min: number, max: number, fallback: number) => {
  const n = typeof value === 'number' && Number.isFinite(value) ? Math.round(value) : fallback;
  return Math.min(max, Math.max(min, n));
};

/** Aceita dados incompletos/antigos do armazenamento e devolve sempre preferências válidas. */
function normalizePrefs(raw: unknown): NotificationPrefs {
  const base = defaultPrefs();
  if (!raw || typeof raw !== 'object') return base;
  const source = raw as Partial<Record<ReminderType, Partial<ReminderConfig>>>;
  for (const t of REMINDER_TYPES) {
    const item = source[t];
    if (!item || typeof item !== 'object') continue;
    const kind = REMINDER_DEFS[t].schedule;
    let days = Array.isArray(item.days)
      ? Array.from(new Set(item.days.filter((d): d is number => Number.isInteger(d) && d >= 1 && d <= 7))).sort((a, b) => a - b)
      : base[t].days;
    if (kind === 'daily') days = [];
    else if (!days.length) days = base[t].days;
    else if (kind === 'weekly-single') days = [days[0]];
    base[t] = {
      enabled: typeof item.enabled === 'boolean' ? item.enabled : base[t].enabled,
      hour: clampInt(item.hour, 0, 23, base[t].hour),
      minute: clampInt(item.minute, 0, 59, base[t].minute),
      days,
    };
  }
  return base;
}

export async function loadNotificationPrefs(): Promise<NotificationPrefs> {
  try {
    const value = await AsyncStorage.getItem(PREFS_KEY);
    return value ? normalizePrefs(JSON.parse(value)) : defaultPrefs();
  } catch {
    return defaultPrefs();
  }
}

export async function saveNotificationPrefs(prefs: NotificationPrefs) {
  await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(normalizePrefs(prefs)));
}

type ScheduledIds = Partial<Record<ReminderType, string[]>>;

async function loadScheduledIds(): Promise<ScheduledIds> {
  try {
    const value = await AsyncStorage.getItem(IDS_KEY);
    return value ? (JSON.parse(value) as ScheduledIds) : {};
  } catch {
    return {};
  }
}

async function saveScheduledIds(ids: ScheduledIds) {
  await AsyncStorage.setItem(IDS_KEY, JSON.stringify(ids));
}

/* ------------------------------------------------------------------ */
/* Relevância (só lembrar o que o utilizador realmente usa)            */
/* ------------------------------------------------------------------ */

export type Relevance = Record<ReminderType, boolean>;

/** Índice do primeiro módulo cuja missão final está desbloqueada e ainda não foi concluída. */
export function firstAvailableChallenge(data: AppData): number | null {
  const index = modules.findIndex(m => {
    const st = moduleStatus(m, data);
    return st.missionUnlocked && !st.missionDone;
  });
  return index >= 0 ? index : null;
}

export function computeRelevance(data: AppData): Relevance {
  return {
    expenses: true,
    savings: data.goals.some(g => g.saved < g.target),
    education: true,
    challenge: firstAvailableChallenge(data) !== null,
    budget: data.budgets.length > 0,
    weekly: true,
  };
}

export const relevanceKey = (r: Relevance) => REMINDER_TYPES.map(t => (r[t] ? '1' : '0')).join('');

/**
 * Lembretes internos: aparecem dentro da app (ecrã inicial) sem interromper a navegação.
 * Máximo de 2 de cada vez, rodando por dia para não repetir sempre os mesmos.
 */
export function pendingInternalReminders(data: AppData, prefs: NotificationPrefs, now = new Date()): ReminderType[] {
  const rel = computeRelevance(data);
  const today = now.toDateString();
  const candidates: ReminderType[] = [];
  const loggedToday = data.transactions.some(t => t.type === 'expense' && new Date(t.date).toDateString() === today);
  if (prefs.expenses.enabled && !loggedToday) candidates.push('expenses');
  if (prefs.challenge.enabled && rel.challenge) candidates.push('challenge');
  if (prefs.savings.enabled && rel.savings) candidates.push('savings');
  if (prefs.budget.enabled && rel.budget) candidates.push('budget');
  if (!candidates.length) return [];
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const start = dayOfYear % candidates.length;
  return [...candidates.slice(start), ...candidates.slice(0, start)].slice(0, 2);
}

/** Lê o tipo de lembrete guardado nos dados de uma notificação (usado ao tocar nela). */
export function reminderTypeFromData(data: unknown): ReminderType | null {
  const type = (data as { type?: unknown } | null | undefined)?.type;
  return typeof type === 'string' && (REMINDER_TYPES as string[]).includes(type) ? (type as ReminderType) : null;
}

/* ------------------------------------------------------------------ */
/* Suporte, handler e canais                                           */
/* ------------------------------------------------------------------ */

/** Agendamento local só existe nas apps nativas (não na versão web). */
export const notificationsSupported = Platform.OS === 'android' || Platform.OS === 'ios';

const BRAND_BLUE = '#062d62';
const BRAND_GREEN = '#168567';

/** Notificações recebidas com a app aberta aparecem como banner (e ficam na lista). */
export function configureNotificationHandler() {
  if (!notificationsSupported) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}
configureNotificationHandler();

/** Cria os canais Android (um por tipo, para o utilizador os poder gerir nas definições do sistema). */
export async function ensureNotificationChannels() {
  if (Platform.OS !== 'android') return;
  await Promise.all(REMINDER_TYPES.map(t => Notifications.setNotificationChannelAsync(REMINDER_DEFS[t].channelId, {
    name: REMINDER_DEFS[t].title,
    description: REMINDER_DEFS[t].description,
    importance: Notifications.AndroidImportance.DEFAULT,
    // As mensagens são genéricas e nunca incluem valores financeiros: podem aparecer no ecrã bloqueado.
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    vibrationPattern: [0, 200, 150, 200],
    lightColor: BRAND_GREEN,
    showBadge: false,
  })));
}

/* ------------------------------------------------------------------ */
/* Permissões                                                          */
/* ------------------------------------------------------------------ */

export type PermissionInfo = {
  status: 'granted' | 'denied' | 'undetermined' | 'unsupported';
  granted: boolean;
  canAskAgain: boolean;
};

const UNSUPPORTED: PermissionInfo = { status: 'unsupported', granted: false, canAskAgain: false };

export async function getNotificationPermissions(): Promise<PermissionInfo> {
  if (!notificationsSupported) return UNSUPPORTED;
  try {
    const p = await Notifications.getPermissionsAsync();
    const status = p.granted ? 'granted' : String(p.status) === 'undetermined' ? 'undetermined' : 'denied';
    return { status, granted: p.granted, canAskAgain: p.canAskAgain };
  } catch {
    return UNSUPPORTED;
  }
}

/**
 * Pede autorização ao utilizador (se ainda for possível). No Android 13+ o canal tem de existir
 * antes do pedido, caso contrário o diálogo do sistema não aparece.
 */
export async function requestNotificationPermissions(): Promise<PermissionInfo> {
  if (!notificationsSupported) return UNSUPPORTED;
  try { await ensureNotificationChannels(); } catch { /* continua: o pedido ainda pode funcionar */ }
  const current = await getNotificationPermissions();
  if (current.granted || !current.canAskAgain) return current;
  try { await Notifications.requestPermissionsAsync(); } catch { /* o estado é relido abaixo */ }
  return getNotificationPermissions();
}

/* ------------------------------------------------------------------ */
/* Agendamento                                                         */
/* ------------------------------------------------------------------ */

const ID_PREFIX = 'lotus.';
const typePrefix = (type: ReminderType) => `${ID_PREFIX}${type}.`;
const identifierFor = (type: ReminderType, weekday?: number) => `${typePrefix(type)}${weekday ?? 'daily'}`;

/** Fila: garante que só uma operação de agendamento corre de cada vez (evita duplicados). */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task, task);
  queue = run.catch(() => undefined);
  return run;
}

function contentFor(type: ReminderType): Notifications.NotificationContentInput {
  const def = REMINDER_DEFS[type];
  // Apenas a mensagem genérica da especificação: nunca valores financeiros pessoais.
  return { title: def.title, body: def.message, data: { type }, sound: 'default', color: BRAND_BLUE };
}

async function scheduleDailyInternal(type: ReminderType, cfg: ReminderConfig): Promise<string[]> {
  const id = await Notifications.scheduleNotificationAsync({
    identifier: identifierFor(type),
    content: contentFor(type),
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour: cfg.hour, minute: cfg.minute, channelId: REMINDER_DEFS[type].channelId },
  });
  return [id];
}

async function scheduleWeeklyInternal(type: ReminderType, cfg: ReminderConfig): Promise<string[]> {
  const ids: string[] = [];
  for (const weekday of cfg.days) {
    ids.push(await Notifications.scheduleNotificationAsync({
      identifier: identifierFor(type, weekday),
      content: contentFor(type),
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday, hour: cfg.hour, minute: cfg.minute, channelId: REMINDER_DEFS[type].channelId },
    }));
  }
  return ids;
}

const scheduleTypeInternal = (type: ReminderType, cfg: ReminderConfig) =>
  REMINDER_DEFS[type].schedule === 'daily' ? scheduleDailyInternal(type, cfg) : scheduleWeeklyInternal(type, cfg);

/** Cancela tudo o que a LOTUS agendou: os ids guardados e quaisquer órfãos com o prefixo `lotus.`. */
async function cancelWhere(match: (identifier: string) => boolean, stored: string[] = []) {
  const live = await Notifications.getAllScheduledNotificationsAsync();
  const ids = new Set<string>(stored.filter(match));
  for (const request of live) if (match(request.identifier)) ids.add(request.identifier);
  await Promise.all([...ids].map(id => Notifications.cancelScheduledNotificationAsync(id).catch(() => undefined)));
}

/** Agenda um lembrete diário (substitui o anterior do mesmo tipo). */
export function scheduleDailyReminder(type: ReminderType, cfg: ReminderConfig): Promise<string[]> {
  return enqueue(async () => {
    if (!notificationsSupported) return [];
    await ensureNotificationChannels();
    const ids = await loadScheduledIds();
    await cancelWhere(id => id.startsWith(typePrefix(type)), ids[type]);
    const created = await scheduleDailyInternal(type, cfg);
    await saveScheduledIds({ ...ids, [type]: created });
    return created;
  });
}

/** Agenda um lembrete semanal, um agendamento por dia selecionado (substitui o anterior do mesmo tipo). */
export function scheduleWeeklyReminder(type: ReminderType, cfg: ReminderConfig): Promise<string[]> {
  return enqueue(async () => {
    if (!notificationsSupported) return [];
    await ensureNotificationChannels();
    const ids = await loadScheduledIds();
    await cancelWhere(id => id.startsWith(typePrefix(type)), ids[type]);
    const created = await scheduleWeeklyInternal(type, cfg);
    await saveScheduledIds({ ...ids, [type]: created });
    return created;
  });
}

export function cancelReminder(type: ReminderType): Promise<void> {
  return enqueue(async () => {
    if (!notificationsSupported) return;
    const ids = await loadScheduledIds();
    await cancelWhere(id => id.startsWith(typePrefix(type)), ids[type]);
    await saveScheduledIds({ ...ids, [type]: [] });
  });
}

export function cancelAllReminders(): Promise<void> {
  return enqueue(async () => {
    if (!notificationsSupported) return;
    const ids = await loadScheduledIds();
    await cancelWhere(id => id.startsWith(ID_PREFIX), Object.values(ids).flat() as string[]);
    await saveScheduledIds({});
  });
}

/**
 * Faz o agendamento corresponder ao estado atual: cancela tudo e volta a agendar apenas o que está
 * ativado, é relevante e tem permissão. É idempotente (chamá-la várias vezes não cria duplicados).
 */
export function rescheduleAllReminders(prefs: NotificationPrefs, relevance: Relevance): Promise<ScheduledIds> {
  return enqueue(async () => {
    if (!notificationsSupported) return {};
    const permission = await getNotificationPermissions();
    const previous = await loadScheduledIds();
    await cancelWhere(id => id.startsWith(ID_PREFIX), Object.values(previous).flat() as string[]);
    const scheduled: ScheduledIds = {};
    if (permission.granted) {
      await ensureNotificationChannels();
      for (const type of REMINDER_TYPES) {
        if (prefs[type].enabled && relevance[type]) scheduled[type] = await scheduleTypeInternal(type, prefs[type]);
      }
    }
    await saveScheduledIds(scheduled);
    return scheduled;
  });
}

/** Apaga preferências e agendamentos (usado quando o utilizador elimina os dados locais). */
export async function resetNotificationState() {
  try { await cancelAllReminders(); } catch { /* ignora */ }
  await AsyncStorage.multiRemove([PREFS_KEY, IDS_KEY]).catch(() => undefined);
}

/**
 * Envia uma notificação de teste dentro de poucos segundos (com a mensagem real do tipo escolhido),
 * para dar tempo de minimizar a app e ver a notificação na barra do Android.
 * Devolve `false` se o utilizador não autorizou as notificações.
 */
export async function sendTestNotification(type: ReminderType = 'expenses'): Promise<boolean> {
  if (!notificationsSupported) return false;
  const permission = await requestNotificationPermissions();
  if (!permission.granted) return false;
  await ensureNotificationChannels();
  const content = contentFor(type);
  await Notifications.scheduleNotificationAsync({
    // O prefixo "lotus-teste" é diferente de "lotus." para o reagendamento não cancelar o teste.
    identifier: `lotus-teste-${Date.now()}`,
    content: { ...content, title: `${content.title} (teste)` },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: 3, channelId: REMINDER_DEFS[type].channelId },
  });
  return true;
}
