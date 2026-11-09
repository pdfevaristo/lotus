import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, KeyboardAvoidingView, Modal, Platform, Pressable,
  SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { Education } from './Education';
import { NotificationSettings } from './NotificationSettings';
import { educationSummary, TOTAL_MISSIONS, TOTAL_TOPICS } from './education';
import { balance, money, monthTotal } from './finance';
import { firstAvailableChallenge, pendingInternalReminders, REMINDER_DEFS, REMINDER_TYPES, ReminderType } from './notificationService';
import { clearData, emptyData, loadData, saveData } from './storage';
import { AppData, Goal, Transaction } from './types';
import { useNotifications } from './useNotifications';

const BLUE = '#062d62';
const GOLD = '#eebd55';
const GREEN = '#168567';
const RED = '#c65353';
const expenseCategories = ['Alimentação', 'Transporte', 'Educação', 'Alojamento', 'Saúde', 'Comunicação', 'Lazer', 'Compras', 'Outros'];
const incomeCategories = ['Bolsa de estudo', 'Salário', 'Apoio familiar', 'Trabalho freelance', 'Negócio', 'Outras receitas'];
type Tab = 'Início' | 'Movimentos' | 'Orçamento' | 'Metas' | 'Perfil';

export default function App() {
  const [data, setData] = useState<AppData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('Início');
  const [modal, setModal] = useState<'tx' | 'goal' | 'budget' | 'learn' | 'notif' | null>(null);
  const [learnModule, setLearnModule] = useState<number | null>(null);
  const [editTx, setEditTx] = useState<Transaction | null>(null);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Alimentação');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'income' | 'expense'>('all');
  const dark = data.theme === 'dark';
  const C = dark ? { bg: '#0d1725', card: '#17263a', text: '#f6f8fb', muted: '#9bacbf', border: '#2a3d55' } : { bg: '#f4f7f5', card: '#ffffff', text: '#152129', muted: '#66747c', border: '#dfe7e3' };

  useEffect(() => { loadData().then(setData).finally(() => setLoading(false)); }, []);
  const update = (next: AppData) => { setData(next); saveData(next).catch(() => Alert.alert('Erro', 'Não foi possível guardar os dados.')); };
  const current = balance(data.initialBalance, data.transactions);
  const income = monthTotal(data.transactions, 'income');
  const expenses = monthTotal(data.transactions, 'expense');
  const totalBudget = data.budgets.reduce((s, b) => s + b.limit, 0);
  const edu = educationSummary(data);
  const filtered = useMemo(() => data.transactions.filter(t =>
    (filter === 'all' || t.type === filter) && t.description.toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.date.localeCompare(a.date)), [data.transactions, filter, search]);

  // Ao tocar numa notificação (ou num lembrete interno) abre a área correspondente.
  const openReminder = (type: ReminderType) => {
    setModal(null); setLearnModule(null);
    if (type === 'expenses') { setSearch(''); setFilter('expense'); setTab('Movimentos'); }
    else if (type === 'savings') setTab('Metas');
    else if (type === 'budget') setTab('Orçamento');
    else if (type === 'weekly') setTab('Início');
    else if (type === 'education') setModal('learn');
    else { setLearnModule(firstAvailableChallenge(data)); setModal('learn'); }
  };
  const notif = useNotifications({ data, ready: !loading, onOpen: openReminder });
  const reminders = pendingInternalReminders(data, notif.prefs);
  const activeReminders = REMINDER_TYPES.filter(t => notif.prefs[t].enabled).length;

  if (loading) return <SafeAreaView style={[s.center, { backgroundColor: C.bg }]}><ActivityIndicator color={GOLD} size="large" /></SafeAreaView>;
  if (!data.onboarded) return <Onboarding colors={C} onDone={(name: string, initialBalance: number, currency: string) => update({ ...data, onboarded: true, name, initialBalance, currency })} />;

  function openTx(item?: Transaction) {
    setEditTx(item || null); setType(item?.type || 'expense'); setDesc(item?.description || '');
    setAmount(item ? String(item.amount) : ''); setCategory(item?.category || 'Alimentação'); setModal('tx');
  }
  function submitTx() {
    const value = Number(amount.replace(',', '.'));
    if (!desc.trim() || !category || !Number.isFinite(value) || value <= 0) return Alert.alert('Verifica os dados', 'Preenche a descrição, categoria e um valor superior a zero.');
    const item: Transaction = { id: editTx?.id || `${Date.now()}`, type, description: desc.trim(), amount: value, category, date: editTx?.date || new Date().toISOString() };
    update({ ...data, transactions: editTx ? data.transactions.map(t => t.id === item.id ? item : t) : [item, ...data.transactions] });
    setModal(null); Alert.alert('Guardado', editTx ? 'Movimento atualizado.' : 'Movimento registado.');
  }
  function removeTx(id: string) {
    Alert.alert('Eliminar movimento?', 'Os totais serão recalculados.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: () => update({ ...data, transactions: data.transactions.filter(t => t.id !== id) }) }]);
  }
  const cats = type === 'expense' ? expenseCategories : incomeCategories;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View style={s.top}><View><Text style={[s.eyebrow, { color: GREEN }]}>LOTUS</Text><Text style={[s.title, { color: C.text }]}>{tab}</Text></View><Pressable style={s.avatar} onPress={() => setTab('Perfil')}><Text style={s.avatarText}>{data.name.slice(0, 1).toUpperCase()}</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {tab === 'Início' && <>
          <Text style={[s.greeting, { color: C.text }]}>Olá, {data.name}. Como estão as tuas finanças hoje?</Text>
          {!!reminders.length && <Card colors={C}><Text style={[s.cardTitle, { color: C.text }]}>Lembretes</Text>{reminders.map(t => <Pressable key={t} style={s.reminderRow} onPress={() => t === 'expenses' ? openTx() : openReminder(t)}><Text style={[s.small, s.reminderText, { color: C.text }]}>{REMINDER_DEFS[t].message}</Text><Text style={s.link}>{REMINDER_DEFS[t].actionLabel} →</Text></Pressable>)}</Card>}
          <View style={s.hero}><Text style={s.heroLabel}>SALDO ATUAL</Text><Text style={s.heroValue}>{money(current, data.currency)}</Text><Text style={s.heroFoot}>Atualizado com {data.transactions.length} movimentos</Text></View>
          <View style={s.row}><Metric label="Receitas do mês" value={money(income, data.currency)} color={GREEN} colors={C} /><Metric label="Despesas do mês" value={money(expenses, data.currency)} color={RED} colors={C} /></View>
          <SectionTitle title="Orçamento mensal" action="Rever" onPress={() => setTab('Orçamento')} colors={C} />
          <Card colors={C}><Progress value={totalBudget ? expenses / totalBudget : 0} /><Text style={[s.cardTitle, { color: C.text }]}>{totalBudget ? `${money(expenses, data.currency)} de ${money(totalBudget, data.currency)}` : 'Ainda sem limite definido'}</Text><Text style={[s.small, { color: C.muted }]}>{totalBudget ? `${money(totalBudget - expenses, data.currency)} disponíveis` : 'Cria um orçamento para acompanhar os gastos.'}</Text></Card>
          <SectionTitle title="Movimentos recentes" action="Ver todos" onPress={() => setTab('Movimentos')} colors={C} />
          {data.transactions.length ? data.transactions.slice(0, 4).map(t => <TransactionRow key={t.id} item={t} currency={data.currency} colors={C} onPress={() => openTx(t)} />) : <Empty text="Ainda não registaste movimentos." action="Adicionar o primeiro" onPress={() => openTx()} colors={C} />}
          <SectionTitle title="Educação financeira" action="Abrir" onPress={() => setModal('learn')} colors={C} />
          <Card colors={C}><Text style={[s.cardTitle, { color: C.text }]}>{edu.completedUnits === 0 ? 'Começa o teu primeiro módulo' : `${edu.completedUnits} de ${edu.totalUnits} atividades concluídas`}</Text><Progress value={edu.progress} /><Text style={[s.small, { color: C.muted }]}>{edu.points} pontos · {edu.medals} medalhas · 4 módulos com tópicos, quizzes e missões finais</Text></Card>
          <SectionTitle title="Dica do dia" action="Aprender" onPress={() => setModal('learn')} colors={C} />
          <Card colors={C}><Text style={[s.cardTitle, { color: C.text }]}>Poupa primeiro, gasta depois.</Text><Text style={[s.small, { color: C.muted }]}>Reserva uma pequena quantia assim que recebes. A consistência faz a diferença.</Text></Card>
        </>}
        {tab === 'Movimentos' && <>
          <TextInput value={search} onChangeText={setSearch} placeholder="Pesquisar descrição" placeholderTextColor={C.muted} style={[s.input, { color: C.text, borderColor: C.border, backgroundColor: C.card }]} />
          <View style={s.chips}>{(['all', 'income', 'expense'] as const).map(x => <Chip key={x} active={filter === x} label={x === 'all' ? 'Todos' : x === 'income' ? 'Receitas' : 'Despesas'} onPress={() => setFilter(x)} colors={C} />)}</View>
          {filtered.length ? filtered.map(t => <TransactionRow key={t.id} item={t} currency={data.currency} colors={C} onPress={() => openTx(t)} onLong={() => removeTx(t.id)} />) : <Empty text="Nenhum movimento encontrado." action="Adicionar movimento" onPress={() => openTx()} colors={C} />}
        </>}
        {tab === 'Orçamento' && <>
          <Card colors={C}><Text style={[s.big, { color: C.text }]}>{money(totalBudget, data.currency)}</Text><Text style={[s.small, { color: C.muted }]}>Limite mensal total</Text><Progress value={totalBudget ? expenses / totalBudget : 0} /><Text style={[s.warning, { color: expenses > totalBudget && totalBudget ? RED : GREEN }]}>{!totalBudget ? 'Define o teu primeiro limite' : expenses > totalBudget ? 'Limite ultrapassado' : expenses / totalBudget >= .8 ? 'Próximo do limite' : 'Dentro do orçamento'}</Text></Card>
          {data.budgets.map(b => { const spent = data.transactions.filter(t => t.type === 'expense' && t.category === b.category && new Date(t.date).getMonth() === new Date().getMonth()).reduce((a, t) => a + t.amount, 0); return <Card key={b.category} colors={C}><Text style={[s.cardTitle, { color: C.text }]}>{b.category}</Text><Text style={[s.small, { color: C.muted }]}>{money(spent, data.currency)} de {money(b.limit, data.currency)}</Text><Progress value={spent / b.limit} /><Pressable onPress={() => update({ ...data, budgets: data.budgets.filter(x => x.category !== b.category) })}><Text style={s.delete}>Eliminar limite</Text></Pressable></Card>; })}
          <Primary label="Definir limite por categoria" onPress={() => setModal('budget')} />
        </>}
        {tab === 'Metas' && <>
          {data.goals.length ? data.goals.map(g => <Card key={g.id} colors={C}><Text style={[s.cardTitle, { color: C.text }]}>{g.name}</Text><Text style={[s.big, { color: C.text }]}>{money(g.saved, data.currency)} <Text style={[s.small, { color: C.muted }]}>de {money(g.target, data.currency)}</Text></Text><Progress value={g.saved / g.target} /><View style={s.cardActions}><Pressable onPress={() => { const next = Math.min(g.target, g.saved + Math.max(1, g.target * .1)); update({ ...data, goals: data.goals.map(x => x.id === g.id ? { ...x, saved: next } : x) }); }}><Text style={s.link}>+ Adicionar 10%</Text></Pressable><Pressable onPress={() => update({ ...data, goals: data.goals.filter(x => x.id !== g.id) })}><Text style={s.delete}>Eliminar</Text></Pressable></View></Card>) : <Empty text="Transforma um plano numa meta." action="Criar meta" onPress={() => setModal('goal')} colors={C} />}
          {!!data.goals.length && <Primary label="Nova meta" onPress={() => setModal('goal')} />}
        </>}
        {tab === 'Perfil' && <>
          <View style={s.profile}><View style={[s.avatar, s.avatarLarge]}><Text style={[s.avatarText, { fontSize: 28 }]}>{data.name.slice(0, 1).toUpperCase()}</Text></View><Text style={[s.title, { color: C.text }]}>{data.name}</Text><Text style={[s.small, { color: C.muted }]}>{data.transactions.length} movimentos · {edu.topicsDone}/{TOTAL_TOPICS} tópicos</Text></View>
          <Card colors={C}><Setting label="Tema escuro" value={dark ? 'Ativo' : 'Inativo'} onPress={() => update({ ...data, theme: dark ? 'light' : 'dark' })} colors={C} /><Setting label="Educação financeira" value={`${edu.topicsDone}/${TOTAL_TOPICS} tópicos · ${edu.missionsDone}/${TOTAL_MISSIONS} missões`} onPress={() => setModal('learn')} colors={C} /><Setting label="Notificações" value={notif.permission.status === 'unsupported' ? 'Indisponível' : notif.permission.granted ? `${activeReminders} lembretes ativos` : 'Por autorizar'} onPress={() => setModal('notif')} colors={C} /><Setting label="Moeda" value={data.currency} onPress={() => update({ ...data, currency: data.currency === 'AOA' ? 'EUR' : data.currency === 'EUR' ? 'USD' : 'AOA' })} colors={C} /></Card>
          <Pressable style={[s.outline, { borderColor: RED }]} onPress={() => Alert.alert('Eliminar todos os dados?', 'Esta ação apaga os dados guardados neste dispositivo.', [{ text: 'Cancelar', style: 'cancel' }, { text: 'Eliminar', style: 'destructive', onPress: async () => { await clearData(); await notif.reset(); setData(emptyData); } }])}><Text style={{ color: RED, fontWeight: '700' }}>Eliminar dados locais</Text></Pressable>
        </>}
      </ScrollView>
      <View style={[s.nav, { backgroundColor: C.card, borderColor: C.border }]}>{(['Início', 'Movimentos', 'Orçamento', 'Metas', 'Perfil'] as Tab[]).map((item, i) => <Pressable key={item} style={s.navItem} onPress={() => setTab(item)}><Text style={[s.navIcon, { color: tab === item ? BLUE : C.muted }]}>{['⌂', '↕', '◫', '◇', '○'][i]}</Text><Text style={[s.navLabel, { color: tab === item ? BLUE : C.muted }]}>{item}</Text></Pressable>)}</View>
      <Pressable accessibilityLabel="Adicionar movimento" style={s.fab} onPress={() => openTx()}><Text style={s.fabText}>＋</Text></Pressable>

      <Modal visible={modal === 'tx'} animationType="slide" transparent><Sheet title={editTx ? 'Editar movimento' : 'Novo movimento'} colors={C} onClose={() => setModal(null)}>
        <View style={s.chips}><Chip active={type === 'expense'} label="Despesa" onPress={() => { setType('expense'); setCategory('Alimentação'); }} colors={C} /><Chip active={type === 'income'} label="Receita" onPress={() => { setType('income'); setCategory('Bolsa de estudo'); }} colors={C} /></View>
        <Field label="Descrição" value={desc} onChange={setDesc} colors={C} />
        <Field label="Valor" value={amount} onChange={setAmount} keyboard="decimal-pad" colors={C} />
        <Text style={[s.label, { color: C.text }]}>Categoria</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips}>{cats.map(x => <Chip key={x} active={category === x} label={x} onPress={() => setCategory(x)} colors={C} />)}</ScrollView>
        <Primary label="Guardar movimento" onPress={submitTx} />
        {editTx && <Pressable style={s.deleteButton} onPress={() => { setModal(null); removeTx(editTx.id); }}><Text style={s.delete}>Eliminar movimento</Text></Pressable>}
      </Sheet></Modal>
      <Modal visible={modal === 'goal'} animationType="slide" transparent><GoalSheet colors={C} onClose={() => setModal(null)} onSave={(goal: Goal) => { update({ ...data, goals: [goal, ...data.goals] }); setModal(null); }} /></Modal>
      <Modal visible={modal === 'budget'} animationType="slide" transparent><BudgetSheet colors={C} onClose={() => setModal(null)} onSave={(category: string, limit: number) => { update({ ...data, budgets: [...data.budgets.filter(b => b.category !== category), { category, limit }] }); setModal(null); }} /></Modal>
      <Education visible={modal === 'learn'} data={data} dark={dark} colors={C} update={update} initialModule={learnModule} onClose={() => { setModal(null); setLearnModule(null); }} />
      <NotificationSettings visible={modal === 'notif'} colors={C} prefs={notif.prefs} relevance={notif.relevance} permission={notif.permission} onChange={notif.setPrefs} onRequestPermission={notif.requestPermission} onTest={notif.sendTest} onClose={() => setModal(null)} />
    </SafeAreaView>
  );
}

