import * as Notifications from 'expo-notifications';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState } from 'react-native';
import {
  cancelAllReminders, computeRelevance, defaultPrefs, getNotificationPermissions, loadNotificationPrefs,
  NotificationPrefs, notificationsSupported, PermissionInfo, relevanceKey, ReminderType, requestNotificationPermissions,
  rescheduleAllReminders, resetNotificationState, reminderTypeFromData, saveNotificationPrefs, sendTestNotification,
} from './notificationService';
import { AppData } from './types';

type Options = {
  data: AppData;
  /** Verdadeiro quando os dados da app já foram carregados do armazenamento. */
  ready: boolean;
  /** Chamado quando o utilizador toca numa notificação (app aberta, em segundo plano ou encerrada). */
  onOpen: (type: ReminderType) => void;
};

const INITIAL_PERMISSION: PermissionInfo = { status: 'undetermined', granted: false, canAskAgain: true };

export function useNotifications({ data, ready, onOpen }: Options) {
  const [prefs, setPrefsState] = useState<NotificationPrefs>(defaultPrefs);
  const [loaded, setLoaded] = useState(false);
  const [permission, setPermission] = useState<PermissionInfo>(INITIAL_PERMISSION);
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;
  const lastHandled = useRef<string | null>(null);

  // Carrega as preferências guardadas e o estado da permissão.
  useEffect(() => {
    let alive = true;
    (async () => {
      const [stored, perm] = await Promise.all([loadNotificationPrefs(), getNotificationPermissions()]);
      if (!alive) return;
      setPrefsState(stored);
      setPermission(perm);
      setLoaded(true);
    })();
    return () => { alive = false; };
  }, []);

  // O utilizador pode mudar a permissão nas definições do Android: relê o estado ao voltar à app.
  useEffect(() => {
    if (!notificationsSupported) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') getNotificationPermissions().then(setPermission).catch(() => undefined);
    });
    return () => sub.remove();
  }, []);

  const relevance = useMemo(() => computeRelevance(data), [data.goals, data.budgets, data.educationDone]);
  const relevanceId = relevanceKey(relevance);
  const prefsId = JSON.stringify(prefs);
  const active = ready && loaded && data.onboarded;

  // Mantém os agendamentos alinhados com preferências, permissão e funcionalidades em uso.
  useEffect(() => {
    if (!ready || !loaded) return;
    const task = active ? rescheduleAllReminders(prefs, relevance) : cancelAllReminders();
    task.catch(error => console.warn('[LOTUS] Não foi possível atualizar os lembretes.', error));
  }, [ready, loaded, active, prefsId, relevanceId, permission.granted]);

  // Toque numa notificação: cobre app aberta, em segundo plano e encerrada (arranque a frio).
  useEffect(() => {
    if (!notificationsSupported || !active) return;
    const handle = (response: Notifications.NotificationResponse | null) => {
      if (!response || response.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
      const type = reminderTypeFromData(response.notification.request.content.data);
      const key = `${response.notification.request.identifier}:${response.notification.date}`;
      if (!type || lastHandled.current === key) return;
      lastHandled.current = key;
      onOpenRef.current(type);
      Notifications.clearLastNotificationResponseAsync().catch(() => undefined);
    };
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    Notifications.getLastNotificationResponseAsync().then(handle).catch(() => undefined);
    return () => sub.remove();
  }, [active]);

  const setPrefs = useCallback((next: NotificationPrefs) => {
    setPrefsState(next);
    saveNotificationPrefs(next).catch(error => console.warn('[LOTUS] Não foi possível guardar as preferências.', error));
  }, []);

  const requestPermission = useCallback(async () => {
    const result = await requestNotificationPermissions();
    setPermission(result);
    return result;
  }, []);

  const sendTest = useCallback(async (type: ReminderType = 'expenses') => {
    const ok = await sendTestNotification(type);
    setPermission(await getNotificationPermissions());
    return ok;
  }, []);

  const reset = useCallback(async () => {
    await resetNotificationState();
    setPrefsState(defaultPrefs());
  }, []);

  return { prefs, setPrefs, permission, requestPermission, sendTest, reset, relevance };
}
