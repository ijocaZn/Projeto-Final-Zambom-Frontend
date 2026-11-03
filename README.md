# Projeto Final Zambom

API REST para gerenciamento de um restaurante, desenvolvida com Spring Boot,
Spring Data JPA, Spring Security e banco H2.

## Como executar

### Pré-requisitos

- Java 25
- Git

O projeto inclui o Maven Wrapper, portanto não é necessário instalar o Maven
separadamente.

### Linux/macOS

```bash
cd restaurante
./mvnw spring-boot:run
```

### Windows (PowerShell)

```powershell
cd restaurante
.\mvnw.cmd spring-boot:run
```

A aplicação estará disponível em `http://localhost:8080`.

Para executar os testes:

```powershell
.\mvnw.cmd test
```

## Documentação da API

Com a aplicação em execução:

- Swagger UI: `http://localhost:8080/swagger-ui.html`
- OpenAPI JSON: `http://localhost:8080/v3/api-docs`
- Console H2: `http://localhost:8080/h2-console`

As rotas protegidas exigem um token JWT no cabeçalho `Authorization: Bearer`.
O cadastro de usuário é feito por `POST /usuarios` e a autenticação por
`POST /login`.

## Resumo das rotas

Todas as rotas usam a base `http://localhost:8080`.

### Usuários

| Método | Rota | Descrição |
|---|---|---|
| POST | `/usuarios` | Cadastra um usuário |
| POST | `/login` | Gera o token JWT de acesso |

### Clientes

| Método | Rota | Descrição |
|---|---|---|
| POST | `/clientes` | Cadastra um cliente |
| GET | `/clientes` | Lista clientes |
| GET | `/clientes/{id}` | Busca cliente por ID |
| PUT | `/clientes/{id}` | Atualiza cliente |
| DELETE | `/clientes/{id}` | Remove cliente |

### Produtos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/produtos` | Cadastra um produto |
| GET | `/produtos` | Lista produtos |
| GET | `/produtos/{id}` | Busca produto por ID |
| PUT | `/produtos/{id}` | Atualiza produto |
| DELETE | `/produtos/{id}` | Remove produto |

### Cardápios

| Método | Rota | Descrição |
|---|---|---|
| POST | `/cardapios` | Cadastra um cardápio |
| GET | `/cardapios` | Lista cardápios |
| GET | `/cardapios/{id}` | Busca cardápio por ID |
| PUT | `/cardapios/{id}` | Atualiza cardápio |
| DELETE | `/cardapios/{id}` | Remove cardápio |
| POST | `/cardapios/{idCardapio}/produtos/{idProduto}` | Adiciona produto ao cardápio |
| DELETE | `/cardapios/{idCardapio}/produtos/{idProduto}` | Remove produto do cardápio |
| GET | `/cardapios/{id}/produtos` | Lista produtos do cardápio |

### Mesas

| Método | Rota | Descrição |
|---|---|---|
| POST | `/mesas` | Cadastra uma mesa |
| GET | `/mesas` | Lista mesas |
| GET | `/mesas/{id}` | Busca mesa por ID |
| PUT | `/mesas/{id}` | Atualiza mesa |
| DELETE | `/mesas/{id}` | Remove mesa |

### Pedidos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/pedidos` | Cadastra um pedido |
| GET | `/pedidos` | Lista pedidos |
| GET | `/pedidos/{id}` | Busca pedido por ID |
| PUT | `/pedidos/{id}` | Atualiza pedido |
| DELETE | `/pedidos/{id}` | Remove pedido |

### Itens do pedido

| Método | Rota | Descrição |
|---|---|---|
| POST | `/pedidos/{idPedido}/itens` | Adiciona item a um pedido |
| GET | `/itens-pedido` | Lista itens dos pedidos |
| GET | `/itens-pedido/{id}` | Busca item por ID |
| PUT | `/itens-pedido/{id}` | Atualiza item |
| DELETE | `/itens-pedido/{id}` | Remove item |

### Pagamentos

| Método | Rota | Descrição |
|---|---|---|
| POST | `/pagamentos` | Cadastra um pagamento |
| GET | `/pagamentos` | Lista pagamentos |
| GET | `/pagamentos/{id}` | Busca pagamento por ID |
| PUT | `/pagamentos/{id}` | Atualiza o método de pagamento |
| DELETE | `/pagamentos/{id}` | Remove pagamento |

### Reservas

| Método | Rota | Descrição |
|---|---|---|
| POST | `/reservas` | Cadastra uma reserva |
| GET | `/reservas` | Lista reservas |
| GET | `/reservas/{id}` | Busca reserva por ID |
| PUT | `/reservas/{id}` | Atualiza reserva |
| DELETE | `/reservas/{id}` | Remove reserva |

### Funcionários

| Método | Rota | Descrição |
|---|---|---|
| POST | `/funcionarios` | Cadastra um funcionário |
| GET | `/funcionarios` | Lista funcionários |
| GET | `/funcionarios/{id}` | Busca funcionário por ID |
| PUT | `/funcionarios/{id}` | Atualiza funcionário |
| DELETE | `/funcionarios/{id}` | Remove funcionário |

### Restaurantes

| Método | Rota | Descrição |
|---|---|---|
| POST | `/restaurantes` | Cadastra um restaurante |
| GET | `/restaurantes` | Lista restaurantes |
| GET | `/restaurantes/{id}` | Busca restaurante por ID |
| PUT | `/restaurantes/{id}` | Atualiza restaurante |
| PUT | `/restaurantes/{idRestaurante}/cardapio/{idCardapio}` | Vincula cardápio ao restaurante |
| POST | `/restaurantes/{idRestaurante}/mesas/{idMesa}` | Vincula mesa ao restaurante |
| POST | `/restaurantes/{idRestaurante}/funcionarios/{idFuncionario}` | Vincula funcionário ao restaurante |
| DELETE | `/restaurantes/{id}` | Remove restaurante |

## Front-end React

O painel web está em `src/` e usa React + Vite. Ele oferece autenticação HTTP
Basic, dashboard e telas de consulta, cadastro, edição e remoção para os
recursos da API, além da busca local nos registros.

### Executar

Com Node.js instalado:

```powershell
npm install
npm run dev
```

O front-end ficará disponível em `http://localhost:5173`. A API deve estar
rodando em `http://localhost:8080`. Para usar outra URL, crie um arquivo
`.env` com:

```env
VITE_API_URL=http://localhost:8080
```

### Rotas do front-end

- `/` apresenta o cardápio público, produtos disponíveis e situação das mesas.
- `/cardapios`, `/produtos` e `/mesas` também são páginas públicas de consulta.
- `/admin` abre o login da área administrativa.
- `/admin/dashboard` e as demais rotas `/admin/{recurso}` exigem autenticação JWT.

### Deploy no Vercel

1. Suba este projeto para o GitHub e, no Vercel, selecione **Add New Project**.
2. Importe o repositório do front-end.
3. Use `npm run build` como comando de build e deixe o diretório de saída como
   `dist`.
4. Em **Environment Variables**, adicione:

```env
VITE_API_URL=https://projeto-final-zambom.onrender.com
```

5. Faça o deploy e acesse a URL gerada pelo Vercel.

O arquivo `vercel.json` já configura o fallback das rotas do React para
`index.html`, evitando erro 404 ao atualizar páginas internas.