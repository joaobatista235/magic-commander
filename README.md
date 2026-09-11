# Magic Commander

O "Discord + Figma + Cockatrice" para Commander.
Plataforma online web para jogar Magic: The Gathering de forma fluida, bonita e totalmente focada em sincronização multiplayer, sem validação arbitrária de regras automáticas.

## Stack 

- **Frontend**: React, TypeScript, Vite, Vanilla CSS.
- **Backend (Planejado)**: NestJS, PostgreSQL, Redis, WebSockets.

## Como Executar (Frontend - Desenvolvimento)

*(Estas instruções presumem que você gerou o projeto com React/Vite).*

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Execute o ambiente de desenvolvimento:**
   ```bash
   npm run dev
   ```

3. Abra o link gerado no terminal (geralmente `http://localhost:5173`) no seu navegador.

## Build para Produção

```bash
npm run build
```
O resultado será gerado na pasta `dist/`.

## Documentação do Projeto

Leia os seguintes arquivos para entender a arquitetura, regras visuais e próximos passos:
- [CLAUDE.md](./CLAUDE.md) - Regras de desenvolvimento e inteligência do projeto
- [ROADMAP.md](./ROADMAP.md) - Tarefas e Fases
- [ARCHITECTURE.md](./ARCHITECTURE.md) - Estrutura de código e arquitetura
- [UI_UX.md](./UI_UX.md) - Padrões de design visual e interação
- [DATABASE.md](./DATABASE.md) - Modelagem das tabelas e relacionamentos
