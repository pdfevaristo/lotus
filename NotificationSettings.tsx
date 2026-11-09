import React from 'react';
import { Alert, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import {
  NotificationPrefs, PermissionInfo, REMINDER_DEFS, REMINDER_TYPES, Relevance, ReminderConfig, ReminderType, WEEKDAY_OPTIONS,
} from './notificationService';

const BLUE = '#062d62';
const GREEN = '#168567';
const RED = '#c65353';

type Colors = { bg: string; card: string; text: string; muted: string; border: string };

type Props = {
  visible: boolean;
  colors: Colors;
  prefs: NotificationPrefs;
  relevance: Relevance;
  permission: PermissionInfo;
  onChange: (next: NotificationPrefs) => void;
  onRequestPermission: () => Promise<PermissionInfo>;
  onTest: (type: ReminderType) => Promise<boolean>;
  onClose: () => void;
};

const pad = (n: number) => String(n).padStart(2, '0');

export function NotificationSettings({ visible, colors, prefs, relevance, permission, onChange, onRequestPermission, onTest, onClose }: Props) {
  const patch = (type: ReminderType, change: Partial<ReminderConfig>) => onChange({ ...prefs, [type]: { ...prefs[type], ...change } });

  async function toggle(type: ReminderType, enabled: boolean) {
    patch(type, { enabled });
    // Pede autorização no momento em que o utilizador ativa o primeiro lembrete.
    if (enabled && permission.status !== 'unsupported' && !permission.granted) await onRequestPermission();
  }

  function toggleDay(type: ReminderType, day: number) {
    const cfg = prefs[type];
    if (REMINDER_DEFS[type].schedule === 'weekly-single') return patch(type, { days: [day] });
    const days = cfg.days.includes(day) ? cfg.days.filter(d => d !== day) : [...cfg.days, day].sort((a, b) => a - b);
    if (days.length) patch(type, { days }); // pelo menos um dia tem de ficar selecionado
  }

  async function test(type: ReminderType) {
    try {
      const ok = await onTest(type);
      if (ok) Alert.alert('Teste agendado', 'Vais receber a notificação dentro de alguns segundos. Minimiza a app para a veres na barra de notificações.');
      else Alert.alert('Notificações não autorizadas', permission.status === 'unsupported'
        ? 'As notificações só funcionam na app instalada no telemóvel.'
        : 'Autoriza as notificações para poderes receber o teste.');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar a notificação de teste.');
    }
  }

  const perm = (() => {
    if (permission.status === 'unsupported') return { title: 'Indisponível neste dispositivo', text: 'As notificações funcionam na app Android ou iOS, não na versão web.', color: colors.muted, action: null as null | { label: string; run: () => void } };
    if (permission.granted) return { title: 'Notificações autorizadas', text: 'A LOTUS pode enviar os lembretes que ativares, mesmo com a app fechada.', color: GREEN, action: null };
    if (permission.status === 'denied' && !permission.canAskAgain) return { title: 'Notificações bloqueadas', text: 'Ativa as notificações da LOTUS nas definições do sistema para receberes lembretes.', color: RED, action: { label: 'Abrir definições', run: () => { Linking.openSettings().catch(() => undefined); } } };
    return { title: 'Notificações por autorizar', text: 'Autoriza as notificações para receberes os lembretes na barra do telemóvel.', color: RED, action: { label: 'Autorizar notificações', run: () => { onRequestPermission().catch(() => undefined); } } };
  })();

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={[st.flex, { backgroundColor: colors.bg }]}>
        <View style={st.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12} style={st.headerBtn}>
            <Text style={[st.headerIcon, { color: colors.text }]}>×</Text>
          </Pressable>
          <Text style={[st.headerTitle, { color: colors.text }]} numberOfLines={1}>Notificações e lembretes</Text>
          <View style={st.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[st.eyebrow, { color: perm.color }]}>AUTORIZAÇÃO</Text>
            <Text style={[st.cardTitle, { color: colors.text }]}>{perm.title}</Text>
            <Text style={[st.small, { color: colors.muted }]}>{perm.text}</Text>
            {perm.action && <Pressable style={st.primary} onPress={perm.action.run}><Text style={st.primaryText}>{perm.action.label}</Text></Pressable>}
          </View>

          <Text style={[st.note, { color: colors.muted }]}>
            Os lembretes funcionam sem Internet e as mensagens são sempre genéricas: nunca mostram valores do teu dinheiro no ecrã bloqueado.
          </Text>

          {REMINDER_TYPES.map(type => {
            const def = REMINDER_DEFS[type];
            const cfg = prefs[type];
            return (
              <View key={type} style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={st.row}>
                  <Text style={[st.cardTitle, st.flex, { color: colors.text }]}>{def.title}</Text>
                  <Switch
                    accessibilityLabel={`Ativar lembrete: ${def.title}`}
                    value={cfg.enabled}
                    onValueChange={value => { toggle(type, value).catch(() => undefined); }}
                    trackColor={{ false: colors.border, true: GREEN }}
                    thumbColor="#ffffff"
                  />
                </View>
                <Text style={[st.message, { color: colors.text }]}>“{def.message}”</Text>
                <Text style={[st.small, { color: colors.muted }]}>{def.description}</Text>
                {cfg.enabled && def.conditionHint && !relevance[type] && (
                  <Text style={[st.small, { color: colors.muted }]}>De momento não será enviado. {def.conditionHint}</Text>
                )}
                {cfg.enabled && (
                  <>
                    <View style={st.timeRow}>
                      <Text style={[st.label, { color: colors.text }]}>Hora</Text>
                      <Stepper label="horas" value={pad(cfg.hour)} colors={colors} onDec={() => patch(type, { hour: (cfg.hour + 23) % 24 })} onInc={() => patch(type, { hour: (cfg.hour + 1) % 24 })} />
                      <Text style={[st.colon, { color: colors.text }]}>:</Text>
                      <Stepper label="minutos" value={pad(cfg.minute)} colors={colors} onDec={() => patch(type, { minute: (cfg.minute + 55) % 60 })} onInc={() => patch(type, { minute: (cfg.minute + 5) % 60 })} />
                    </View>
                    {def.schedule !== 'daily' && (
                      <>
                        <Text style={[st.label, { color: colors.text }]}>{def.schedule === 'weekly-single' ? 'Dia da semana' : 'Dias da semana'}</Text>
                        <View style={st.chips}>
                          {WEEKDAY_OPTIONS.map(day => {
                            const active = cfg.days.includes(day.value);
                            return (
                              <Pressable key={day.value} accessibilityRole="button" accessibilityState={{ selected: active }} onPress={() => toggleDay(type, day.value)}
                                style={[st.chip, { backgroundColor: active ? BLUE : colors.card, borderColor: active ? BLUE : colors.border }]}>
                                <Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600', fontSize: 12 }}>{day.label}</Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </>
                    )}
                  </>
                )}
                <Pressable onPress={() => { test(type).catch(() => undefined); }} hitSlop={8}><Text style={st.link}>Testar este lembrete</Text></Pressable>
              </View>
            );
          })}

          <Pressable style={st.primary} onPress={() => { test('expenses').catch(() => undefined); }}>
            <Text style={st.primaryText}>Enviar notificação de teste</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function Stepper({ label, value, colors, onDec, onInc }: { label: string; value: string; colors: Colors; onDec: () => void; onInc: () => void }) {
  return (
    <View style={[st.stepper, { borderColor: colors.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Diminuir ${label}`} onPress={onDec} hitSlop={8} style={st.stepBtn}><Text style={[st.stepIcon, { color: colors.text }]}>‹</Text></Pressable>
      <Text style={[st.stepValue, { color: colors.text }]}>{value}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel={`Aumentar ${label}`} onPress={onInc} hitSlop={8} style={st.stepBtn}><Text style={[st.stepIcon, { color: colors.text }]}>›</Text></Pressable>
    </View>
  );
}

const st = StyleSheet.create({
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 6 },
  headerBtn: { width: 36, alignItems: 'center' },
  headerIcon: { fontSize: 32, lineHeight: 34 },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  content: { padding: 20, paddingTop: 10, paddingBottom: 60 },
  card: { borderRadius: 18, borderWidth: 1, padding: 17, marginBottom: 10, gap: 8 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  message: { fontSize: 14, fontStyle: 'italic', lineHeight: 20 },
  small: { fontSize: 12, lineHeight: 18 },
  note: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: '700' },
  link: { color: GREEN, fontWeight: '700', fontSize: 13, marginTop: 2 },
  primary: { backgroundColor: BLUE, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  colon: { fontSize: 18, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 12 },
  stepBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  stepIcon: { fontSize: 22, fontWeight: '700' },
  stepValue: { minWidth: 28, textAlign: 'center', fontSize: 16, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 13, paddingVertical: 8 },
});
