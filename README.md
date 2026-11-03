# Comanda — Projeto Final Zambom (front-end)

Cardápio digital e painel de gestão para o restaurante, em React + Vite.
Consome a [API REST do projeto](https://github.com/ijocaZn/Projeto-Final-Zambom)
(Spring Boot + JWT), publicada em `https://projeto-final-zambom.onrender.com`.

## Funcionalidades

**Área pública** (`/`)

- Cardápio agrupado por categoria, com abas por cardápio e filtro de categoria.
- Só exibe produtos disponíveis; preços formatados em reais.
- Situação das mesas em tempo real (livres e ocupadas).
- Atalhos `/cardapios`, `/produtos` e `/mesas` rolam até a seção correspondente.

**Painel administrativo** (`/admin`, exige login)

- Login e criação de acesso (`POST /login` e `POST /usuarios`). A sessão expira
  junto com o JWT (1 hora): o painel volta ao login com um aviso e, depois de
  entrar, retorna à página em que você estava.
- **Visão geral**: contas em aberto, mapa de mesas, faturamento e próximas reservas.
- **Pedidos**: abrir pedido por mesa, lançar itens, ajustar quantidades, fechar a
  conta (gera o pagamento e libera a mesa), trocar de mesa e cancelar.
- **Produtos**: cadastro, ativar/desativar disponibilidade e aplicar desconto.
- **Cardápios**: incluir e retirar produtos.
- **Restaurantes**: definir cardápio e vincular mesas e funcionários.
- **Reservas**: agendar, alterar e cancelar.
- **Pagamentos**: alterar forma de pagamento e estornar (reabre o pedido).
- Cadastro de clientes, mesas, funcionários e itens, com busca sem acentos,
  filtros por status e mensagens de validação da API exibidas no formulário.
- Layout responsivo: no celular as tabelas viram cartões e o menu vira gaveta.

## Como executar

Pré-requisito: Node.js 18 ou superior.

```bash
npm install
npm run dev
```

O front-end fica em `http://localhost:5173` e, por padrão, usa a API publicada
no Render. Para apontar para outra API (por exemplo, rodando localmente), crie
um arquivo `.env`:

```env
VITE_API_URL=http://localhost:8080
```

Outros comandos:

| Comando | Descrição |
|---|---|
| `npm run build` | Gera a versão de produção em `dist/` |
| `npm run preview` | Serve localmente a build de produção |

> O plano gratuito do Render hiberna a API quando ela fica sem uso. A primeira
> requisição pode levar até um minuto; a interface avisa quando isso acontece.

## Estrutura

```text
src/
├── api.js              Cliente HTTP, token JWT e tratamento de erros da API
├── auth.jsx            Sessão (login, logout, expiração) e rota protegida
├── hooks.js            Hooks de busca de dados e utilitários
├── format.js           Moeda, datas, CPF e rótulos em português dos enums
├── resources.jsx       Configuração de cada recurso: colunas, campos e ações
├── components/
│   ├── ui.jsx          Modal, badges, estados de carregamento/erro, marca
│   └── feedback.jsx    Notificações (toasts) e diálogos de confirmação
├── layout/AppShell.jsx Menu lateral do painel
└── pages/
    ├── PublicMenu.jsx  Cardápio público
    ├── Login.jsx
    ├── Dashboard.jsx
    ├── ResourcePage.jsx  Listagem genérica (busca, filtros, ações por linha)
    ├── ResourceForm.jsx  Formulário genérico de cadastro/edição
    └── details/          Pedido, cardápio e restaurante (telas de gestão)
```

Para adicionar ou ajustar um recurso, edite `src/resources.jsx`: as telas de
listagem e formulário são geradas a partir dessa configuração.

## Deploy no Vercel

1. No Vercel, selecione **Add New Project** e importe este repositório.
2. Build: `npm run build`; diretório de saída: `dist`.
3. Em **Environment Variables**, adicione
   `VITE_API_URL=https://projeto-final-zambom.onrender.com`.
4. Faça o deploy.

O `vercel.json` redireciona todas as rotas para `index.html`, evitando erro 404
ao recarregar páginas internas do React.
