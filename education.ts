import { AppData } from './types';

/* ------------------------------------------------------------------ */
/* Tipos                                                               */
/* ------------------------------------------------------------------ */

export type Challenge = {
  kind: 'quiz' | 'scenario';
  question: string;
  /** A primeira opção é sempre a resposta esperada; a ordem é baralhada na app. */
  options: string[];
  answer: number;
  feedback: string;
};

export type Topic = {
  id: string;
  title: string;
  content: string;
  challenge: Challenge;
};

export type MissionOption = {
  text: string;
  /** 2 = decisão mais adequada, 1 = aceitável com ressalvas, 0 = a rever. Nunca penaliza. */
  points: 0 | 1 | 2;
  feedback: string;
  /** Se existir e o passo tiver `capture`, o valor fica disponível como {capture} nos textos seguintes. */
  value?: string;
};

export type MissionStep = {
  concept: string;
  /** Dica curta mostrada no resumo quando o conceito merece revisão. */
  review: string;
  prompt: string;
  capture?: string;
  options: MissionOption[];
};

export type Situation = {
  title: string;
  context: string;
  items?: string[];
  steps: MissionStep[];
};

export type DecisionMission = {
  kind: 'decisions';
  id: string;
  title: string;
  intro: string;
  situations: Situation[];
};

export type Allocation = Record<string, number>;

export type BudgetCategory = {
  key: string;
  label: string;
  icon: string;
  hint: string;
  /** Valor previsto para despesas essenciais; ausente nas restantes categorias. */
  need?: number;
};

export type BudgetMission = {
  kind: 'budget';
  id: string;
  title: string;
  intro: string;
  income: number;
  step: number;
  categories: BudgetCategory[];
  unexpected: {
    context: string;
    prompt: string;
    concept: string;
    review: string;
    options: { text: string; points: (a: Allocation) => 0 | 1 | 2; feedback: (a: Allocation) => string }[];
  };
};

export type Mission = DecisionMission | BudgetMission;

export type Module = {
  id: string;
  number: number;
  title: string;
  icon: string;
  objective: string;
  topics: Topic[];
  mission: Mission;
};

/* ------------------------------------------------------------------ */
/* Utilitários                                                         */
/* ------------------------------------------------------------------ */

export const kz = (n: number) => `${String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, '.')} Kz`;

/* ------------------------------------------------------------------ */
/* Conteúdos                                                           */
/* ------------------------------------------------------------------ */