function Onboarding({ colors, onDone }: any) {
  const [step, setStep] = useState(0), [name, setName] = useState(''), [amount, setAmount] = useState('0'), [currency, setCurrency] = useState('AOA');
  return <SafeAreaView style={[s.safe, { backgroundColor: colors.bg }]}><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.flex}><View style={s.onboarding}>
    <Image source={require('./assets/lotus.png')} style={s.logo} resizeMode="contain" />
    {step === 0 ? <><Text style={[s.brand, { color: BLUE }]}>LOTUS</Text><Text style={[s.onTitle, { color: colors.text }]}>Onde as tuas finanças ganham vida.</Text><Text style={[s.body, { color: colors.muted }]}>Organiza o teu dinheiro. Constrói hábitos melhores. Avança ao teu ritmo.</Text><Primary label="Começar" onPress={() => setStep(1)} /></>
    : step === 1 ? <><Text style={[s.onTitle, { color: colors.text }]}>Vamos conhecer-te</Text><Field label="Como queres ser tratado?" value={name} onChange={setName} colors={colors} /><Field label="Saldo inicial" value={amount} onChange={setAmount} keyboard="decimal-pad" colors={colors} /><Text style={[s.label, { color: colors.text }]}>Moeda</Text><View style={s.chips}>{['AOA', 'EUR', 'USD'].map(x => <Chip key={x} active={currency === x} label={x} onPress={() => setCurrency(x)} colors={colors} />)}</View><Primary label="Continuar" onPress={() => name.trim() ? setStep(2) : Alert.alert('Indica o teu nome')} /></>
    : <><Text style={[s.onTitle, { color: colors.text }]}>Qual é o teu foco?</Text>{['Controlar despesas', 'Poupar dinheiro', 'Organizar o orçamento', 'Melhorar hábitos'].map(x => <Pressable key={x} style={[s.choice, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => onDone(name.trim(), Number(amount.replace(',', '.')) || 0, currency)}><Text style={[s.cardTitle, { color: colors.text }]}>{x}</Text><Text style={{ color: GREEN }}>Continuar →</Text></Pressable>)}</>}
  </View></KeyboardAvoidingView></SafeAreaView>;
}

