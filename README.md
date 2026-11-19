# Gerenciador de Pedidos — Front-end (Angular)

Interface web desenvolvida em **Angular 22** com **Tailwind CSS v4 + SCSS** para consumir a API REST do repositório backend [GerenciadorDePedidos](../GerenciadorDePedidos).

## Funcionalidades

- **Autenticação JWT**: Login (`POST /api/login`) e Auto-cadastro (`POST /api/cliente/registrar`) com validação de senha alinhada ao backend e decodificação de claims (`Usuario` e `Admin`).
- **Dashboard**: Visão resumida de pedidos recentes, catálogo de produtos e totais.
- **Pedidos**: Listagem com filtros rápidos por status (`Pendente`, `Processado`, `Concluido`, `Cancelado`), visualização de itens do pedido (`GET /api/pedido/{id}`), criação de novos pedidos (`POST /api/pedido`) com cálculo em tempo real e exclusão (Admin).
- **Produtos e Estoque**: Catálogo pesquisável, criação/edição/exclusão (Admin) e ajuste de entrada/saída de estoque (`adicionar-estoque` / `remover-estoque`).
- **Clientes**: Listagem com busca, visualização de detalhes e pedidos do cliente, edição de e-mail/telefone, criação com seleção de perfil (Admin) e exclusão (Admin).
- **Movimentações de Estoque (Admin)**: Consulta de histórico e detalhes de movimentações (`GET /api/produto/movimentacao-estoque`).

## Configuração da API

Por padrão, `src/environments/environment.ts` e `src/environments/environment.development.ts` apontam para o Docker Compose do backend:

```ts
apiUrl: 'http://localhost:8080/api'
```

Se estiver executando o backend via `dotnet run` (`http://localhost:5133`), altere `apiUrl` para `http://localhost:5133/api` em `src/environments/environment.development.ts`.

## Comandos

```bash
# Instalar dependências
npm install

# Rodar em desenvolvimento (http://localhost:4200)
npm start

# Build de produção
npm run build

# Executar testes unitários (Vitest)
npm test -- --watch=false
```