const modulo1: Module = {
  id: 'm1',
  number: 1,
  title: 'Conceitos Básicos',
  icon: '💡',
  objective: 'Compreender conceitos essenciais e reconhecer como as escolhas do dia a dia influenciam a vida financeira.',
  topics: [
    {
      id: 'm1-t1',
      title: 'O que é educação financeira?',
      content:
        'Educação financeira é o conjunto de conhecimentos e hábitos que nos ajudam a tomar decisões informadas sobre o dinheiro. Não significa apenas poupar ou deixar de gastar: significa compreender as opções disponíveis, considerar as consequências e escolher de acordo com as nossas necessidades e objectivos. Aprender a gerir dinheiro pode ajudar-nos a planear despesas, evitar decisões precipitadas e preparar o futuro.',
      challenge: {
        kind: 'quiz',
        question: 'Qual é o principal objectivo da educação financeira?',
        options: [
          'Ajudar a tomar decisões conscientes sobre o dinheiro',
          'Ensinar a nunca gastar dinheiro em lazer',
          'Ensinar apenas a investir em produtos financeiros',
        ],
        answer: 0,
        feedback: 'A educação financeira ajuda a compreender opções e consequências para gerir o dinheiro de forma informada.',
      },
    },
    {
      id: 'm1-t2',
      title: 'Rendimentos, despesas e saldo',
      content:
        'Rendimento é o dinheiro que recebemos, por exemplo, através de salário, bolsa de estudo, mesada, apoio familiar ou pequenos trabalhos. Despesa é o dinheiro que utilizamos para pagar bens e serviços, como transporte, alimentação ou comunicação. O saldo é a diferença entre o dinheiro disponível e o que foi gasto. Conhecer estes valores ajuda a perceber a nossa situação financeira.',
      challenge: {
        kind: 'quiz',
        question: 'Recebeste 20.000 Kz e gastaste 12.000 Kz. Sem considerar outras entradas ou saídas, qual é o saldo que resta?',
        options: ['8.000 Kz', '12.000 Kz', '32.000 Kz'],
        answer: 0,
        feedback: '20.000 Kz menos 12.000 Kz corresponde a 8.000 Kz.',
      },
    },
    {
      id: 'm1-t3',
      title: 'Necessidades, desejos e prioridades',
      content:
        'Necessidades são coisas importantes para a vida, a saúde, a segurança ou os estudos. Desejos são coisas que gostaríamos de ter ou fazer, mas que podem esperar. A diferença depende também da situação de cada pessoa: algo essencial para um estudante pode não ser essencial para outro. Antes de gastar, vale a pena perguntar: preciso disto agora? É uma prioridade? Que consequência terá esta compra para os meus outros objectivos?',
      challenge: {
        kind: 'scenario',
        question: 'Tens dinheiro suficiente para comprar material necessário para uma aula ou um acessório de que gostas. O que deves considerar primeiro?',
        options: [
          'As necessidades e as consequências de cada escolha',
          'Comprar o acessório porque te dá satisfação imediata',
          'Escolher sempre o artigo mais caro',
        ],
        answer: 0,
        feedback: 'A decisão deve considerar a situação, as prioridades e o impacto sobre outras despesas. Isso não significa que os desejos nunca possam ser satisfeitos.',
      },
    },
    {
      id: 'm1-t4',
      title: 'Hábitos financeiros e tomada de decisões',
      content:
        'Os hábitos financeiros são comportamentos repetidos relacionados com o dinheiro, como comparar preços, registar despesas ou comprar sem planear. As emoções, a publicidade e a influência dos amigos podem afectar as decisões. Uma pausa antes de comprar, a definição de limites e a comparação de alternativas ajudam a decidir com mais consciência. O objectivo não é fazer sempre a escolha perfeita, mas aprender com as escolhas feitas.',
      challenge: {
        kind: 'scenario',
        question: 'Costumas gastar mais quando sais com amigos e, por vezes, ficas com pouco dinheiro para o resto da semana. Que estratégia pode ajudar?',
        options: [
          'Definir antecipadamente um limite de gastos e escolher dentro desse limite',
          'Levar todo o dinheiro disponível para poder gastar sem pensar',
          'Ignorar as despesas até ao fim da semana',
        ],
        answer: 0,
        feedback: 'Pensar antecipadamente num limite ajuda a tomar decisões com menos pressão e a reservar dinheiro para outras necessidades.',
      },
    },
  ],
  mission: {
    kind: 'decisions',
    id: 'm1-mission',
    title: 'Decisões com Dinheiro',
    intro:
      'Vais percorrer três situações do quotidiano. Em cada uma, identificas rendimentos e despesas, distingues uma necessidade de um desejo e escolhes uma forma consciente de reagir a uma influência social. No fim, recebes um resumo dos conceitos que demonstraste compreender.',
    situations: [
      {
        title: 'Situação 1 — O início do mês',
        context: 'Este mês recebeste uma bolsa de estudo de 25.000 Kz e 5.000 Kz de apoio familiar. Já pagaste 6.000 Kz de transporte e 9.000 Kz de alimentação.',
        steps: [
          {
            concept: 'Rendimentos e despesas',
            review: 'Rendimento é dinheiro que entra (bolsa, salário, mesada, apoio familiar). Despesa é dinheiro que sai.',
            prompt: 'Quais destes valores são rendimentos?',
            options: [
              { text: 'A bolsa de estudo e o apoio familiar', points: 2, feedback: 'Ambos são entradas de dinheiro. O transporte e a alimentação são despesas.' },
              { text: 'Apenas a bolsa de estudo', points: 1, feedback: 'A bolsa é um rendimento, mas o apoio familiar também é uma entrada de dinheiro.' },
              { text: 'O transporte e a alimentação', points: 0, feedback: 'O transporte e a alimentação são despesas: dinheiro que sai, não que entra.' },
            ],
          },
          {
            concept: 'Saldo',
            review: 'O saldo resulta de subtrair as despesas ao dinheiro recebido.',
            prompt: 'Sem considerar outras entradas ou saídas, qual é o saldo que resta?',
            options: [
              { text: '15.000 Kz', points: 2, feedback: 'Recebeste 30.000 Kz (25.000 + 5.000) e gastaste 15.000 Kz (6.000 + 9.000). O saldo é 15.000 Kz.' },
              { text: '30.000 Kz', points: 0, feedback: 'Esse valor é só o que recebeste. Falta subtrair as despesas de 15.000 Kz.' },
              { text: '45.000 Kz', points: 0, feedback: 'As despesas subtraem-se ao rendimento, não se somam. 30.000 − 15.000 = 15.000 Kz.' },
            ],
          },
        ],
      },
      {
        title: 'Situação 2 — Material ou acessório?',
        context:
          'Esta semana tens 12.000 Kz disponíveis. Precisas de um caderno (1.500 Kz) e de uma calculadora (4.500 Kz) para as aulas. Vês também uma capa colorida para o telemóvel (7.000 Kz) de que gostas muito.',
        steps: [
          {
            concept: 'Necessidades e desejos',
            review: 'Necessidades são importantes para a vida, a saúde, a segurança ou os estudos; desejos podem esperar. Depende da situação de cada pessoa.',
            prompt: 'Neste contexto, o que é uma necessidade para os teus estudos?',
            options: [
              { text: 'O caderno e a calculadora para as aulas', points: 2, feedback: 'São necessários para os estudos. A capa é um desejo: podes gostar dela, mas pode esperar.' },
              { text: 'Todos os artigos, porque todos me dão satisfação', points: 1, feedback: 'Satisfação não é o mesmo que necessidade. Pergunta: preciso disto agora? Pode esperar?' },
              { text: 'A capa colorida do telemóvel', points: 0, feedback: 'A capa é um desejo. O material das aulas tem prioridade porque está ligado aos estudos.' },
            ],
          },
          {
            concept: 'Prioridades',
            review: 'Quando o dinheiro não chega para tudo, as necessidades vêm primeiro e os desejos podem ser adiados.',
            prompt: 'Os três artigos custam 13.000 Kz e tens 12.000 Kz. O que fazes?',
            options: [
              { text: 'Compro o material necessário e adio a capa até haver dinheiro disponível', points: 2, feedback: 'Garantiste a necessidade e respeitaste o dinheiro disponível. Adiar não é renunciar: a capa pode caber noutra semana.' },
              { text: 'Não compro nada, mesmo precisando do material para as aulas', points: 1, feedback: 'Evitar gastar parece seguro, mas o material é uma necessidade e cabe nos 12.000 Kz.' },
              { text: 'Compro tudo e peço o que falta sem planear como pagar', points: 0, feedback: 'Assumir um gasto que o dinheiro disponível não cobre pode prejudicar outras despesas. Prioriza antes de gastar.' },
            ],
          },
        ],
      },
      {
        title: 'Situação 3 — Saída com os amigos',
        context: 'Os teus amigos convidam-te para um lanche fora depois das aulas. Ainda tens de pagar o transporte dos próximos dias e sabes que costumas gastar mais quando estás em grupo.',
        steps: [
          {
            concept: 'Influência social',
            review: 'Definir um limite antes de sair ajuda a decidir com menos pressão dos amigos.',
            prompt: 'Qual é uma forma consciente de reagir?',
            options: [
              { text: 'Definir antecipadamente quanto posso gastar e escolher dentro desse limite', points: 2, feedback: 'Um limite definido antes ajuda-te a participar sem comprometer o transporte e outras necessidades.' },
              { text: 'Recusar sempre qualquer convite para nunca gastar dinheiro', points: 1, feedback: 'Recusar pode ser uma opção às vezes, mas o lazer também pode ser planeado dentro do orçamento.' },
              { text: 'Aceitar e gastar o que for preciso para não ficar de fora', points: 0, feedback: 'Seguir o grupo sem limite pode deixar-te sem dinheiro para o transporte. Há alternativas.' },
            ],
          },
          {
            concept: 'Aprender com as escolhas',
            review: 'Registar e analisar os gastos permite aprender e melhorar; o objectivo não é a escolha perfeita.',
            prompt: 'No fim da semana percebes que gastaste um pouco mais do que o limite. O que fazes?',
            options: [
              { text: 'Registo o gasto, percebo a causa e ajusto o limite ou a estratégia para a próxima vez', points: 2, feedback: 'O desvio é informação útil. Compreender a causa permite melhorar nas próximas decisões.' },
              { text: 'Concluo que não consigo gerir dinheiro e desisto', points: 0, feedback: 'Um desvio pequeno não significa fracasso. Os hábitos melhoram com a prática.' },
              { text: 'Ignoro o assunto e não registo nada', points: 0, feedback: 'Sem registo não há aprendizagem. Olhar para o que aconteceu ajuda a decidir melhor.' },
            ],
          },
        ],
      },
    ],
  },
};

