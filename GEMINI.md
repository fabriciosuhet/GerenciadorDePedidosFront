# Contexto e Regras do Projeto: Gerenciador de Pedidos (Front-end)

## Idioma e Comunicação
- Responda **sempre em Português do Brasil (pt-BR)**, incluindo explicações, planos de execução e mensagens de commit.
- Mantenha nomes de classes, métodos, variáveis e arquivos no código em **Inglês**.

## Stack
- **Framework:** Angular (versão atual do projeto; usar sempre as APIs modernas)
- **Linguagem:** TypeScript em modo `strict`
- **Back-end:** API .NET 8 do projeto "gerenciadordepedidos", rodando no Docker em `http://localhost:8080` (Swagger em `http://localhost:8080/swagger/index.html`)
- **Estado:** signals + services (informar se usar NgRx)

## Design e UI
- Estilização com **Tailwind CSS**, usando classes utilitárias no template. Evite CSS customizado, a não ser quando o Tailwind não resolver.
- Cores, fontes e espaçamentos devem vir do tema do Tailwind (configurado no projeto). Não use valores fixos como `#3b82f6` ou `w-[137px]`.
- Componentes de UI: (Spartan UI / daisyUI / Flowbite, informar a escolha). Não misture bibliotecas.
- Layout: sidebar fixa à esquerda, header com busca e usuário, conteúdo em cards. Visual limpo, bastante espaço em branco, cantos arredondados.
- Tema claro com suporte a escuro (`dark:`).
- Design responsivo, começando pelo mobile (`sm:`, `md:`, `lg:`).
- Status de pedido com badges coloridos (pendente, em preparo, enviado, entregue, cancelado), centralizados em um único componente reutilizável.
- Listagens com tabela paginada, filtros no topo e busca por número do pedido.
- Se uma combinação de classes se repetir em vários lugares, extraia para um componente Angular, não para `@apply`.
- Referências visuais em `docs/design/`.

## Arquitetura e Estrutura de Pastas
```
src/app/
├── core/       # serviços singleton, interceptors, guards, config (usado uma vez no app)
├── shared/     # componentes, pipes e diretivas reutilizáveis, sem regra de negócio
└── features/   # uma pasta por funcionalidade (ex.: orders, customers, products)
    └── orders/
        ├── pages/        # componentes de rota (smart)
        ├── components/   # componentes de apresentação (dumb)
        ├── services/     # chamadas à API da feature
        ├── models/       # interfaces/types
        └── orders.routes.ts
```

## Boas Práticas de Angular
- Use **standalone components**. Não crie NgModules.
- Use **signals** (`signal`, `computed`, `effect`) para estado local e derivado.
- Use as funções `input()`, `output()` e `model()` em vez dos decorators `@Input`/`@Output`.
- Use `inject()` para injeção de dependência em vez de construtor, quando possível.
- Use o novo control flow (`@if`, `@for` com `track`, `@switch`) em vez de `*ngIf`/`*ngFor`.
- Use `ChangeDetectionStrategy.OnPush` em todos os componentes.
- Use **lazy loading** nas rotas (`loadComponent` / `loadChildren`).
- Use **Reactive Forms tipados** (`FormBuilder` / `FormGroup` tipado). Não use template-driven forms.
- Para RxJS: use o pipe `async` ou `toSignal()` no template; faça unsubscribe com `takeUntilDestroyed()`. Evite `subscribe` manual dentro de componentes.
- Componentes devem ser pequenos e focados. Lógica de negócio e chamadas HTTP ficam em services, nunca no componente.
- Separe componentes "smart" (páginas, que falam com services) de "dumb" (só recebem inputs e emitem outputs).

## Integração com a API
- Todas as chamadas HTTP passam por services usando `HttpClient`, nunca direto no componente.
- A URL base da API em desenvolvimento é `http://localhost:8080`. Deve ficar em `environment.development.ts` (campo `apiUrl`), nunca fixa nos services.
- Use o Swagger (`http://localhost:8080/swagger/index.html`) como referência do contrato: endpoints, métodos e formato dos DTOs. Antes de criar um service ou model novo, consulte o Swagger para espelhar os tipos corretamente.
- A API precisa estar no ar (`docker-compose up -d` no projeto do back) antes de testar o front. Se as chamadas falharem, verifique se o container está ativo.
- O front roda em `http://localhost:4200`. Erros de "blocked by CORS policy" indicam que a policy de CORS do back precisa liberar essa origem; avise em vez de contornar no front.
- Use **interceptors** para autenticação, tratamento global de erros e loading.
- Crie interfaces TypeScript que espelhem os DTOs de resposta do back. Se um DTO mudar no back, atualize o tipo aqui.
- Trate sempre os estados de **loading**, **erro** e **vazio** nas telas.

## Padrões de Código
- Proibido usar `any`. Use tipos explícitos, `unknown` ou generics.
- Nomes de arquivos em kebab-case: `order-list.component.ts`, `order.service.ts`, `order.model.ts`.
- Classes em PascalCase, variáveis/métodos em camelCase, constantes em UPPER_SNAKE_CASE.
- Um componente por arquivo. Prefira template e estilos em arquivos separados quando passarem de ~20 linhas.
- Não manipule o DOM diretamente (evite `document.querySelector`). Use bindings e diretivas.
- Acessibilidade: use HTML semântico, `alt` em imagens e labels nos campos de formulário.

## Testes
- Testes unitários para services e componentes com lógica (Jasmine/Karma ou Jest, conforme o projeto).
- Ao criar um componente ou service novo, crie o teste correspondente.

## Modo de Execução e Autonomia
- Aplique edições e criações de arquivos diretamente, sem pedir confirmação passo a passo, mantendo o projeto compilável.
- Ao alterar código estrutural, valide com `ng build` (e `ng test` quando houver testes afetados).
- Use o Angular CLI (`ng generate`) para criar componentes, services e rotas, mantendo o padrão do projeto.
- Antes de iniciar qualquer alteração: `git checkout main`, `git pull` e crie uma nova branch baseada na `main` (ex.: `feature/nome-da-tarefa`). Nunca commite direto na `main`.
- **Nunca adicione o agente/IA como coautor** (`Co-authored-by`) em mensagens de commit ou PRs.