function GoalSheet({ colors, onClose, onSave }: any) {
  const [name, setName] = useState(''), [target, setTarget] = useState(''), [saved, setSaved] = useState('0');
  return <Sheet title="Nova meta" colors={colors} onClose={onClose}><Field label="Nome da meta" value={name} onChange={setName} colors={colors} /><Field label="Valor pretendido" value={target} onChange={setTarget} keyboard="decimal-pad" colors={colors} /><Field label="Já poupado" value={saved} onChange={setSaved} keyboard="decimal-pad" colors={colors} /><Primary label="Criar meta" onPress={() => { const t = Number(target.replace(',', '.')), v = Number(saved.replace(',', '.')); if (!name.trim() || t <= 0 || v < 0) return Alert.alert('Verifica os valores'); onSave({ id: `${Date.now()}`, name: name.trim(), target: t, saved: v } as Goal); }} /></Sheet>;
}
function BudgetSheet({ colors, onClose, onSave }: any) {
  const [category, setCategory] = useState('Alimentação'), [limit, setLimit] = useState('');
  return <Sheet title="Definir orçamento" colors={colors} onClose={onClose}><Text style={[s.label, { color: colors.text }]}>Categoria</Text><View style={s.chips}>{expenseCategories.slice(0, 6).map(x => <Chip key={x} active={category === x} label={x} onPress={() => setCategory(x)} colors={colors} />)}</View><Field label="Limite mensal" value={limit} onChange={setLimit} keyboard="decimal-pad" colors={colors} /><Primary label="Guardar limite" onPress={() => { const n = Number(limit.replace(',', '.')); n > 0 ? onSave(category, n) : Alert.alert('Indica um limite válido'); }} /></Sheet>;
}
function Sheet({ title, colors, onClose, children }: any) { return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.modalBackdrop}><View style={[s.sheet, { backgroundColor: colors.bg }]}><View style={s.sheetHead}><Text style={[s.title, { color: colors.text }]}>{title}</Text><Pressable onPress={onClose}><Text style={[s.close, { color: colors.text }]}>×</Text></Pressable></View><ScrollView keyboardShouldPersistTaps="handled">{children}</ScrollView></View></KeyboardAvoidingView>; }
function Card({ colors, children }: any) { return <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>{children}</View>; }
function Metric({ label, value, color, colors }: any) { return <View style={[s.metric, { backgroundColor: colors.card, borderColor: colors.border }]}><Text style={[s.small, { color: colors.muted }]}>{label}</Text><Text numberOfLines={1} style={[s.metricValue, { color }]}>{value}</Text></View>; }
function Progress({ value }: any) { return <View style={s.progress}><View style={[s.progressFill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: value > 1 ? RED : value >= .8 ? GOLD : GREEN }]} /></View>; }
function Primary({ label, onPress }: any) { return <Pressable style={s.primary} onPress={onPress}><Text style={s.primaryText}>{label}</Text></Pressable>; }
function Chip({ active, label, onPress, colors }: any) { return <Pressable style={[s.chip, { backgroundColor: active ? BLUE : colors.card, borderColor: active ? BLUE : colors.border }]} onPress={onPress}><Text style={{ color: active ? '#fff' : colors.text, fontWeight: '600' }}>{label}</Text></Pressable>; }
function Field({ label, value, onChange, colors, keyboard }: any) { return <View style={s.field}><Text style={[s.label, { color: colors.text }]}>{label}</Text><TextInput value={value} onChangeText={onChange} keyboardType={keyboard} style={[s.input, { color: colors.text, backgroundColor: colors.card, borderColor: colors.border }]} placeholderTextColor={colors.muted} /></View>; }
function Empty({ text, action, onPress, colors }: any) { return <View style={[s.empty, { borderColor: colors.border }]}><Text style={[s.cardTitle, { color: colors.text }]}>{text}</Text><Pressable onPress={onPress}><Text style={s.link}>{action} →</Text></Pressable></View>; }
function SectionTitle({ title, action, onPress, colors }: any) { return <View style={s.sectionHead}><Text style={[s.sectionTitle, { color: colors.text }]}>{title}</Text><Pressable onPress={onPress}><Text style={s.link}>{action}</Text></Pressable></View>; }
function TransactionRow({ item, currency, colors, onPress, onLong }: any) { return <Pressable onPress={onPress} onLongPress={onLong} style={[s.tx, { backgroundColor: colors.card, borderColor: colors.border }]}><View style={[s.txIcon, { backgroundColor: item.type === 'income' ? '#dff4ec' : '#f9e8e8' }]}><Text style={{ color: item.type === 'income' ? GREEN : RED }}>{item.type === 'income' ? '↓' : '↑'}</Text></View><View style={s.txBody}><Text style={[s.cardTitle, { color: colors.text }]}>{item.description}</Text><Text style={[s.small, { color: colors.muted }]}>{item.category} · {new Date(item.date).toLocaleDateString('pt-PT')}</Text></View><Text style={{ color: item.type === 'income' ? GREEN : RED, fontWeight: '800' }}>{item.type === 'income' ? '+' : '−'}{money(item.amount, currency)}</Text></Pressable>; }
function Setting({ label, value, onPress, colors }: any) { return <Pressable style={[s.setting, { borderColor: colors.border }]} onPress={onPress}><Text style={[s.cardTitle, { color: colors.text }]}>{label}</Text><Text style={[s.small, { color: colors.muted }]}>{value} ›</Text></Pressable>; }