const modulo2: Module = {
  id: 'm2',
  number: 2,
  title: 'Orçamento',
  icon: '📒',
  objective: 'Planear como o dinheiro será utilizado, acompanhar as despesas e ajustar o plano à realidade.',
  topics: [
    {
      id: 'm2-t1',
      title: 'O que é um orçamento?',
      content:
        'Um orçamento é um plano para organizar o dinheiro disponível durante determinado período. Ajuda a saber quanto dinheiro entra, quanto pode ser gasto, onde será utilizado e quanto pode ser reservado para objectivos futuros. Orçamentar não é deixar de gastar: é decidir para onde o dinheiro deve ir antes de o gastar. O orçamento deve ser realista e adaptado à situação de cada pessoa.',
      challenge: {
        kind: 'quiz',
        question: 'Para que serve principalmente um orçamento?',
        options: [
          'Planear a utilização do dinheiro e acompanhar entradas e despesas',
          'Impedir qualquer gasto em lazer',
          'Garantir que nunca haverá despesas inesperadas',
        ],
        answer: 0,
        feedback: 'Um orçamento é uma ferramenta de planeamento; não elimina imprevistos nem proíbe todo o lazer.',
      },
    },
    {
      id: 'm2-t2',
      title: 'Identificar rendimentos e despesas',
      content:
        'O primeiro passo é identificar todas as fontes de dinheiro disponíveis no período: bolsa de estudo, salário, mesada, apoio familiar, trabalhos ocasionais ou pequenos negócios. Depois, convém listar as despesas habituais, como educação, transporte, alimentação, internet, cuidados pessoais, lazer e outros compromissos. Registar estas informações ajuda a perceber de onde vem o dinheiro e para onde vai.',
      challenge: {
        kind: 'quiz',
        question: 'Qual das opções é um exemplo de rendimento?',
        options: [
          'Dinheiro recebido através de uma bolsa de estudo',
          'Pagamento do transporte para a escola',
          'Compra de um lanche',
        ],
        answer: 0,
        feedback: 'A bolsa de estudo é uma entrada de dinheiro; o transporte e o lanche são despesas.',
      },
    },
    {
      id: 'm2-t3',
      title: 'Distribuir o dinheiro e definir prioridades',
      content:
        'Depois de conhecer os rendimentos e as despesas, distribui-se o dinheiro pelas diferentes categorias. É importante considerar primeiro os compromissos essenciais, mas também prever lazer, poupança e imprevistos sempre que possível. Por exemplo, com 50.000 Kz disponíveis, pode criar-se um plano que distribua o total entre transporte, alimentação, educação, comunicação, lazer, poupança e imprevistos. Os valores devem reflectir as necessidades reais e somar exactamente o dinheiro disponível.',
      challenge: {
        kind: 'scenario',
        question: 'Tens 30.000 Kz para o período e despesas prioritárias. Qual é a melhor forma de começar a distribuir o dinheiro?',
        options: [
          'Identificar as despesas essenciais e distribuir o valor disponível sem ultrapassar 30.000 Kz',
          'Gastar primeiro em desejos e ver depois o que sobra',
          'Planear despesas num total de 35.000 Kz, mesmo tendo apenas 30.000 Kz',
        ],
        answer: 0,
        feedback: 'Um orçamento deve respeitar o dinheiro disponível e considerar as prioridades antes de assumir gastos adicionais.',
      },
    },
    {
      id: 'm2-t4',
      title: 'Registar, avaliar e ajustar o orçamento',
      content:
        'Um orçamento precisa de ser comparado com o que realmente aconteceu. Registar as despesas, mesmo as pequenas, permite descobrir diferenças entre o planeado e o gasto. Se o plano previa 12.000 Kz para alimentação, mas foram gastos 15.000 Kz, é útil investigar a diferença de 3.000 Kz: os preços mudaram, houve uma necessidade imprevista ou várias compras pequenas acumularam-se? O orçamento pode ser ajustado à medida que aprendemos.',
      challenge: {
        kind: 'scenario',
        question: 'Planeaste gastar 8.000 Kz em alimentação, mas gastaste 10.000 Kz. O que deves fazer?',
        options: [
          'Analisar a diferença, perceber a causa e ajustar o orçamento se necessário',
          'Apagar o registo para o orçamento parecer correcto',
          'Abandonar o orçamento porque não correu como previsto',
        ],
        answer: 0,
        feedback: 'Comparar o plano com a realidade permite aprender e melhorar o orçamento. Um desvio é informação útil, não motivo para abandonar o plano.',
      },
    },
  ],
  mission: {
    kind: 'budget',
    id: 'm2-mission',
    title: 'O Dinheiro Tem um Plano',
    intro:
      'Recebes um rendimento fictício de 30.000 Kz e uma lista de despesas. Distribui o dinheiro sem ultrapassar o total e, depois, responde a uma situação inesperada. O feedback explica as prioridades e o ajuste do orçamento.',
    income: 30000,
    step: 500,
    categories: [
      { key: 'transporte', label: 'Transporte', icon: '🚌', hint: 'Previsto para este período: 6.000 Kz', need: 6000 },
      { key: 'alimentacao', label: 'Alimentação', icon: '🍲', hint: 'Previsto para este período: 10.000 Kz', need: 10000 },
      { key: 'educacao', label: 'Educação', icon: '📚', hint: 'Material de estudo previsto: 4.000 Kz', need: 4000 },
      { key: 'comunicacao', label: 'Comunicação', icon: '📱', hint: 'Dados móveis previstos: 2.000 Kz', need: 2000 },
      { key: 'lazer', label: 'Lazer', icon: '🎮', hint: 'Não é obrigatório, mas ajuda a manter o plano realista' },
      { key: 'poupanca', label: 'Poupança', icon: '🌱', hint: 'Para um objectivo futuro' },
      { key: 'imprevistos', label: 'Imprevistos', icon: '🛟', hint: 'Reserva para despesas não planeadas' },
    ],
    unexpected: {
      context: 'A meio do período, o ecrã do teu telemóvel parte. A reparação custa 3.000 Kz e não estava no plano.',
      prompt: 'Como reages ao imprevisto?',
      concept: 'Ajustar o orçamento',
      review: 'Um orçamento adapta-se: usa a reserva para imprevistos e, se não chegar, ajusta categorias não essenciais.',
      options: [
        {
          text: 'Uso o valor reservado para imprevistos',
          points: a => (a.imprevistos >= 3000 ? 2 : a.imprevistos > 0 ? 1 : 0),
          feedback: a =>
            a.imprevistos >= 3000
              ? 'Foi para isto que reservaste dinheiro. O imprevisto fica coberto sem mexer nas outras categorias.'
              : a.imprevistos > 0
              ? `A tua reserva (${kz(a.imprevistos)}) ajuda, mas não cobre os 3.000 Kz. Usa-a e ajusta uma categoria não essencial, como o lazer, para o resto.`
              : 'Não reservaste dinheiro para imprevistos, por isso esta opção não está disponível no teu plano. Da próxima vez, reserva uma parte, mesmo pequena.',
        },
        {
          text: 'Reduzo o lazer e adio despesas não essenciais para cobrir a reparação',
          points: a => {
            const falta = Math.max(0, 3000 - a.imprevistos);
            return falta === 0 ? 1 : a.lazer >= falta ? 2 : 1;
          },
          feedback: a => {
            const falta = Math.max(0, 3000 - a.imprevistos);
            if (falta === 0) return 'Funciona, mas já tinhas uma reserva para imprevistos. Usá-la primeiro permite manter o lazer planeado.';
            if (a.lazer >= falta) return `Boa adaptação: o lazer (${kz(a.lazer)}) cobre os ${kz(falta)} que a reserva não chega a cobrir. O orçamento ajustou-se sem tocar nas necessidades.`;
            return 'Reduzir o lazer ajuda, mas no teu plano não chega para cobrir a reparação. Seria preciso também adiar outras despesas não essenciais.';
          },
        },
        {
          text: 'Retiro o dinheiro da alimentação ou do transporte',
          points: () => 0,
          feedback: () => 'A alimentação e o transporte são necessidades essenciais. Reduzi-los pode afectar a tua saúde e os teus estudos. Procura primeiro a reserva ou categorias não essenciais.',
        },
        {
          text: 'Ignoro a avaria e mantenho o orçamento como está',
          points: () => 0,
          feedback: () => 'Ignorar o imprevisto não o resolve. Um orçamento deve ser ajustado à realidade.',
        },
      ],
    },
  },
};

