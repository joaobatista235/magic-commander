# Diretrizes de Desenvolvimento (O Cérebro do Projeto)

Este documento define a filosofia, os princípios e as regras obrigatórias para o desenvolvimento do **Magic Commander**.
Antes de implementar qualquer funcionalidade, a IA deve consultar este arquivo.

## Visão do Produto
O projeto é uma plataforma online web para partidas de Magic: The Gathering focada **exclusivamente no formato Commander**.
O objetivo é ser o "Discord + Figma + Cockatrice para Commander". 
Ele oferece toda a liberdade do Cockatrice (o sistema não valida regras), mas com uma experiência moderna, intuitiva, social e visualmente agradável, similar a um videogame moderno.

## Princípios do Projeto (Filosofia)

1. **O jogador sempre tem controle.** Nenhuma ação (exceto regras de sistema como draw inicial, se aplicável, e shuffle) será executada automaticamente sem que o jogador a solicite.
2. **O sistema sincroniza, não arbitra.** A plataforma não valida regras do Magic; ela apenas mantém todos os jogadores com o mesmo estado da mesa em tempo real.
3. **Commander em primeiro lugar.** Toda interface e experiência serão pensadas para partidas multiplayer de Commander (4+ jogadores).
4. **Um clique sempre que possível.** As ações mais comuns (comprar carta, alterar vida, adicionar marcadores, mover cartas) devem exigir o menor número de interações possível. Sem menus gigantes.
5. **A carta é o elemento central.** A interface deve destacar as cartas e o estado da mesa, evitando janelas e modais desnecessários. Hover aumenta a carta; Clique mostra em resolução máxima (com faces, se houver).
6. **Rápido de aprender, poderoso para dominar.** Sem necessidade de ler manuais, mas com atalhos para jogadores avançados.

## Regras Obrigatórias de Desenvolvimento

1. **Analise a arquitetura existente:** Sempre veja o que já foi construído antes de criar novas estruturas.
2. **Nunca duplique código:** DRY (Don't Repeat Yourself).
3. **Reaproveitamento:** Sempre reutilize componentes visuais e de lógica.
4. **TypeScript:** Sempre utilize TypeScript estrito. Nunca utilize `any`.
5. **Componentização:** Componentes devem ser pequenos e focados.
6. **Separação de Preocupações:** Nunca misture UI com regra de negócio.
7. **Hooks & Services:** Toda lógica compartilhada deve ir para `hooks/` ou `services/`.
8. **Estabilidade:** Nunca quebre funcionalidades existentes. Garanta que novas adições sejam isoladas se possível.
9. **Planejamento:** Toda implementação deve seguir o que está no `ROADMAP.md`.
10. **Composição > Herança:** Preferir composição ao construir a UI.
11. **Sem Comentários:** Nunca colocar comentários no código-fonte. O código deve ser autoexplicativo através de bons nomes de variáveis e funções.

> **Nota para a IA:** Este é um documento vivo. Atualize-o com novas decisões arquiteturais importantes ou regras de negócio descobertas ao longo do desenvolvimento.
