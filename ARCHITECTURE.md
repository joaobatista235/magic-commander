# Arquitetura do Projeto

A arquitetura foca na separação clara de responsabilidades, utilizando Clean Architecture simplificada e Feature-First.

## Stack Tecnológica

- **Frontend:** React (com Vite) + TypeScript + Tailwind CSS
- **Backend / Banco de Dados / Auth:** Supabase (PostgreSQL Gerenciado + Autenticação + Realtime)
- **Hospedagem Frontend:** Vercel ou Netlify (Grátis)
- **APIs Externas:** Scryfall, MTGJSON

## Organização de Pastas (Frontend)

O frontend deve seguir uma estrutura baseada em features:

```
src/
├── components/   # Componentes visuais compartilhados (Botões, Inputs, Cartas genéricas)
├── features/     # Módulos funcionais isolados (ex: auth, deck-builder, battlefield)
├── hooks/        # Lógicas customizadas reutilizáveis do React
├── services/     # Integrações com APIs externas, WebSockets e lógica de rede
├── stores/       # Gerenciamento de estado global (Zustand, Redux, ou Context API)
├── types/        # Definições globais do TypeScript
└── utils/        # Funções auxiliares, formatações e constantes globais
```

## Padrões Arquiteturais

- **Clean Architecture & Services:** A UI (`components/`, `features/`) não deve conter lógica complexa de requisição ou processamento de dados puro. Isso vai para `services/` e `hooks/`.
- **Feature First:** Desenvolver por funcionalidade. Se o `deck-builder` precisa de componentes específicos só dele, crie dentro de `src/features/deck-builder/components/` e não no root `components/`.
- **Sincronização (Supabase Realtime):** O servidor trafega eventos via WebSockets do Supabase (`DRAW_CARD`, `MOVE_CARD`), e o client atualiza o `store` global, refletindo na UI instantaneamente.

## Arquitetura de Comunicação (Visão Geral)

1. Usuário faz uma ação visual (ex: clica e arrasta carta).
2. O `store` local atualiza otimisticamente (para UX rápida).
3. Um evento WebSocket (Supabase Realtime Broadcast) é emitido.
4. O Supabase recebe e faz *broadcast* instantâneo para os outros clientes da sala (através de canais de broadcast).
5. Os outros clientes recebem o evento e atualizam seus respectivos `stores`.