const modulo3: Module = {
  id: 'm3',
  number: 3,
  title: 'Poupança',
  icon: '🌱',
  objective: 'Compreender a importância de poupar, definir objectivos realistas e desenvolver hábitos sustentáveis.',
  topics: [
    {
      id: 'm3-t1',
      title: 'Poupar com um objectivo',
      content:
        'Poupar não é apenas guardar dinheiro: é reservar uma parte do que recebemos para uma finalidade. O objectivo pode ser criar uma reserva para imprevistos, pagar uma formação, comprar um computador ou realizar outro plano importante. Um objectivo claro ajuda a perceber por que vale a pena guardar dinheiro e permite acompanhar o progresso. Os objectivos podem ser diferentes de pessoa para pessoa.',
      challenge: {
        kind: 'quiz',
        question: 'Qual é um exemplo de objectivo de poupança definido com uma finalidade?',
        options: [
          'Reservar dinheiro para pagar uma formação futura',
          'Guardar dinheiro sem saber para que poderá servir',
          'Gastar o dinheiro assim que fica disponível',
        ],
        answer: 0,
        feedback: 'Um objectivo concreto liga a poupança a uma decisão futura e facilita o acompanhamento do progresso.',
      },
    },
    {
      id: 'm3-t2',
      title: 'Criar o hábito de poupar',
      content:
        'Esperar apenas pelo dinheiro que sobra no fim do mês pode dificultar a poupança. Quando for possível, ajuda definir antecipadamente um valor realista e separá-lo depois de receber o rendimento, sem deixar de cobrir as necessidades essenciais. Não existe um valor único adequado a todas as pessoas: o importante é escolher uma quantia compatível com os rendimentos e compromissos e rever o plano quando a situação muda.',
      challenge: {
        kind: 'scenario',
        question: 'Recebeste o teu rendimento e queres começar a poupar. Qual é uma estratégia razoável?',
        options: [
          'Definir um valor realista depois de considerar as necessidades essenciais',
          'Reservar uma quantia que te impeça de pagar despesas essenciais',
          'Esperar sempre pelo fim do mês sem acompanhar os gastos',
        ],
        answer: 0,
        feedback: 'Uma estratégia sustentável tem em conta a realidade financeira e não deve comprometer necessidades importantes.',
      },
    },
    {
      id: 'm3-t3',
      title: 'Emoções e influência social',
      content:
        'As decisões financeiras não são sempre tomadas de forma calculada. O estado emocional, a publicidade e o desejo de acompanhar os amigos podem levar-nos a gastar mais do que planeámos. Reconhecer essas influências permite fazer uma pausa, comparar a compra com os nossos objectivos e decidir sem pressão. Poupar não significa nunca sair ou comprar algo de que gostamos; significa equilibrar escolhas presentes e futuras.',
      challenge: {
        kind: 'scenario',
        question: 'Os teus amigos convidam-te para uma saída que não tinhas planeado. O que pode ajudar-te a decidir?',
        options: [
          'Verificar o dinheiro disponível, as prioridades e as alternativas antes de responder',
          'Aceitar imediatamente para não seres diferente dos amigos',
          'Usar o dinheiro reservado para uma despesa essencial sem pensar nas consequências',
        ],
        answer: 0,
        feedback: 'Considerar o orçamento e os objectivos permite decidir sem assumir que o lazer é sempre errado ou sempre prioritário.',
      },
    },
    {
      id: 'm3-t4',
      title: 'Estratégias para poupar e proteger o dinheiro',
      content:
        'Para tornar a poupança mais consistente, organiza o orçamento de acordo com a frequência com que recebes dinheiro, estima as despesas fixas e variáveis e define um valor possível para poupar. Também podes rever gastos não essenciais e escolher um local seguro e adequado para guardar o dinheiro. Produtos financeiros, como depósitos a prazo, têm condições próprias; antes de os utilizar, é importante compreender os prazos, as taxas, as condições de levantamento e os riscos aplicáveis.',
      challenge: {
        kind: 'quiz',
        question: 'O que deves fazer antes de escolher um produto financeiro para guardar as poupanças?',
        options: [
          'Compreender as condições, os prazos e as regras de acesso ao dinheiro',
          'Escolher apenas porque alguém disse que é a melhor opção',
          'Colocar todo o dinheiro sem verificar as condições',
        ],
        answer: 0,
        feedback: 'Conhecer as condições permite escolher uma opção adequada aos objectivos e à necessidade de acesso ao dinheiro.',
      },
    },
  ],
  mission: {
    kind: 'decisions',
    id: 'm3-mission',
    title: 'Objectivo: Poupar',
    intro:
      'Vais escolher um objectivo fictício, seleccionar um valor de poupança realista e enfrentar uma situação em que surge a tentação de gastar o dinheiro reservado. Escolhes uma estratégia e recebes feedback sobre a relação entre o objectivo, as necessidades e a decisão.',
    situations: [
      {
        title: 'Situação 1 — O teu plano de poupança',
        context: 'Imagina que recebes 30.000 Kz por período. Já reservaste 22.000 Kz para as necessidades essenciais (transporte, alimentação, educação e comunicação). Sobram 8.000 Kz.',
        steps: [
          {
            concept: 'Objectivo de poupança',
            review: 'Um objectivo concreto liga a poupança a uma finalidade e permite acompanhar o progresso.',
            prompt: 'Escolhe um objectivo fictício para esta missão.',
            capture: 'goal',
            options: [
              { text: 'Criar uma reserva para imprevistos', value: 'a reserva para imprevistos', points: 2, feedback: 'Uma reserva para imprevistos dá-te margem quando surgem despesas inesperadas.' },
              { text: 'Pagar uma formação', value: 'a formação', points: 2, feedback: 'Poupar para uma formação liga o dinheiro de hoje a uma decisão futura.' },
              { text: 'Comprar um computador', value: 'o computador', points: 2, feedback: 'Um artigo concreto permite calcular quanto falta e acompanhar o progresso.' },
            ],
          },
          {
            concept: 'Valor realista',
            review: 'O valor poupado deve ser compatível com os rendimentos e não comprometer as necessidades essenciais.',
            prompt: 'Quanto decides poupar para {goal} neste período?',
            options: [
              { text: '4.000 Kz — metade do que sobra, com margem para lazer e imprevistos', points: 2, feedback: 'Um valor realista deixa margem para o resto do período e é mais fácil de manter.' },
              { text: '2.000 Kz — um valor pequeno, fácil de manter', points: 2, feedback: 'Começar pequeno é válido e ajuda a criar o hábito. Podes aumentar quando a situação permitir.' },
              { text: '8.000 Kz — tudo o que sobra', points: 1, feedback: 'É possível, mas não deixa margem para lazer ou imprevistos. Um plano demasiado apertado é difícil de manter.' },
              { text: '12.000 Kz — mais do que sobra depois do essencial', points: 0, feedback: 'Este valor obrigaria a cortar necessidades essenciais. A poupança não deve comprometer o que é importante.' },
            ],
          },
        ],
      },
      {
        title: 'Situação 2 — A tentação',
        context: 'Uma semana depois, aparece uma promoção num telemóvel novo e vários amigos vão comprar. Para o comprares, terias de usar o dinheiro que reservaste para {goal}.',
        steps: [
          {
            concept: 'Emoções e influência social',
            review: 'Uma pausa para comparar a compra com o objectivo ajuda a decidir sem pressão.',
            prompt: 'O que fazes?',
            options: [
              { text: 'Faço uma pausa, comparo a compra com o meu objectivo e decido com base nas prioridades', points: 2, feedback: 'Reconheceste a pressão e voltaste ao objectivo. Podes decidir comprar ou não, mas com consciência das consequências.' },
              { text: 'Decido que nunca mais vou comprar nada de que goste', points: 1, feedback: 'Poupar não significa nunca comprar algo de que gostas. Trata-se de equilibrar escolhas presentes e futuras.' },
              { text: 'Uso o dinheiro reservado de imediato, porque a promoção pode acabar', points: 0, feedback: 'A urgência de uma promoção é uma pressão comum. Uma pausa permite ver se a compra faz sentido para ti.' },
            ],
          },
        ],
      },
      {
        title: 'Situação 3 — Onde guardar o dinheiro',
        context: 'Já tens algum dinheiro poupado e pensas colocá-lo num produto financeiro, como um depósito a prazo.',
        steps: [
          {
            concept: 'Proteger a poupança',
            review: 'Antes de usar um produto financeiro, compreende prazos, taxas, condições de levantamento e riscos.',
            prompt: 'O que deves fazer antes de decidir?',
            options: [
              { text: 'Compreender as condições, os prazos e as regras de acesso ao dinheiro', points: 2, feedback: 'Conhecer as condições permite escolher uma opção adequada ao teu objectivo e à necessidade de acesso ao dinheiro.' },
              { text: 'Escolher o que um conhecido recomendou, sem verificar as condições', points: 0, feedback: 'A recomendação de alguém pode ajudar, mas as condições têm de ser compreendidas por ti.' },
              { text: 'Colocar todo o dinheiro, mesmo que precises dele em breve', points: 0, feedback: 'Se o dinheiro ficar bloqueado e precisares dele, podes ter problemas. Confirma as regras de levantamento.' },
            ],
          },
        ],
      },
    ],
  },
};

