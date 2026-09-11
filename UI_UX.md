# UI e UX (User Interface e User Experience)

O foco do **Magic Commander** é fornecer uma experiência premium e dinâmica, lembrando um videogame moderno ou um aplicativo de alta produtividade (como Discord, Linear, Notion), mas focado exclusivamente no jogo e na facilidade de uso.

## Inspiração Visual

- **Discord / Linear:** Para organização geral do layout, barras laterais (chat/lobbies) e uso de cores sólidas e modernas.
- **Magic Arena:** Para a apresentação do campo de batalha (Battlefield), disposição das cartas e feedback visual de interações.

## Regras de Design

1. **Dark Theme:** Padrão e principal.
2. **Design Dinâmico & Glassmorphism:** Onde fizer sentido (ex: modais, backgrounds leves), use desfoques e transparências sutis para dar profundidade, mas mantenha a clareza e performance.
3. **Bordas Suaves & Espaçamentos Grandes:** Elementos não devem ficar grudados. Use paddings confortáveis (ex: múltiplos de 4px ou 8px em CSS/Tailwind) e border-radius sutis (ex: `8px` a `12px`).
4. **Animações Discretas (Micro-interações):**
   - Transições de hover em botões e cartas (duração de 150ms-300ms, curva `ease`).
   - *Nunca* use animações pesadas ou exageradas que afetem a responsividade.
5. **Poucos Botões:** Esconda opções secundárias em menus de contexto (click-direito ou ícone de 3 pontos). Apenas ações primárias ("Comprar Carta", "Pronto") devem estar visíveis o tempo todo.
6. **Mínimo de Modais:** Não abra modais a menos que seja estritamente necessário (ex: configurações avançadas). Para a maioria das ações, use painéis laterais ou menus popover locais.
7. **Interação com a Carta:**
   - **Hover:** Aumenta ligeiramente a carta no próprio lugar ou destaca.
   - **Clique:** Exibe um preview lateral de alta resolução em um painel fixo.
   - **Ações Rápidas (1 clique):** Arrastar, virar (tap) ou alterar status precisam ser o mais direto possível.

## Estilização (Tailwind CSS + shadcn/ui)

Para acelerar o desenvolvimento sem perder o controle da identidade visual, utilizaremos **Tailwind CSS** em conjunto com **shadcn/ui** (baseado no Radix UI).

- **shadcn/ui:** Não é uma biblioteca de componentes instalada via npm, mas sim componentes copiados para o projeto. Isso nos dá controle absoluto sobre o código e a estilização para adaptar à nossa identidade (Dark theme, bordas suaves, visual premium).
- **Tailwind CSS:** Utilizado para estilização rápida e utilitária. 
- **Tokens e Variáveis:** As cores principais (background, primary, accent, etc.) devem ser definidas como variáveis CSS e injetadas nas configurações do Tailwind, garantindo facilidade de alteração de temas.
- **Tipografia Moderna:** Usar fontes sem serifa modernas (Inter, Roboto ou Outfit) configuradas globalmente.
