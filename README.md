# Stash — Visão Geral da Aplicação (README)

## Objetivo

O **Stash** é uma aplicação móvel multi-utilizador de gestão de orçamento familiar e pessoal. Permite criar ou juntar-se a grupos familiares através de códigos de convite, registar rendimentos individuais, gerir despesas fixas mensais (com controlo de pagamento por mês e por membro), acompanhar gastos variáveis, definir limites de orçamento por categoria, criar objetivos de poupança (familiares ou individuais) e exportar relatórios financeiros anuais em **PDF** e **CSV**.

Toda a interface e experiência de utilização estão em português de Portugal (`pt-PT`), com suporte completo a **Modo Claro** e **Modo Escuro**.

---

## Tecnologia

| Área | Escolha atual |
| --- | --- |
| Aplicação móvel | React Native `0.86.3` (React `19.2.3`) |
| Plataforma e ferramentas | Expo SDK 57 (`expo` `^57.0.22`) |
| Interface e Tipografia | Componentes nativos, `@expo/vector-icons` (Ionicons), fonte Google `Space Grotesk` (`@expo-google-fonts/space-grotesk`) e `react-native-svg` |
| Tema | Sistema dinâmico Claro/Escuro via `ThemeContext` e `Colors.js` |
| Navegação | React Navigation (`@react-navigation/native` e `@react-navigation/bottom-tabs`) |
| Autenticação e Dados | Firebase (`^12.16.0`): **Firebase Auth** (persistência em `AsyncStorage`) e **Cloud Firestore** em tempo real (`onSnapshot`) |
| Exportação e Ficheiros | `expo-print`, `expo-sharing` e `expo-file-system` (geração de PDF e CSV) |
| UX & Notificações | `expo-haptics` (feedback tátil) e `expo-notifications` (lembretes locais agendados) |
| Plataformas configuradas | Android, iOS e Web |

O projeto usa a nova arquitetura do React Native (`newArchEnabled: true`) e encontra-se configurado em modo retrato (`portrait`). Os comandos disponíveis são:

- `npm start` — inicia o servidor de desenvolvimento Expo
- `npm run android` — inicia a aplicação para Android
- `npm run ios` — inicia a aplicação para iOS
- `npm run web` — inicia a aplicação para Web

---

## Estrutura do Projeto

```text
App.js                                      Configuração de providers, fontes, autenticação e navegação por separadores
index.js                                    Ponto de entrada Expo
app.json                                    Configuração Expo, plugins e recursos da aplicação
src/
  screens/
    AuthScreen.js                           Ecrã de autenticação (Iniciar Sessão e Criar Conta com código de convite)
    HomeScreen.js                           Orçamento mensal, despesas fixas, gráfico de categorias e gastos variáveis
    GoalsScreen.js                          Objetivos de poupança familiares e individuais
    SummaryScreen.js                        Resumo de gastos do agregado e detalhe individual por membro
    ReportsScreen.js                        Relatórios anuais, evolução de saldo e exportação PDF/CSV
    ProfileScreen.js                        Gestão de perfil, família, convites, rendimentos, contas fixas, limites e tema
    styles/                                 Folhas de estilo modularizadas por ecrã (*ScreenStyles.js)
  components/
    CategoryDonutChart.js                   Gráfico circular SVG por categoria e barras de limite de orçamento
    ExpenseCard.js                          Cartão reutilizável de movimento (despesa, poupança ou resgate)
    EmptyState.js                           Componente reutilizável para estados vazios
    SkeletonLoader.js                       Skeletons animados (shimmer/pulse) para carregamento de dados
    styles/                                 Folhas de estilo dos componentes (*Styles.js)
  context/
    AuthContext.js                          Autenticação, perfil do utilizador, gestão de família, convites e permissões
    MonthContext.js                         Contexto global do mês selecionado (YYYY-MM) e navegação entre meses
    ThemeContext.js                         Gestão do tema Claro/Escuro (automático pelo sistema ou manual)
  hooks/
    useExpenses.js                          Subscrição em tempo real e CRUD de gastos variáveis no Firestore
    useFixedExpenses.js                     Alternância e registo mensal de pagamento das despesas fixas
    useGoals.js                             Subscrição em tempo real, CRUD e movimentação de fundos de objetivos
  services/
    Firebase.js                             Inicialização do Firebase App, Firestore e Auth com persistência
    NotificationService.js                  Agendamento de notificações locais (lembrete mensal e resumo semanal)
  constants/
    Categories.js                           Lista oficial das 12 categorias de gasto da aplicação
  theme/
    Colors.js                               Paletas semânticas lightColors, darkColors e CATEGORY_COLORS
  utils/
    calculations.js                         Cálculos de totais, despesas fixas pagas, agrupamento por categoria e timestamps
    colors.js                               Utilitário hexToRgba para manipulação de cores com opacidade
    formatters.js                           Formatação de moeda (EUR / pt-PT) e geração de iniciais
    Month.js                                Utilitários de manipulação e formatação de meses
```