const modulo4: Module = {
  id: 'm4',
  number: 4,
  title: 'Gastos e Despesas',
  icon: '🧾',
  objective: 'Reconhecer padrões de consumo, compreender o impacto dos microgastos e fazer compras de forma consciente.',
  topics: [
    {
      id: 'm4-t1',
      title: 'Necessidades, desejos e compras por impulso',
      content:
        'Uma necessidade é algo importante para a vida ou para cumprir responsabilidades; um desejo é algo que gostaríamos de ter, mas que pode esperar. Uma compra por impulso acontece quando decidimos comprar rapidamente, sem avaliar suficientemente a utilidade, o custo ou o impacto no nosso dinheiro. Antes de comprar, faz uma pausa e pergunta: preciso disto agora? Cabe no dinheiro disponível? Há uma alternativa melhor? Uma promoção não torna automaticamente uma compra necessária.',
      challenge: {
        kind: 'scenario',
        question: 'Vês um artigo em promoção e queres comprá-lo imediatamente, embora não o tenhas planeado. O que deves avaliar?',
        options: [
          'A utilidade, o custo e o impacto da compra no dinheiro disponível',
          'Apenas a percentagem de desconto anunciada',
          'Se os teus amigos também vão comprar o artigo',
        ],
        answer: 0,
        feedback: 'Uma promoção só é vantajosa se a compra fizer sentido para a pessoa e para a sua situação financeira.',
      },
    },
    {
      id: 'm4-t2',
      title: 'Microgastos e o seu impacto',
      content:
        'Microgastos são pequenas despesas que se repetem, como lanches, bebidas, pequenas compras ou outros extras. Cada gasto pode parecer pouco, mas a soma ao longo de dias ou semanas pode ser significativa. Por exemplo, gastar 500 Kz por dia durante 30 dias corresponde a 15.000 Kz. O objectivo não é eliminar todos os pequenos prazeres: é perceber o total e decidir quais despesas valem a pena para ti.',
      challenge: {
        kind: 'quiz',
        question: 'Se gastares 500 Kz por dia durante 30 dias, quanto terás gasto no total?',
        options: ['15.000 Kz', '5.000 Kz', '30.000 Kz'],
        answer: 0,
        feedback: '500 Kz multiplicados por 30 dias correspondem a 15.000 Kz. A conta mostra como despesas pequenas podem acumular-se.',
      },
    },
    {
      id: 'm4-t3',
      title: 'Despesas fixas, variáveis e imprevistas',
      content:
        'As despesas fixas tendem a repetir-se regularmente e podem ter valores semelhantes, como uma mensalidade. As despesas variáveis mudam de acordo com o consumo ou as circunstâncias, como algumas despesas de alimentação e lazer. As despesas imprevistas surgem sem serem planeadas, como uma reparação inesperada. Reconhecer estas categorias ajuda a planear melhor, embora o valor e a frequência de algumas despesas possam variar.',
      challenge: {
        kind: 'quiz',
        question: 'Uma reparação inesperada do telemóvel, que não estava planeada, é que tipo de despesa?',
        options: ['Despesa imprevista', 'Despesa fixa regular', 'Rendimento ocasional'],
        answer: 0,
        feedback: 'A reparação surgiu sem estar planeada. Não é uma entrada de dinheiro nem uma despesa regular conhecida.',
      },
    },
    {
      id: 'm4-t4',
      title: 'Comprar melhor e reduzir despesas',
      content:
        'Comprar de forma consciente envolve comparar preços, quantidade, qualidade, durabilidade e utilidade. O produto mais barato nem sempre é o mais económico se durar menos ou não servir para o que precisas. Também podes rever despesas repetidas e procurar alternativas realistas, desde que não comprometam a saúde, a segurança ou outras necessidades essenciais. Antes de comprar, verifica se o artigo é necessário, se cabe no orçamento e se existe uma alternativa adequada.',
      challenge: {
        kind: 'scenario',
        question: 'Dois produtos servem para o mesmo fim, mas têm preços, quantidades e durabilidade diferentes. Como escolhes?',
        options: [
          'Comparar o custo por unidade, a qualidade, a durabilidade e a utilidade',
          'Escolher automaticamente o produto com maior desconto',
          'Escolher sempre o produto mais caro porque deve ser melhor',
        ],
        answer: 0,
        feedback: 'A comparação deve considerar mais do que o desconto ou o preço inicial, incluindo a quantidade e a duração esperada.',
      },
    },
  ],
  mission: {
    kind: 'decisions',
    id: 'm4-mission',
    title: 'Detetive dos Gastos',
    intro:
      'Vais analisar uma lista de compras, calcular o total de microgastos ao longo de um período, identificar uma compra por impulso e comparar duas alternativas. A missão termina com feedback sobre como tomar decisões de consumo mais conscientes.',
    situations: [
      {
        title: 'Pista 1 — A lista de compras',
        context: 'Estas são as compras de um estudante durante um mês com 20 dias de aulas:',
        items: [
          'Lanche na escola: 500 Kz por dia',
          'Sumo: 200 Kz por dia',
          'Auscultadores em promoção: 7.500 Kz (não estavam planeados)',
          'Recarga de dados: 2.000 Kz (prevista no orçamento)',
          'Caderno para as aulas: 1.500 Kz',
        ],
        steps: [
          {
            concept: 'Microgastos',
            review: 'Multiplica o valor diário pelo número de dias e soma todos os pequenos gastos repetidos.',
            prompt: 'Se o estudante comprar o lanche e o sumo nos 20 dias de aulas, qual é o total de microgastos?',
            options: [
              { text: '14.000 Kz', points: 2, feedback: '(500 + 200) Kz × 20 dias = 14.000 Kz. Pequenos gastos diários somam um valor relevante.' },
              { text: '10.000 Kz', points: 0, feedback: '500 × 20 = 10.000 Kz é só o lanche. Falta contar o sumo: 200 × 20 = 4.000 Kz.' },
              { text: '700 Kz', points: 0, feedback: '700 Kz é o gasto de um único dia. A conta deve considerar os 20 dias.' },
            ],
          },
          {
            concept: 'Compras por impulso',
            review: 'Uma compra por impulso é feita depressa, sem planear nem avaliar utilidade, custo e impacto.',
            prompt: 'Qual destas compras tem sinais de compra por impulso?',
            options: [
              { text: 'Os auscultadores em promoção, que não estavam planeados', points: 2, feedback: 'Foram comprados sem planeamento e por causa da promoção. Valia a pena avaliar a utilidade e o impacto no dinheiro.' },
              { text: 'A recarga de dados, que estava no orçamento', points: 0, feedback: 'Estava prevista no orçamento, por isso não foi uma decisão impulsiva.' },
              { text: 'O caderno necessário para as aulas', points: 0, feedback: 'O caderno responde a uma necessidade ligada aos estudos.' },
            ],
          },
        ],
      },
      {
        title: 'Pista 2 — Comparar alternativas',
        context: 'Precisas de cerca de 200 folhas de caderno para o semestre.',
        items: [
          'Caderno A: 1.500 Kz, 100 folhas, capa fraca, com 20% de desconto (fica 1.200 Kz)',
          'Caderno B: 2.000 Kz, 200 folhas, capa resistente, sem desconto',
        ],
        steps: [
          {
            concept: 'Comparar alternativas',
            review: 'Compara custo por unidade, qualidade, durabilidade e utilidade, e não apenas o desconto.',
            prompt: 'Qual é a escolha mais económica para o que precisas?',
            options: [
              { text: 'Caderno B: custa 10 Kz por folha, tem as folhas de que preciso e é mais resistente', points: 2, feedback: 'O B custa 2.000 Kz por 200 folhas (10 Kz por folha). O A, mesmo com desconto, custa 12 Kz por folha.' },
              { text: 'Comprar dois cadernos A para chegar às 200 folhas', points: 1, feedback: 'Daria 2.400 Kz por 200 folhas (12 Kz por folha), com capas mais frágeis. Sai mais caro do que o B.' },
              { text: 'Caderno A, porque tem desconto e o preço final é menor', points: 0, feedback: 'O preço final é menor, mas as folhas também: 100 em vez de 200. O custo por folha é mais alto.' },
            ],
          },
          {
            concept: 'Reduzir despesas com consciência',
            review: 'Revê despesas repetidas, mas sem comprometer necessidades essenciais como a alimentação ou a saúde.',
            prompt: 'Queres reduzir despesas sem prejudicar o essencial. O que fazes?',
            options: [
              { text: 'Reviso os microgastos repetidos, como o lanche e o sumo diários, e escolho quais valem a pena', points: 2, feedback: 'Percebeste o total e decides com consciência. Não precisas de eliminar tudo, apenas escolher o que vale a pena para ti.' },
              { text: 'Não mudo nada, porque cada gasto é pequeno', points: 0, feedback: 'Cada gasto é pequeno, mas o total de 14.000 Kz num mês já pesa no orçamento.' },
              { text: 'Corto a alimentação e o transporte essenciais', points: 0, feedback: 'Reduzir necessidades essenciais pode afectar a saúde e os estudos. Procura primeiro despesas não essenciais.' },
            ],
          },
        ],
      },
    ],
  },
};

