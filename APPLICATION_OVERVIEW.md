# Stash — visão geral da aplicação

## Objetivo

O **Stash** é uma aplicação móvel de gestão de orçamento familiar. Permite que duas pessoas registrem rendimentos, despesas fixas e gastos variáveis, acompanhem o saldo mensal e criem objetivos de poupança partilhados.

O conteúdo e a interface estão em português de Portugal. O modelo atual assume os membros fixos **"Eu"** e **"Parceira"**.

## Tecnologia

| Área | Escolha atual |
| --- | --- |
| Aplicação móvel | React Native 0.81.5 |
| Plataforma e ferramentas | Expo SDK 54 (`expo` ~54.0.35) |
| Interface | Componentes nativos React Native e `@expo/vector-icons` |
| Navegação | React Navigation, com separadores inferiores |
| Dados | Firebase Firestore, com subscrições em tempo real |
| Plataformas configuradas | Android, iOS e Web |

O projeto usa a nova arquitetura do React Native (`newArchEnabled`) e encontra-se configurado em modo retrato. Os comandos disponíveis são `npm start`, `npm run android`, `npm run ios` e `npm run web`.

## Estrutura do projeto

```text
App.js                         Navegação principal por separadores
index.js                       Ponto de entrada Expo
app.json                       Configuração Expo e recursos de aplicação
src/
  screens/
    HomeScreen.js              Orçamento e gestão dos gastos variáveis
    GoalsScreen.js             Objetivos de poupança
    SummaryScreen.js           Resumo dos gastos por pessoa
    ProfileScreen.js           Rendimentos e despesas fixas
  components/
    ExpenceCard.js             Cartão reutilizável de movimento
  services/
    Firebase.js                Inicialização do Firebase/Firestore
  theme/
    Colors.js                  Cores partilhadas (ainda não usadas pelos ecrãs)
  utils/
    DbSeeder.js                Dados de exemplo, não ligados ao fluxo da app
```

## Experiência e funcionalidades

### Navegação

A navegação é composta por quatro separadores sem cabeçalho nativo:

1. **Início** — apresenta o orçamento familiar, despesas fixas e movimentos variáveis.
2. **Objetivos** — cria, edita, movimenta e apaga metas de poupança.
3. **Por Pessoa** — mostra o valor gasto e a percentagem do rendimento para cada membro; um toque expande os respetivos movimentos.
4. **Meu Perfil** — permite alterar rendimentos mensais e a lista de contas fixas.

### Orçamento e gastos

O ecrã inicial calcula continuamente:

`saldo disponível = rendimentos totais − despesas fixas − total de movimentos variáveis`

É possível criar, editar e apagar gastos variáveis. Cada gasto guarda valor, estabelecimento, categoria, data e quem o realizou. Os movimentos são apresentados mais recentes primeiro quando existe o campo `timestamp`; atualmente os novos gastos criados pela interface não gravam esse campo.

### Objetivos de poupança

Cada objetivo tem título, ícone/emoji, valor-meta e valor já poupado. Depositar num objetivo aumenta o valor poupado e cria um movimento positivo de poupança no orçamento; retirar faz o inverso e cria um movimento negativo, devolvendo valor ao saldo disponível.

### Perfil familiar

O perfil persiste os dois rendimentos e uma lista editável de despesas fixas. Estes dados atualizam diretamente os cálculos da página inicial e os resumos por pessoa.

## Modelo de dados Firestore

| Localização | Campos utilizados | Responsabilidade |
| --- | --- | --- |
| `familias/nossa_casa` | `rendas: { Eu, Parceira }`, `despesasFixas: [{ id, nome, tipo, valor }]` | Configuração central do agregado |
| `gastos_variaveis/{id}` | `loja`, `valor`, `data`, `quem`, `categoria`, `mesReferencia` (`YYYY-MM`), `timestamp` | Compras, despesas e movimentos de poupança, filtrados mensalmente |
| `objetivos/{id}` | `titulo`, `meta`, `guardado`, `icone` | Metas de poupança |

Os ecrãs subscrevem estes dados com `onSnapshot`, pelo que as alterações feitas por um cliente são refletidas em tempo real nos restantes clientes ligados à mesma base de dados.

## Configuração necessária

O Firebase é configurado exclusivamente por variáveis de ambiente públicas do Expo. Para executar a aplicação ligada à base de dados, é necessário definir:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=
EXPO_PUBLIC_FIREBASE_PROJECT_ID=
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
EXPO_PUBLIC_FIREBASE_APP_ID=
```

Como usam o prefixo `EXPO_PUBLIC_`, estes valores são disponibilizados ao cliente. As regras do Firestore devem, por isso, proteger os dados adequadamente. A aplicação não implementa autenticação nem seleção de família; todos os clientes configurados apontam para o documento fixo `familias/nossa_casa`.

## Observações para evolução

- O nome físico do componente é `ExpenceCard.js`; embora o export seja `ExpenseCard`, corrigir o nome do ficheiro numa futura reorganização melhora a consistência.
- `Colors.js` e `DbSeeder.js` não são usados pelo fluxo em execução e parecem ser material de apoio/inicialização.
- Os membros da família, o perfil apresentado e o documento Firestore são fixos; suporte a contas, famílias e autenticação exigirá modelação adicional.
- As coleções são lidas integralmente, sem filtro por mês ou paginação. À medida que os movimentos aumentarem, convém guardar uma data normalizada e consultar apenas o período necessário.
- Não foram identificados testes automatizados nem um ficheiro README no repositório no momento desta análise.

## Ponto de entrada

`index.js` regista `App.js` como componente raiz do Expo. `App.js` configura a navegação e carrega os quatro ecrãs da aplicação.
