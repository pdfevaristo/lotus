import React, { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import {
  Allocation, BudgetMission, Challenge, DecisionMission, Mission, Module, Topic,
  educationSummary, evaluateAllocation, kz, missionMaxScore, moduleStatus, modules,
  TOPICS_PER_MODULE, TOTAL_MISSIONS, TOTAL_TOPICS,
} from './education';
import { AppData } from './types';

const BLUE = '#062d62';
const GOLD = '#eebd55';
const GREEN = '#168567';

type Colors = { bg: string; card: string; text: string; muted: string; border: string };
type Screen = { name: 'home' } | { name: 'module'; m: number } | { name: 'topic'; m: number; t: number } | { name: 'mission'; m: number };

type Props = {
  visible: boolean;
  data: AppData;
  dark: boolean;
  colors: Colors;
  update: (next: AppData) => void;
  onClose: () => void;
  /** Quando definido, abre diretamente o ecrã deste módulo (ex.: ao tocar na notificação de desafio). */
  initialModule?: number | null;
};

/* ------------------------------------------------------------------ */
/* Funções auxiliares                                                  */
/* ------------------------------------------------------------------ */

function shuffled(n: number): number[] {
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function withTopicResult(data: AppData, id: string, correct: boolean): AppData {
  const prev = data.educationResults[id];
  return {
    ...data,
    educationDone: data.educationDone.includes(id) ? data.educationDone : [...data.educationDone, id],
    educationResults: {
      ...data.educationResults,
      [id]: { ...prev, attempts: (prev?.attempts ?? 0) + 1, firstTry: prev ? prev.firstTry : correct },
    },
  };
}

function withMissionResult(data: AppData, id: string, score: number, max: number): AppData {
  const prev = data.educationResults[id];
  return {
    ...data,
    educationDone: data.educationDone.includes(id) ? data.educationDone : [...data.educationDone, id],
    educationResults: {
      ...data.educationResults,
      [id]: { ...prev, attempts: (prev?.attempts ?? 0) + 1, best: Math.max(prev?.best ?? 0, score), max },
    },
  };
}

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export function Education({ visible, data, dark, colors, update, onClose, initialModule }: Props) {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });

  useEffect(() => {
    if (!visible) setScreen({ name: 'home' });
    else if (initialModule != null && modules[initialModule]) setScreen({ name: 'module', m: initialModule });
  }, [visible, initialModule]);

  const back = () => {
    if (screen.name === 'home') onClose();
    else if (screen.name === 'module') setScreen({ name: 'home' });
    else setScreen({ name: 'module', m: screen.m });
  };

  const title =
    screen.name === 'home' ? 'Educação financeira'
    : screen.name === 'module' ? `Módulo ${modules[screen.m].number}`
    : screen.name === 'topic' ? `Tópico ${screen.t + 1} de ${TOPICS_PER_MODULE}`
    : 'Missão final';

  const common = { data, dark, colors, update };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={back}>
      <SafeAreaView style={[st.flex, { backgroundColor: colors.bg }]}>
        <View style={st.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={back} hitSlop={12} style={st.headerBtn}>
            <Text style={[st.headerIcon, { color: colors.text }]}>{screen.name === 'home' ? '×' : '‹'}</Text>
          </Pressable>
          <Text style={[st.headerTitle, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <View style={st.headerBtn}>
            {screen.name !== 'home' && (
              <Pressable accessibilityRole="button" accessibilityLabel="Fechar" onPress={onClose} hitSlop={12}>
                <Text style={[st.headerIcon, { color: colors.muted }]}>×</Text>
              </Pressable>
            )}
          </View>
        </View>
        <ScrollView contentContainerStyle={st.content} keyboardShouldPersistTaps="handled">
          {screen.name === 'home' && <Home {...common} onOpen={m => setScreen({ name: 'module', m })} />}
          {screen.name === 'module' && (
            <ModuleScreen
              {...common}
              m={screen.m}
              onTopic={t => setScreen({ name: 'topic', m: screen.m, t })}
              onMission={() => setScreen({ name: 'mission', m: screen.m })}
            />
          )}
          {screen.name === 'topic' && (
            <TopicScreen
              key={`${screen.m}-${screen.t}`}
              {...common}
              module={modules[screen.m]}
              index={screen.t}
              onNext={() =>
                screen.t < modules[screen.m].topics.length - 1
                  ? setScreen({ name: 'topic', m: screen.m, t: screen.t + 1 })
                  : setScreen({ name: 'module', m: screen.m })
              }
              onModule={() => setScreen({ name: 'module', m: screen.m })}
            />
          )}
          {screen.name === 'mission' && (
            <MissionScreen
              key={modules[screen.m].mission.id}
              {...common}
              module={modules[screen.m]}
              onModule={() => setScreen({ name: 'module', m: screen.m })}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

type CommonProps = { data: AppData; dark: boolean; colors: Colors; update: (next: AppData) => void };

/* ------------------------------------------------------------------ */
/* Ecrã inicial                                                        */
/* ------------------------------------------------------------------ */

function Home({ data, colors, onOpen }: CommonProps & { onOpen: (m: number) => void }) {
  const sum = educationSummary(data);
  return (
    <>
      <View style={st.hero}>
        <Text style={st.heroLabel}>O TEU PROGRESSO</Text>
        <Text style={st.heroValue}>{sum.completedUnits} de {sum.totalUnits} concluídos</Text>
        <Bar value={sum.progress} track="#23497f" fill={GOLD} />
        <View style={st.heroStats}>
          <Stat label="Tópicos" value={`${sum.topicsDone}/${TOTAL_TOPICS}`} />
          <Stat label="Missões" value={`${sum.missionsDone}/${TOTAL_MISSIONS}`} />
          <Stat label="Pontos" value={String(sum.points)} />
        </View>
        <View style={st.medals}>
          {modules.map(mod => {
            const done = moduleStatus(mod, data).completed;
            return (
              <View key={mod.id} style={[st.medal, { opacity: done ? 1 : 0.3 }]} accessibilityLabel={`Medalha do módulo ${mod.number}${done ? ' conquistada' : ' por conquistar'}`}>
                <Text style={st.medalIcon}>{done ? '🏅' : '○'}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <Text style={[st.note, { color: colors.muted }]}>
        Cada módulo tem quatro tópicos, cada um com um mini-desafio, e termina com uma missão final. Podes repetir os desafios as vezes que quiseres: o objectivo é aprender, não ser avaliado.
      </Text>

      {modules.map((mod, i) => {
        const s = moduleStatus(mod, data);
        return (
          <Pressable key={mod.id} accessibilityRole="button" onPress={() => onOpen(i)} style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.row}>
              <Text style={st.moduleIcon}>{mod.icon}</Text>
              <View style={st.flex}>
                <Text style={[st.eyebrow, { color: GREEN }]}>MÓDULO {mod.number}</Text>
                <Text style={[st.cardTitle, { color: colors.text }]}>{mod.title}</Text>
              </View>
              {s.completed && <Text style={st.medalIcon}>🏅</Text>}
            </View>
            <Text style={[st.small, { color: colors.muted }]}>{mod.objective}</Text>
            <Bar value={(s.topicsDone + (s.missionDone ? 1 : 0)) / (mod.topics.length + 1)} track={colors.border} fill={GREEN} />
            <Text style={[st.small, { color: colors.muted }]}>
              {s.topicsDone}/{mod.topics.length} tópicos · {s.missionDone ? 'missão concluída' : s.missionUnlocked ? 'missão disponível' : 'missão bloqueada'}
            </Text>
          </Pressable>
        );
      })}
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.stat}>
      <Text style={st.statValue}>{value}</Text>
      <Text style={st.statLabel}>{label}</Text>
    </View>
  );
}

function Bar({ value, track, fill }: { value: number; track: string; fill: string }) {
  return (
    <View style={[st.bar, { backgroundColor: track }]}>
      <View style={[st.barFill, { width: `${Math.min(100, Math.max(0, value * 100))}%`, backgroundColor: fill }]} />
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Ecrã do módulo                                                      */
/* ------------------------------------------------------------------ */

function ModuleScreen({ data, colors, m, onTopic, onMission }: CommonProps & { m: number; onTopic: (t: number) => void; onMission: () => void }) {
  const mod = modules[m];
  const s = moduleStatus(mod, data);
  const missionResult = data.educationResults[mod.mission.id];
  return (
    <>
      <Text style={[st.eyebrow, { color: GREEN }]}>{mod.icon}  MÓDULO {mod.number}</Text>
      <Text style={[st.title, { color: colors.text }]}>{mod.title}</Text>
      <Text style={[st.body, { color: colors.muted }]}>
        <Text style={{ fontWeight: '800', color: colors.text }}>Objectivo: </Text>{mod.objective}
      </Text>

      <Text style={[st.section, { color: colors.text }]}>Tópicos</Text>
      {mod.topics.map((t, i) => {
        const done = data.educationDone.includes(t.id);
        return (
          <Pressable key={t.id} accessibilityRole="button" onPress={() => onTopic(i)} style={[st.card, st.row, { backgroundColor: colors.card, borderColor: done ? GREEN : colors.border }]}>
            <View style={[st.badge, { backgroundColor: done ? GREEN : colors.border }]}>
              <Text style={{ color: done ? '#fff' : colors.muted, fontWeight: '800' }}>{done ? '✓' : i + 1}</Text>
            </View>
            <View style={st.flex}>
              <Text style={[st.cardTitle, { color: colors.text }]}>{t.title}</Text>
              <Text style={[st.small, { color: colors.muted }]}>
                {t.challenge.kind === 'quiz' ? 'Mini-desafio: quiz' : 'Mini-desafio: cenário'}
                {done ? (data.educationResults[t.id]?.firstTry ? ' · acertaste à primeira' : ' · concluído') : ''}
              </Text>
            </View>
            <Text style={{ color: colors.muted, fontSize: 20 }}>›</Text>
          </Pressable>
        );
      })}

      <Text style={[st.section, { color: colors.text }]}>Missão final</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: !s.missionUnlocked }}
        disabled={!s.missionUnlocked}
        onPress={onMission}
        style={[st.card, { backgroundColor: s.missionUnlocked ? BLUE : colors.card, borderColor: s.missionUnlocked ? BLUE : colors.border, opacity: s.missionUnlocked ? 1 : 0.7 }]}
      >
        <Text style={[st.eyebrow, { color: s.missionUnlocked ? GOLD : colors.muted }]}>{s.missionUnlocked ? (s.missionDone ? 'CONCLUÍDA · REPETIR' : 'DISPONÍVEL') : '🔒 BLOQUEADA'}</Text>
        <Text style={[st.cardTitle, { color: s.missionUnlocked ? '#fff' : colors.text }]}>{mod.mission.title}</Text>
        <Text style={[st.small, { color: s.missionUnlocked ? '#c9d6e6' : colors.muted }]}>
          {s.missionUnlocked ? mod.mission.intro : `Conclui os ${mod.topics.length} tópicos para desbloquear a missão (${s.topicsDone}/${mod.topics.length}).`}
        </Text>
        {missionResult?.best !== undefined && (
          <Text style={[st.small, { color: GOLD, fontWeight: '800' }]}>Melhor resultado: {missionResult.best}/{missionResult.max}</Text>
        )}
      </Pressable>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tópico + mini-desafio                                               */
/* ------------------------------------------------------------------ */

function TopicScreen({ data, dark, colors, update, module: mod, index, onNext, onModule }: CommonProps & { module: Module; index: number; onNext: () => void; onModule: () => void }) {
  const topic = mod.topics[index];
  const done = data.educationDone.includes(topic.id);
  const [challengeOpen, setChallengeOpen] = useState(false);
  const isLast = index === mod.topics.length - 1;

  return (
    <>
      <Text style={[st.eyebrow, { color: GREEN }]}>{mod.title.toUpperCase()}</Text>
      <Text style={[st.title, { color: colors.text }]}>{topic.title}</Text>
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[st.reading, { color: colors.text }]}>{topic.content}</Text>
      </View>

      {!challengeOpen ? (
        <Primary label={done ? 'Rever o mini-desafio' : 'Fazer o mini-desafio'} onPress={() => setChallengeOpen(true)} />
      ) : (
        <ChallengeCard
          topic={topic}
          dark={dark}
          colors={colors}
          isLast={isLast}
          onAnswered={correct => update(withTopicResult(data, topic.id, correct))}
          onNext={onNext}
          onModule={onModule}
        />
      )}
      {done && !challengeOpen && (
        <Pressable accessibilityRole="button" onPress={onNext} style={st.ghost}>
          <Text style={{ color: GREEN, fontWeight: '700' }}>{isLast ? 'Voltar ao módulo' : 'Ir para o tópico seguinte'} →</Text>
        </Pressable>
      )}
    </>
  );
}

function tone(dark: boolean, good: boolean) {
  return good
    ? { bg: dark ? '#12362e' : '#dff4ec', border: GREEN }
    : { bg: dark ? '#3a3016' : '#fdf3d9', border: GOLD };
}

function ChallengeCard({ topic, dark, colors, isLast, onAnswered, onNext, onModule }: {
  topic: Topic; dark: boolean; colors: Colors; isLast: boolean;
  onAnswered: (correct: boolean) => void; onNext: () => void; onModule: () => void;
}) {
  const c: Challenge = topic.challenge;
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const order = useMemo(() => shuffled(c.options.length), [round, topic.id]);
  const correct = picked === c.answer;

  function choose(optionIndex: number) {
    if (picked !== null) return;
    setPicked(optionIndex);
    onAnswered(optionIndex === c.answer);
  }

  return (
    <View style={[st.card, { backgroundColor: colors.card, borderColor: BLUE }]}>
      <Text style={[st.eyebrow, { color: GREEN }]}>MINI-DESAFIO — {c.kind === 'quiz' ? 'QUIZ' : 'CENÁRIO'}</Text>
      <Text style={[st.question, { color: colors.text }]}>{c.question}</Text>
      {order.map(i => {
        const isPicked = picked === i;
        const isAnswer = i === c.answer;
        const show = picked !== null && (isAnswer || isPicked);
        const t = show ? tone(dark, isAnswer) : null;
        return (
          <Pressable
            key={i}
            accessibilityRole="button"
            disabled={picked !== null}
            onPress={() => choose(i)}
            style={[st.option, { backgroundColor: t ? t.bg : colors.bg, borderColor: t ? t.border : colors.border }]}
          >
            <Text style={[st.optionText, { color: colors.text }]}>{c.options[i]}</Text>
            {show && <Text style={{ color: isAnswer ? GREEN : '#a9780b', fontWeight: '800' }}>{isAnswer ? '✓' : '↻'}</Text>}
          </Pressable>
        );
      })}

      {picked !== null && (
        <View style={[st.feedback, { backgroundColor: tone(dark, correct).bg, borderColor: tone(dark, correct).border }]}>
          <Text style={[st.feedbackTitle, { color: colors.text }]}>{correct ? 'Boa escolha!' : 'Vamos rever esta decisão'}</Text>
          <Text style={[st.reading, { color: colors.text }]}>{c.feedback}</Text>
          {!correct && <Text style={[st.small, { color: colors.muted }]}>Opção mais adequada: {c.options[c.answer]}</Text>}
        </View>
      )}

      {picked !== null && (
        <>
          <Primary label={isLast ? 'Voltar ao módulo' : 'Continuar para o próximo tópico'} onPress={isLast ? onModule : onNext} />
          {!correct && (
            <Pressable accessibilityRole="button" onPress={() => { setPicked(null); setRound(r => r + 1); }} style={st.ghost}>
              <Text style={{ color: GREEN, fontWeight: '700' }}>Tentar outra vez</Text>
            </Pressable>
          )}
        </>
      )}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Missões                                                             */
/* ------------------------------------------------------------------ */

function MissionScreen(props: CommonProps & { module: Module; onModule: () => void }) {
  const mission: Mission = props.module.mission;
  return mission.kind === 'decisions'
    ? <DecisionMissionView {...props} mission={mission} />
    : <BudgetMissionView {...props} mission={mission} />;
}

type ReviewItem = { concept: string; ok: boolean; review: string };

function MissionResult({ module: mod, data, colors, score, max, items, onRetry, onModule }: {
  module: Module; data: AppData; colors: Colors; score: number; max: number; items: ReviewItem[];
  onRetry: () => void; onModule: () => void;
}) {
  const understood = items.filter(i => i.ok);
  const toReview = items.filter(i => !i.ok);
  const completed = moduleStatus(mod, data).completed;
  const best = data.educationResults[mod.mission.id]?.best ?? score;
  return (
    <>
      <View style={st.hero}>
        <Text style={st.heroLabel}>MISSÃO CONCLUÍDA</Text>
        <Text style={st.heroValue}>{mod.mission.title}</Text>
        <Text style={st.heroFoot}>Resultado: {score}/{max} · Melhor resultado: {best}/{max}</Text>
        {completed && <Text style={[st.heroFoot, { color: GOLD, marginTop: 8, fontWeight: '800' }]}>🏅 Medalha do módulo {mod.number} conquistada</Text>}
      </View>

      {understood.length > 0 && (
        <View style={[st.card, { backgroundColor: colors.card, borderColor: GREEN }]}>
          <Text style={[st.cardTitle, { color: colors.text }]}>Demonstraste compreender</Text>
          {understood.map(i => <Text key={i.concept} style={[st.reading, { color: colors.text }]}>✓ {i.concept}</Text>)}
        </View>
      )}
      {toReview.length > 0 && (
        <View style={[st.card, { backgroundColor: colors.card, borderColor: GOLD }]}>
          <Text style={[st.cardTitle, { color: colors.text }]}>Para rever e melhorar</Text>
          {toReview.map(i => (
            <View key={i.concept} style={{ gap: 2 }}>
              <Text style={[st.reading, { color: colors.text, fontWeight: '700' }]}>↻ {i.concept}</Text>
              <Text style={[st.small, { color: colors.muted }]}>{i.review}</Text>
            </View>
          ))}
        </View>
      )}
      <Text style={[st.note, { color: colors.muted }]}>
        Podes repetir a missão para explorar outras decisões e aprender com as respostas. O teu melhor resultado fica guardado.
      </Text>
      <Primary label="Repetir a missão" onPress={onRetry} />
      <Pressable accessibilityRole="button" onPress={onModule} style={st.ghost}>
        <Text style={{ color: GREEN, fontWeight: '700' }}>Voltar ao módulo</Text>
      </Pressable>
    </>
  );
}

/* -------- Missões de decisões (módulos 1, 3 e 4) -------- */

function DecisionMissionView({ module: mod, mission, data, dark, colors, update, onModule }: CommonProps & { module: Module; mission: DecisionMission; onModule: () => void }) {
  const flat = useMemo(() => mission.situations.flatMap(sit => sit.steps.map(step => ({ sit, step }))), [mission]);
  const [started, setStarted] = useState(false);
  const [idx, setIdx] = useState(0);
  const [picks, setPicks] = useState<number[]>([]);
  const [picked, setPicked] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [round, setRound] = useState(0);

  const captures = useMemo(() => {
    const out: Record<string, string> = {};
    flat.forEach(({ step }, i) => {
      if (step.capture && picks[i] !== undefined) out[step.capture] = step.options[picks[i]].value ?? step.options[picks[i]].text;
    });
    return out;
  }, [flat, picks]);
  const fill = (text: string) => text.replace(/\{(\w+)\}/g, (_, k: string) => captures[k] ?? '');

  const current = flat[idx];
  const order = useMemo(() => shuffled(current.step.options.length), [idx, round]);
  const max = missionMaxScore(mission);
  const score = picks.reduce((n, p, i) => n + flat[i].step.options[p].points, 0);

  function restart() {
    setStarted(true); setIdx(0); setPicks([]); setPicked(null); setFinished(false); setRound(r => r + 1);
  }

  if (!started) {
    return (
      <>
        <Text style={[st.eyebrow, { color: GREEN }]}>MISSÃO FINAL · {mod.title.toUpperCase()}</Text>
        <Text style={[st.title, { color: colors.text }]}>{mission.title}</Text>
        <Text style={[st.body, { color: colors.muted }]}>{mission.intro}</Text>
        <Text style={[st.note, { color: colors.muted }]}>{flat.length} decisões · sem penalizações: cada resposta traz feedback para aprenderes.</Text>
        <Primary label="Começar a missão" onPress={() => setStarted(true)} />
      </>
    );
  }

  if (finished) {
    const items: ReviewItem[] = flat.map(({ step }, i) => ({
      concept: step.concept,
      ok: step.options[picks[i]].points === 2,
      review: step.review,
    }));
    return <MissionResult module={mod} data={data} colors={colors} score={score} max={max} items={items} onRetry={restart} onModule={onModule} />;
  }

  const { sit, step } = current;
  const chosen = picked !== null ? step.options[picked] : null;
  const isLastStep = idx === flat.length - 1;

  function choose(optionIndex: number) {
    if (picked !== null) return;
    setPicked(optionIndex);
    setPicks(p => { const n = p.slice(0, idx); n[idx] = optionIndex; return n; });
  }

  function next() {
    if (isLastStep) {
      const finalScore = picks.reduce((n, p, i) => n + flat[i].step.options[p].points, 0);
      update(withMissionResult(data, mission.id, finalScore, max));
      setFinished(true);
    } else {
      setIdx(idx + 1);
      setPicked(null);
    }
  }

  return (
    <>
      <Text style={[st.eyebrow, { color: GREEN }]}>DECISÃO {idx + 1} DE {flat.length}</Text>
      <Bar value={(idx + (picked !== null ? 1 : 0)) / flat.length} track={colors.border} fill={GREEN} />
      <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[st.cardTitle, { color: colors.text }]}>{sit.title}</Text>
        <Text style={[st.reading, { color: colors.text }]}>{fill(sit.context)}</Text>
        {sit.items?.map(it => <Text key={it} style={[st.reading, { color: colors.text }]}>• {it}</Text>)}
      </View>

      <View style={[st.card, { backgroundColor: colors.card, borderColor: BLUE }]}>
        <Text style={[st.eyebrow, { color: GREEN }]}>{step.concept.toUpperCase()}</Text>
        <Text style={[st.question, { color: colors.text }]}>{fill(step.prompt)}</Text>
        {order.map(i => {
          const o = step.options[i];
          const isPicked = picked === i;
          const showBest = picked !== null && o.points === 2;
          const show = isPicked || showBest;
          const t = show ? tone(dark, o.points === 2) : null;
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              disabled={picked !== null}
              onPress={() => choose(i)}
              style={[st.option, { backgroundColor: t ? t.bg : colors.bg, borderColor: t ? t.border : colors.border }]}
            >
              <Text style={[st.optionText, { color: colors.text }]}>{fill(o.text)}</Text>
              {show && <Text style={{ color: o.points === 2 ? GREEN : '#a9780b', fontWeight: '800' }}>{o.points === 2 ? '✓' : '↻'}</Text>}
            </Pressable>
          );
        })}
        {chosen && (
          <View style={[st.feedback, { backgroundColor: tone(dark, chosen.points === 2).bg, borderColor: tone(dark, chosen.points === 2).border }]}>
            <Text style={[st.feedbackTitle, { color: colors.text }]}>
              {chosen.points === 2 ? 'Boa decisão!' : chosen.points === 1 ? 'Razoável, mas há uma opção melhor' : 'Vamos rever esta decisão'}
            </Text>
            <Text style={[st.reading, { color: colors.text }]}>{fill(chosen.feedback)}</Text>
          </View>
        )}
      </View>
      {chosen && <Primary label={isLastStep ? 'Ver resultado' : 'Seguinte'} onPress={next} />}
    </>
  );
}

/* -------- Missão de orçamento (módulo 2) -------- */

type BudgetPhase = 'intro' | 'plan' | 'planFeedback' | 'unexpected' | 'unexpectedFeedback' | 'result';

function BudgetMissionView({ module: mod, mission, data, dark, colors, update, onModule }: CommonProps & { module: Module; mission: BudgetMission; onModule: () => void }) {
  const zero = useMemo(() => Object.fromEntries(mission.categories.map(c => [c.key, 0])) as Allocation, [mission]);
  const [phase, setPhase] = useState<BudgetPhase>('intro');
  const [alloc, setAlloc] = useState<Allocation>(zero);
  const [choice, setChoice] = useState<number | null>(null);

  const total = Object.values(alloc).reduce((n, v) => n + v, 0);
  const remaining = mission.income - total;
  const plan = useMemo(() => evaluateAllocation(mission, alloc), [mission, alloc]);
  const unexpectedPoints = choice !== null ? mission.unexpected.options[choice].points(alloc) : 0;

  const bump = (key: string, delta: number) =>
    setAlloc(a => {
      const room = mission.income - Object.values(a).reduce((n, v) => n + v, 0);
      const change = delta > 0 ? Math.min(delta, room) : -Math.min(-delta, a[key]);
      return { ...a, [key]: a[key] + change };
    });

  function restart() { setAlloc(zero); setChoice(null); setPhase('plan'); }

  function finish() {
    update(withMissionResult(data, mission.id, plan.points + unexpectedPoints, missionMaxScore(mission)));
    setPhase('result');
  }

  if (phase === 'intro') {
    return (
      <>
        <Text style={[st.eyebrow, { color: GREEN }]}>MISSÃO FINAL · {mod.title.toUpperCase()}</Text>
        <Text style={[st.title, { color: colors.text }]}>{mission.title}</Text>
        <Text style={[st.body, { color: colors.muted }]}>{mission.intro}</Text>
        <Text style={[st.note, { color: colors.muted }]}>Sem penalizações: o feedback mostra as prioridades e como ajustar o orçamento.</Text>
        <Primary label="Começar a missão" onPress={() => setPhase('plan')} />
      </>
    );
  }

  if (phase === 'plan' || phase === 'planFeedback') {
    const locked = phase === 'planFeedback';
    return (
      <>
        <Text style={[st.eyebrow, { color: GREEN }]}>PASSO 1 DE 2 · O TEU ORÇAMENTO</Text>
        <View style={[st.hero, { marginBottom: 12 }]}>
          <Text style={st.heroLabel}>RENDIMENTO DO PERÍODO</Text>
          <Text style={st.heroValue}>{kz(mission.income)}</Text>
          <Text style={[st.heroFoot, remaining === 0 && { color: GOLD, fontWeight: '800' }]}>
            {remaining === 0 ? 'Tudo distribuído: o total é exactamente o dinheiro disponível.' : `Por distribuir: ${kz(remaining)}`}
          </Text>
        </View>
        <Text style={[st.note, { color: colors.muted }]}>
          Distribui os {kz(mission.income)} pelas categorias, sem ultrapassar o total. Considera primeiro as necessidades essenciais e, sempre que possível, prevê lazer, poupança e imprevistos.
        </Text>

        {mission.categories.map(c => (
          <View key={c.key} style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={st.row}>
              <Text style={st.moduleIcon}>{c.icon}</Text>
              <View style={st.flex}>
                <Text style={[st.cardTitle, { color: colors.text }]}>{c.label}</Text>
                <Text style={[st.small, { color: colors.muted }]}>{c.hint}</Text>
              </View>
              <Text style={[st.amount, { color: colors.text }]}>{kz(alloc[c.key])}</Text>
            </View>
            {!locked && (
              <View style={st.stepper}>
                {[-2000, -mission.step, mission.step, 2000].map(d => (
                  <Pressable
                    key={d}
                    accessibilityRole="button"
                    accessibilityLabel={`${d > 0 ? 'Adicionar' : 'Retirar'} ${kz(Math.abs(d))} a ${c.label}`}
                    onPress={() => bump(c.key, d)}
                    style={[st.stepBtn, { borderColor: colors.border, backgroundColor: colors.bg }]}
                  >
                    <Text style={{ color: colors.text, fontWeight: '700', fontSize: 12 }}>{d > 0 ? '+' : '−'}{String(Math.abs(d)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</Text>
                  </Pressable>
                ))}
              </View>
            )}
          </View>
        ))}

        {phase === 'plan' && (
          <>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ disabled: remaining !== 0 }}
              disabled={remaining !== 0}
              onPress={() => setPhase('planFeedback')}
              style={[st.primary, remaining !== 0 && { opacity: 0.4 }]}
            >
              <Text style={st.primaryText}>{remaining === 0 ? 'Confirmar orçamento' : `Distribui mais ${kz(remaining)} para confirmar`}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={() => setAlloc(zero)} style={st.ghost}>
              <Text style={{ color: GREEN, fontWeight: '700' }}>Limpar distribuição</Text>
            </Pressable>
          </>
        )}

        {phase === 'planFeedback' && (
          <>
            <View style={[st.feedback, { backgroundColor: tone(dark, plan.points === 2).bg, borderColor: tone(dark, plan.points === 2).border }]}>
              <Text style={[st.feedbackTitle, { color: colors.text }]}>
                {plan.points === 2 ? 'Plano equilibrado!' : plan.points === 1 ? 'Bom começo, com pontos a melhorar' : 'Vamos rever as prioridades'}
              </Text>
              {plan.notes.map(n => <Text key={n} style={[st.reading, { color: colors.text }]}>• {n}</Text>)}
            </View>
            <Primary label="Continuar: surge um imprevisto" onPress={() => setPhase('unexpected')} />
            <Pressable accessibilityRole="button" onPress={() => setPhase('plan')} style={st.ghost}>
              <Text style={{ color: GREEN, fontWeight: '700' }}>Ajustar o orçamento</Text>
            </Pressable>
          </>
        )}
      </>
    );
  }

  if (phase === 'unexpected' || phase === 'unexpectedFeedback') {
    const u = mission.unexpected;
    const chosen = choice !== null ? u.options[choice] : null;
    return (
      <>
        <Text style={[st.eyebrow, { color: GREEN }]}>PASSO 2 DE 2 · UM IMPREVISTO</Text>
        <View style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[st.cardTitle, { color: colors.text }]}>O teu orçamento</Text>
          <Text style={[st.small, { color: colors.muted }]}>
            {mission.categories.map(c => `${c.label}: ${kz(alloc[c.key])}`).join(' · ')}
          </Text>
        </View>
        <View style={[st.card, { backgroundColor: colors.card, borderColor: BLUE }]}>
          <Text style={[st.reading, { color: colors.text }]}>{u.context}</Text>
          <Text style={[st.question, { color: colors.text }]}>{u.prompt}</Text>
          {u.options.map((o, i) => {
            const isPicked = choice === i;
            const t = isPicked ? tone(dark, o.points(alloc) === 2) : null;
            return (
              <Pressable
                key={o.text}
                accessibilityRole="button"
                disabled={choice !== null}
                onPress={() => { setChoice(i); setPhase('unexpectedFeedback'); }}
                style={[st.option, { backgroundColor: t ? t.bg : colors.bg, borderColor: t ? t.border : colors.border }]}
              >
                <Text style={[st.optionText, { color: colors.text }]}>{o.text}</Text>
              </Pressable>
            );
          })}
          {chosen && (
            <View style={[st.feedback, { backgroundColor: tone(dark, unexpectedPoints === 2).bg, borderColor: tone(dark, unexpectedPoints === 2).border }]}>
              <Text style={[st.feedbackTitle, { color: colors.text }]}>
                {unexpectedPoints === 2 ? 'Boa adaptação!' : unexpectedPoints === 1 ? 'Funciona, mas pode melhorar' : 'Vamos rever esta decisão'}
              </Text>
              <Text style={[st.reading, { color: colors.text }]}>{chosen.feedback(alloc)}</Text>
            </View>
          )}
        </View>
        {chosen && <Primary label="Ver resultado" onPress={finish} />}
      </>
    );
  }

  const items: ReviewItem[] = [
    { concept: 'Necessidades essenciais primeiro', ok: plan.essentialsCovered, review: 'Cobre primeiro transporte, alimentação, educação e comunicação, que são compromissos essenciais.' },
    { concept: 'Poupança e reserva para imprevistos', ok: plan.hasReserves, review: 'Sempre que possível, prevê uma parte para poupança e outra para imprevistos, mesmo pequenas.' },
    { concept: mission.unexpected.concept, ok: unexpectedPoints === 2, review: mission.unexpected.review },
  ];
  return <MissionResult module={mod} data={data} colors={colors} score={plan.points + unexpectedPoints} max={missionMaxScore(mission)} items={items} onRetry={restart} onModule={onModule} />;
}

/* ------------------------------------------------------------------ */
/* Pequenos componentes e estilos                                      */
/* ------------------------------------------------------------------ */

function Primary({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" style={st.primary} onPress={onPress}>
      <Text style={st.primaryText}>{label}</Text>
    </Pressable>
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
  hero: { backgroundColor: BLUE, borderRadius: 24, padding: 22, marginBottom: 14 },
  heroLabel: { color: '#aebfd4', fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  heroValue: { color: '#fff', fontSize: 24, fontWeight: '800', marginVertical: 8 },
  heroFoot: { color: '#aebfd4', fontSize: 12, lineHeight: 18 },
  heroStats: { flexDirection: 'row', marginTop: 10 },
  stat: { flex: 1 },
  statValue: { color: '#fff', fontSize: 18, fontWeight: '800' },
  statLabel: { color: '#aebfd4', fontSize: 11 },
  medals: { flexDirection: 'row', gap: 10, marginTop: 14 },
  medal: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#23497f', alignItems: 'center', justifyContent: 'center' },
  medalIcon: { fontSize: 20, color: '#aebfd4' },
  note: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  card: { borderRadius: 18, borderWidth: 1, padding: 17, marginBottom: 10, gap: 8 },
  moduleIcon: { fontSize: 26 },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  small: { fontSize: 12, lineHeight: 18 },
  title: { fontSize: 25, fontWeight: '800', marginTop: 4, marginBottom: 8 },
  body: { fontSize: 15, lineHeight: 23, marginBottom: 12 },
  section: { fontSize: 18, fontWeight: '800', marginTop: 18, marginBottom: 10 },
  reading: { fontSize: 15, lineHeight: 23 },
  question: { fontSize: 17, fontWeight: '700', lineHeight: 24 },
  badge: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  option: { borderWidth: 1.5, borderRadius: 14, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  optionText: { flex: 1, fontSize: 15, lineHeight: 21 },
  feedback: { borderWidth: 1.5, borderRadius: 14, padding: 14, gap: 6 },
  feedbackTitle: { fontSize: 15, fontWeight: '800' },
  primary: { backgroundColor: BLUE, borderRadius: 14, padding: 16, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '800', textAlign: 'center' },
  ghost: { padding: 16, alignItems: 'center' },
  bar: { height: 7, borderRadius: 10, overflow: 'hidden', marginVertical: 6 },
  barFill: { height: '100%', borderRadius: 10 },
  amount: { fontSize: 15, fontWeight: '800' },
  stepper: { flexDirection: 'row', gap: 8, justifyContent: 'space-between' },
  stepBtn: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
});