export const modules: Module[] = [modulo1, modulo2, modulo3, modulo4];

export const TOPICS_PER_MODULE = 4;
export const TOTAL_TOPICS = modules.reduce((n, m) => n + m.topics.length, 0);
export const TOTAL_MISSIONS = modules.length;

/* ------------------------------------------------------------------ */
/* Progresso, pontos e medalhas                                        */
/* ------------------------------------------------------------------ */

export const missionMaxScore = (m: Mission) =>
  m.kind === 'decisions' ? m.situations.reduce((n, s) => n + s.steps.length * 2, 0) : 2 + 2;

const POINTS_TOPIC_FIRST_TRY = 10;
const POINTS_TOPIC_RETRY = 5;
const POINTS_PER_MISSION_SCORE = 5;

export function moduleStatus(mod: Module, data: AppData) {
  const topicsDone = mod.topics.filter(t => data.educationDone.includes(t.id)).length;
  const missionDone = data.educationDone.includes(mod.mission.id);
  return {
    topicsDone,
    missionDone,
    missionUnlocked: topicsDone === mod.topics.length,
    completed: topicsDone === mod.topics.length && missionDone,
  };
}

export function educationSummary(data: AppData) {
  let topicsDone = 0, missionsDone = 0, medals = 0, points = 0;
  for (const mod of modules) {
    const st = moduleStatus(mod, data);
    topicsDone += st.topicsDone;
    if (st.missionDone) missionsDone++;
    if (st.completed) medals++;
    for (const t of mod.topics) {
      const r = data.educationResults[t.id];
      if (data.educationDone.includes(t.id)) points += r?.firstTry ? POINTS_TOPIC_FIRST_TRY : POINTS_TOPIC_RETRY;
    }
    points += (data.educationResults[mod.mission.id]?.best ?? 0) * POINTS_PER_MISSION_SCORE;
  }
  const completedUnits = topicsDone + missionsDone;
  const totalUnits = TOTAL_TOPICS + TOTAL_MISSIONS;
  return { topicsDone, missionsDone, medals, points, completedUnits, totalUnits, progress: completedUnits / totalUnits };
}