const s = StyleSheet.create({
  flex:{flex:1}, safe:{flex:1}, center:{flex:1,alignItems:'center',justifyContent:'center'}, top:{paddingHorizontal:20,paddingTop:12,paddingBottom:10,flexDirection:'row',alignItems:'center',justifyContent:'space-between'}, eyebrow:{fontSize:11,fontWeight:'900',letterSpacing:2}, title:{fontSize:25,fontWeight:'800'}, content:{padding:20,paddingTop:8,paddingBottom:120}, greeting:{fontSize:16,lineHeight:23,marginBottom:16}, avatar:{width:42,height:42,borderRadius:21,backgroundColor:GOLD,alignItems:'center',justifyContent:'center'}, avatarLarge:{width:70,height:70,borderRadius:35,marginBottom:12}, avatarText:{color:BLUE,fontWeight:'900'}, hero:{backgroundColor:BLUE,borderRadius:24,padding:24,marginBottom:12}, heroLabel:{color:'#aebfd4',fontSize:11,fontWeight:'700',letterSpacing:1.5}, heroValue:{color:'#fff',fontSize:30,fontWeight:'800',marginVertical:10}, heroFoot:{color:'#aebfd4',fontSize:12}, row:{flexDirection:'row',gap:10}, metric:{flex:1,borderWidth:1,borderRadius:16,padding:15}, metricValue:{fontSize:15,fontWeight:'800',marginTop:7}, sectionHead:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginTop:24,marginBottom:10}, sectionTitle:{fontSize:18,fontWeight:'800'}, link:{color:GREEN,fontWeight:'700'}, card:{borderRadius:18,borderWidth:1,padding:17,marginBottom:10,gap:7}, cardTitle:{fontSize:15,fontWeight:'700'}, small:{fontSize:12,lineHeight:18}, big:{fontSize:22,fontWeight:'800'}, warning:{fontSize:12,fontWeight:'800'}, progress:{height:7,backgroundColor:'#dce4e1',borderRadius:10,overflow:'hidden',marginVertical:6}, progressFill:{height:'100%',borderRadius:10}, empty:{borderWidth:1,borderStyle:'dashed',borderRadius:18,padding:25,alignItems:'center',gap:12}, tx:{flexDirection:'row',alignItems:'center',borderWidth:1,borderRadius:16,padding:12,marginBottom:8}, txIcon:{width:38,height:38,borderRadius:12,alignItems:'center',justifyContent:'center'}, txBody:{flex:1,marginHorizontal:10}, nav:{position:'absolute',bottom:0,left:0,right:0,height:78,borderTopWidth:1,flexDirection:'row',paddingBottom:12}, navItem:{flex:1,alignItems:'center',justifyContent:'center'}, navIcon:{fontSize:22}, navLabel:{fontSize:10,fontWeight:'600'}, fab:{position:'absolute',right:20,bottom:92,width:54,height:54,borderRadius:27,backgroundColor:GOLD,alignItems:'center',justifyContent:'center',elevation:5}, fabText:{fontSize:28,color:BLUE}, modalBackdrop:{flex:1,backgroundColor:'rgba(0,0,0,.45)',justifyContent:'flex-end'}, sheet:{maxHeight:'88%',borderTopLeftRadius:28,borderTopRightRadius:28,padding:20,paddingBottom:36}, sheetHead:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18}, close:{fontSize:32}, chips:{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:14}, chip:{borderWidth:1,borderRadius:999,paddingHorizontal:14,paddingVertical:9}, field:{marginBottom:14}, label:{fontSize:12,fontWeight:'700',marginBottom:7}, input:{borderWidth:1,borderRadius:13,paddingHorizontal:14,paddingVertical:13,fontSize:15}, primary:{backgroundColor:BLUE,borderRadius:14,padding:16,alignItems:'center',marginTop:12}, primaryText:{color:'#fff',fontWeight:'800'}, delete:{color:RED,fontWeight:'700',fontSize:12}, deleteButton:{padding:16,alignItems:'center'}, cardActions:{flexDirection:'row',justifyContent:'space-between',marginTop:8}, profile:{alignItems:'center',paddingVertical:18}, setting:{paddingVertical:15,borderBottomWidth:1,flexDirection:'row',justifyContent:'space-between'}, outline:{borderWidth:1,borderRadius:14,padding:15,alignItems:'center',marginTop:12}, lesson:{borderBottomWidth:1,paddingVertical:15,gap:3}, onboarding:{flex:1,justifyContent:'center',padding:28}, logo:{width:100,height:100,alignSelf:'center',marginBottom:8}, brand:{fontSize:36,fontWeight:'900',letterSpacing:5,textAlign:'center'}, onTitle:{fontSize:29,fontWeight:'800',textAlign:'center',marginVertical:14}, body:{fontSize:16,lineHeight:24,textAlign:'center',marginBottom:24}, choice:{borderWidth:1,borderRadius:16,padding:18,marginBottom:10,flexDirection:'row',justifyContent:'space-between',alignItems:'center'}, reminderRow:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:12,paddingVertical:6}, reminderText:{flex:1},
});