---

## Experiência e Funcionalidades

### 1. Autenticação e Grupos Familiares (`AuthScreen` & `AuthContext`)
- **Login e Registo** com e-mail e palavra-passe através do Firebase Auth (não é a solução definitiva).
- **Criação Automática de Família (Modo Solo)**: Se o utilizador se registar sem código de convite, é criado automaticamente um grupo familiar privado (`fam_<uid>`) com um código de convite único de 6 caracteres.
- **Código de Convite**: Permite juntar-se a uma família existente no momento do registo ou posteriormente no ecrã de Perfil.
- **Cargos e Permissões (`admin` vs `membro`)**:
  - Administradores podem alterar o nome da família, regerar o código de convite, promover outros membros a administradores, remover o cargo de administrador ou remover membros do grupo (o membro removido passa automaticamente para uma nova família solo).

### 2. Navegação Principal (`App.js`)
Quando autenticado, a navegação apresenta **cinco separadores inferiores** sem cabeçalho nativo:
1. **Início** (`HomeScreen`) — visão geral do orçamento mensal, despesas fixas, gráfico de categorias e movimentos variáveis.
2. **Objetivos** (`GoalsScreen`) — criação, edição, reforço, resgate e exclusão de metas de poupança.
3. **Por Pessoa** (`SummaryScreen`) — visão agregada da família e repartição de gastos (variáveis + fixos pagos) por membro.
4. **Relatórios** (`ReportsScreen`) — gráfico de tendência anual do saldo, resumo mês a mês e exportação para CSV/PDF.
5. **Meu Perfil** (`ProfileScreen`) — configurações pessoais, familiares, financeiras e de aparência.

### 3. Orçamento, Despesas Fixas e Gastos Variáveis (`HomeScreen`)
- **Cálculo do Saldo Disponível**:
  $$\text{Saldo Disponível} = \text{Rendimentos Totais dos Membros} - \text{Despesas Fixas Pagas no Mês} - \text{Total de Movimentos Variáveis}$$
- **Navegação Mensal**: Permite recuar para meses anteriores com registos e regressar ao mês atual.
- **Despesas Mensais (Fixas)**:
  - Secção em acordeão com contador de progresso (`pagas/total`).
  - Cada conta fixa pode ser marcada/desmarcada como paga no mês selecionado, registando automaticamente qual o membro que efetuou o pagamento e a data/hora.
  - Exibe o dia de vencimento (se configurado) e o autor do pagamento.
- **Para onde vai o dinheiro (`CategoryDonutChart`)**:
  - Gráfico circular em SVG que combina gastos variáveis e despesas fixas já pagas no mês.
  - Quando uma categoria tem um **limite mensal** definido, apresenta uma barra de progresso com alerta visual (verde $<80\%$, amarelo $\ge 80\%$, vermelho $\ge 100\%$).
- **Gastos Variáveis**:
  - Criação, edição e remoção de despesas com valor, loja/estabelecimento, categoria, data e membro responsável.
  - **Pesquisa e Filtros**: Barra de pesquisa por texto (loja ou categoria) e chips de filtro rápido por membro da família.

### 4. Objetivos de Poupança (`GoalsScreen`)
- Suporta dois tipos de metas:
  - **Objetivos da Família**: Partilhados por todo o agregado.
  - **Objetivos Individuais**: Associados a um membro específico da família (identificado com um badge próprio).
- **Movimentação de Dinheiro**:
  - **Depositar**: Aumenta o valor guardado no objetivo e regista uma transação positiva na categoria `Poupança` em `gastos_variaveis` (deduzindo do saldo disponível do mês).
  - **Retirar (Resgate)**: Diminui o valor guardado e cria um movimento negativo em `gastos_variaveis`, devolvendo o montante ao saldo disponível do mês.