/* ------------------------------------------------------------------ */
/* Lógica da missão de orçamento                                       */
/* ------------------------------------------------------------------ */

export function evaluateAllocation(m: BudgetMission, a: Allocation) {
  const notes: string[] = [];
  const short = m.categories.filter(c => c.need !== undefined && (a[c.key] ?? 0) < (c.need as number));
  const essentialsCovered = short.length === 0;
  if (essentialsCovered) notes.push('As despesas essenciais ficaram cobertas.');
  else short.forEach(c => notes.push(`${c.label} ficou abaixo do valor previsto (${kz(c.need as number)}). As necessidades essenciais devem ser consideradas primeiro.`));

  const hasReserves = (a.poupanca ?? 0) > 0 && (a.imprevistos ?? 0) > 0;
  if (hasReserves) notes.push('Previste poupança e uma reserva para imprevistos, o que dá mais segurança ao plano.');
  else {
    if ((a.poupanca ?? 0) === 0) notes.push('Não previste poupança. Sempre que possível, reserva uma parte, mesmo pequena.');
    if ((a.imprevistos ?? 0) === 0) notes.push('Sem reserva para imprevistos, qualquer surpresa obriga a mexer noutras categorias.');
  }
  notes.push((a.lazer ?? 0) > 0 ? 'Previste lazer, o que ajuda a manter um plano realista.' : 'Sem lazer previsto, o plano pode ser difícil de manter. Se possível, reserva algo para isso.');

  const points = ((essentialsCovered ? 1 : 0) + (hasReserves ? 1 : 0)) as 0 | 1 | 2;
  return { points, notes, essentialsCovered, hasReserves };
}
