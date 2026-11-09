# LOTUS — Lembretes e Notificações

Sistema de notificações **locais** para a LOTUS, conforme a *Especificação Funcional — Lembretes e Notificações*.
Funciona **sem Internet e sem backend** (sem Firebase, Supabase ou servidores): o telemóvel agenda e apresenta tudo sozinho.

> **Estado de verificação (importante):** o código compila em TypeScript estrito, empacota para Android e web, o `expo prebuild` gera o manifesto Android correto e a lógica de agendamento passou 14 verificações automáticas **com um `expo-notifications` simulado**. **Não foi testado num telemóvel ou emulador real.** A secção [Testar no Android](#testar-no-android) indica o que confirmar no dispositivo.

---

## 1. Instalação

```bash
pnpm install          # a dependência expo-notifications já está no package.json
```

Dependência adicionada: `expo-notifications ~58.1.8` (a versão que o Expo SDK 58 indica como compatível). Nenhuma outra dependência foi acrescentada nem atualizada.

## 2. Configuração (já feita)

- **`app.json`**
  - plugin `expo-notifications` com ícone de notificação (`assets/notification-icon.png`) e cor `#062d62`;
  - permissões Android `POST_NOTIFICATIONS` (autorização no Android 13+) e `RECEIVE_BOOT_COMPLETED` (o sistema repõe os lembretes depois de reiniciar o telemóvel).
- **Canais Android** (criados em código): *Registo de despesas*, *Poupança*, *Educação financeira*, *Desafio*, *Orçamento*, *Resumo semanal*. O utilizador pode gerir cada um nas definições do Android.
- O manifesto gerado também inclui entradas `firebase.messaging.default_notification_*`. É apenas como o plugin define o ícone/cor; **não há Firebase nem push remoto**.

## 3. Como o utilizador usa

**Perfil → Notificações** abre o ecrã *Notificações e lembretes*:

| Elemento | O que faz |
|---|---|
| Cartão **Autorização** | Mostra o estado (autorizadas / por autorizar / bloqueadas / indisponível). Botão *Autorizar notificações* ou *Abrir definições* se o Android bloqueou o pedido. |
| Interruptor por lembrete | Ativa/desativa cada um dos 6 tipos. Ao ativar o primeiro, a app pede autorização. |
| Hora | Horas (±1) e minutos (±5) por lembrete. |
| Dias | Educação financeira: vários dias. Poupança, Desafio, Orçamento e Resumo semanal: um dia. Registo de despesas: todos os dias. |
| *Testar este lembrete* / *Enviar notificação de teste* | Envia a notificação real do tipo escolhido em ~3 s (minimiza a app para a ver na barra). |

Tudo fica guardado localmente (AsyncStorage) e persiste ao fechar/reiniciar a app.
*Eliminar dados locais* (Perfil) também cancela os agendamentos e repõe as preferências.

### Mensagens (exatamente as da especificação)

| Tipo | Mensagem | Predefinição | Quando é enviada |
|---|---|---|---|
| Registo de despesas | Já registaste os teus gastos de hoje? | todos os dias 20:00 | sempre que ativado |
| Poupança | Não te esqueças da tua meta de poupança! | sexta 18:00 | só com meta por concluir |
| Educação financeira | Que tal aprenderes uma dica financeira hoje? | terça e sábado 19:00 | sempre que ativado |
| Desafio | Tens um desafio à tua espera! | quarta 17:00 | só com missão final desbloqueada e por concluir |
| Orçamento | Já deste uma vista de olhos ao teu orçamento? | segunda 09:00 | só com limite de orçamento definido |
| Resumo semanal | Está na hora de rever a tua semana financeira! | domingo 18:00 | sempre que ativado |

Os horários predefinidos são escolhas minhas (a especificação não os fixa) e estão escalonados para não se sobreporem; ajusta-os em `DEFAULT_CONFIG` (`notificationService.ts`).
Todos os lembretes vêm ativados por predefinição, mas **nada é enviado enquanto o utilizador não autorizar** as notificações.

### Privacidade
As notificações usam apenas as mensagens genéricas acima. Nunca incluem valores nem dados financeiros, por isso podem aparecer no ecrã bloqueado.

### Relevância
- *Desafio* = missão final de um módulo de Educação financeira (todos os tópicos concluídos e missão ainda por fazer). No código não existe outro conceito de "desafio".
- Os agendamentos são refeitos automaticamente quando as metas, os orçamentos ou o progresso na educação mudam; se deixares de ter a funcionalidade, o lembrete deixa de ser agendado.
- Nada é inventado: sem meta, sem orçamento ou sem missão disponível, o respetivo lembrete não é agendado.

### Lembretes internos (dentro da app)
No ecrã **Início** aparece o cartão *Lembretes*, com no máximo 2 mensagens (rodam por dia). Seguem as mesmas preferências e relevância, não dependem da autorização do sistema e não interrompem a navegação. O de despesas desaparece quando já registaste uma despesa hoje.

### Tocar numa notificação
Funciona com a app aberta, em segundo plano ou encerrada. Usa as áreas que já existem na app (não foram criadas rotas novas):

| Notificação | Abre |
|---|---|
| Registo de despesas | separador **Movimentos**, filtrado por despesas |
| Poupança | separador **Metas** |
| Educação financeira | ecrã de **Educação financeira** |
| Desafio | **Educação financeira**, diretamente no módulo com a missão disponível |
| Orçamento | separador **Orçamento** |
| Resumo semanal | separador **Início** (saldo, receitas e despesas do mês) |

Se tocares numa notificação antes de concluir o onboarding, a navegação só acontece depois dele.

## 4. Arquitetura

| Ficheiro | Papel |
|---|---|
| `notificationService.ts` | Serviço sem interface: tipos, mensagens, preferências, permissões, canais, agendamento, relevância e lembretes internos. Funções: `requestNotificationPermissions`, `getNotificationPermissions`, `scheduleDailyReminder`, `scheduleWeeklyReminder`, `cancelReminder`, `cancelAllReminders`, `rescheduleAllReminders`, `sendTestNotification`. |
| `useNotifications.ts` | Liga o serviço ao estado da app: carrega preferências, relê a permissão ao voltar à app, reagenda quando algo muda e trata o toque nas notificações. |
| `NotificationSettings.tsx` | Ecrã de definições, no estilo visual da LOTUS (cores, cartões, tema claro/escuro). |
| `App.tsx` | Integração mínima: linha *Notificações* no Perfil, cartão de lembretes no Início, navegação a partir das notificações. |
| `Education.tsx` | Nova propriedade opcional `initialModule` (abrir diretamente um módulo). |
| `app.json`, `package.json`, `pnpm-lock.yaml`, `assets/notification-icon.png` | Configuração e dependência. |

**Sem duplicados:** cada agendamento tem um identificador fixo (`lotus.<tipo>.<dia|daily>`); antes de agendar cancela-se tudo o que a LOTUS tinha (incluindo restos que o armazenamento não conheça) e todas as operações passam por uma fila. Os identificadores ativos ficam guardados em `lotus_notification_ids_v1`; as preferências em `lotus_notifications_v1`. Os dados financeiros (`lotus_data_v1`) não foram alterados.

## 5. Testar no Android

### Expo Go
O código foi escrito para funcionar também em Expo Go (notificações **locais**; o push remoto é que não existe lá). Não pude confirmar o comportamento em Expo Go no SDK 58, e o Expo Go não valida a configuração de ícone/permissões. Se algo falhar ali, usa uma build própria.

### Build própria (recomendado, e necessária para a versão final)
```bash
# Opção A — build de desenvolvimento (instala no telemóvel/emulador e liga ao servidor local)
eas build -p android --profile development
pnpm start --dev-client

# Opção B — APK autónomo para testar sem computador
eas build -p android --profile preview
```
(Os perfis `development` e `preview` já existem em `eas.json`. A opção A permite recarregar o código; a B testa a app como o utilizador a vai ter.)

### Lista de verificação no dispositivo
1. Perfil → Notificações → *Autorizar notificações* → aceitar no diálogo do Android.
2. *Enviar notificação de teste* → minimizar a app → a notificação aparece na barra em poucos segundos.
3. Tocar nela → abre *Movimentos* (despesas). Repetir com *Testar este lembrete* nos outros 5 tipos.
4. Com a app **totalmente fechada** (deslizar para a remover), enviar um teste, tocar na notificação e confirmar que abre a área certa.
5. Pôr um lembrete diário daqui a 2–3 minutos, fechar a app e esperar. Mudar o resumo semanal para o dia de hoje e fazer o mesmo.
6. Desativar um lembrete e confirmar que deixa de chegar. Reiniciar o telemóvel e confirmar que os restantes continuam.
7. Recusar a autorização: a app deve continuar normal e o cartão mostrar *bloqueadas* com o botão *Abrir definições*.
8. Criar uma meta/orçamento e confirmar que os lembretes respetivos passam a ser agendados (e deixam de o ser ao eliminá-los).

## 6. Limitações conhecidas

- **Hora aproximada:** não é pedida a permissão de alarmes exatos (seria intrusiva para lembretes). No Android 12+, com poupança de energia (Doze), a notificação pode atrasar alguns minutos.
- **Fabricantes agressivos** (Xiaomi, Huawei, Oppo, etc.) podem bloquear notificações de apps em segundo plano; o utilizador pode ter de retirar a LOTUS da otimização de bateria.
- **Forçar a paragem da app** (Definições → Parar) cancela os alarmes do Android até a app ser aberta de novo.
- O lembrete diário de despesas dispara mesmo que já tenhas registado gastos nesse dia (um agendamento repetido não consegue consultar os dados no momento). O lembrete interno, esse sim, esconde-se.
- Só existe em Android/iOS; na versão web o ecrã mostra "Indisponível neste dispositivo". O iOS não foi configurado nem testado.
- O ícone `assets/notification-icon.png` (lótus branco sobre fundo transparente, 96×96) é **provisório**, gerado por mim; substitui-o pelo ícone oficial no mesmo formato. Sem ícone próprio o Android mostraria um quadrado branco.
- Fase 2 da especificação (personalização avançada, mensagens rotativas por progresso) não foi implementada, exceto a rotação diária dos lembretes internos.

## 7. O que foi verificado

- `tsc --noEmit` (modo estrito) sem erros.
- `expo export` para Android (694 módulos) e web sem erros; a versão web abre e o ecrã de definições aparece sem erros na consola.
- `expo prebuild` (Android): manifesto com `POST_NOTIFICATIONS` e `RECEIVE_BOOT_COMPLETED`, ícone e cor de notificação.
- 14 verificações automáticas da lógica com `expo-notifications` simulado: mensagens exatas; 7 agendamentos com tudo ativo; 6 reagendamentos simultâneos sem duplicados; relevância; desativar tipos; dia e hora do resumo semanal; permissão negada; canais criados antes do pedido; teste não apagado pelo reagendamento; cancelamento (incluindo órfãos); persistência e dados corrompidos; lembretes internos; reposição ao eliminar dados.
- **Não verificado:** entrega real de notificações, diálogo de autorização, toque com a app fechada, comportamento em Doze/Expo Go.