### 5. Resumo por Pessoa (`SummaryScreen`)
- **Cartão do Agregado Familiar**: Mostra o gasto global combinado (variáveis + fixas pagas), rendimento total da família e a percentagem de rendimento consumida no mês.
- **Cartões por Membro**: Lista cada membro da família com o seu rendimento, total gasto (somando os seus gastos variáveis e as contas fixas que pagou nesse mês) e a percentagem face ao seu rendimento individual.
- Ao expandir um membro, exibe os **chips de gastos por categoria** dessa pessoa e a lista detalhada dos seus movimentos (incluindo contas fixas pagas e despesas variáveis).

### 6. Relatórios e Exportação (`ReportsScreen`)
- **Gráfico de Evolução de Saldo Mensal**: Gráfico de linha em SVG que ilustra a trajetória do saldo ao longo dos meses do ano atual.
- **Exportação de Dados**:
  - **CSV**: Gera e partilha o ficheiro `relatorio_stash.csv` com Mês, Renda, Despesas Fixas, Despesas Variáveis, Total Gasto, Saldo e Taxa de Poupança (%).
  - **PDF**: Gera uma tabela formatada em HTML e converte-a num documento PDF partilhável através de `expo-print` e `expo-sharing`.
- **Resumo Mensal**: Lista cronológica inversa dos meses com atividade no ano corrente.

### 7. Perfil e Configurações (`ProfileScreen`)
- **Perfil Pessoal**: Alteração de nome de utilizador e escolha de avatar (12 emojis pré-definidos ou URL de imagem externa).
- **Gestão Familiar**: Visualização de membros, partilha nativa do código de convite, entrada noutra família por código e ferramentas de administração.
- **Definições Financeiras**:
  - Atualização do rendimento mensal individual.
  - Gestão de **Despesas Mensais (Fixas)** organizadas por separadores de categoria, com nome, valor e dia de vencimento (1–31).
  - Configuração de **Limites por Categoria** (tetos mensais de orçamento).
- **Aparência e Notificações**: Alternância manual do **Modo Escuro** e serviço preparado para notificações locais (`NotificationService.js`).

---

## Modelo de Dados Firestore

| Coleção / Documento | Campos principais | Responsabilidade |
| --- | --- | --- |
| `users/{uid}` | `uid`, `nome`, `email`, `fotoUrl`, `familyId`, `criadoEm` | Perfil individual do utilizador e referência à família ativa |
| `familias/{familyId}` | `id`, `nome`, `codigoConvite`, `criadoPor`, `membros` (`[{ uid, nome, email, renda, role, fotoUrl }]`), `despesasFixas` (`[{ id, nome, tipo, categoria, valor, diaVencimento, pago, pagamentos }]`), `limitesCategorias` (`{ [categoria]: valor }`) | Configuração central do agregado familiar, membros, contas fixas e tetos de orçamento |
| `gastos_variaveis/{id}` | `familyId`, `loja`, `valor`, `data`, `quem`, `quemUid`, `categoria`, `mesReferencia` (`YYYY-MM`), `timestamp` | Compras, despesas variáveis, depósitos em poupança e resgates, filtrados por família e mês |
| `objetivos/{id}` | `familyId`, `titulo`, `meta`, `guardado`, `icone`, `tipo` (`'familiar'` \| `'individual'`), `dono`, `donoUid` | Metas de poupança familiares e individuais do agregado |

> **Nota sobre Pagamentos de Despesas Fixas:** Cada item em `despesasFixas` mantém um mapa `pagamentos` indexado por `YYYY-MM` (ex.: `pagamentos["2026-10"] = { pago: true, quem: "Nome", quemUid: "...", timestamp: ... }`), permitindo histórico independente mês a mês.

---

## Configuração Necessária

O Firebase é configurado através de variáveis de ambiente públicas do Expo (ficheiro `.env` na raiz do projeto):

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Certifique-se também de que o método de autenticação **Email/Password** está ativo na consola do Firebase Authentication e de que as regras de segurança do Cloud Firestore permitem a leitura e escrita aos utilizadores autenticados nas coleções `users`, `familias`, `gastos_variaveis` e `objetivos`.
