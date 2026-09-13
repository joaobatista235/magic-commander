import { create } from 'zustand';
import { battlefieldService, type BattlefieldEvent } from '@/services/battlefieldService';
import { v4 as uuidv4 } from 'uuid';

export type Zone = 'LIBRARY' | 'HAND' | 'BATTLEFIELD' | 'GRAVEYARD' | 'EXILE' | 'COMMAND';
export type TurnPhase = 'UNTAP' | 'UPKEEP' | 'DRAW' | 'MAIN_1' | 'COMBAT' | 'MAIN_2' | 'END';

export interface GameCardInstance {
  instanceId: string;
  ownerId: string;
  scryfallId: string;
  name: string;
  imageUrl: string;
  zone: Zone;
  x: number;
  y: number;
  tapped: boolean;
  faceDown: boolean;
  isCommander: boolean;
  counters: number;
  order: number;
  typeLine?: string;
}

export interface PlayerState {
  userId: string;
  life: number;
  commanderDamage: Record<string, number>;
}

export interface Arrow {
  id: string;
  fromInstanceId: string;
  toInstanceId?: string;
  toUserId?: string;
  color: string;
}

interface BattlefieldState {
  cards: Record<string, GameCardInstance>;
  players: Record<string, PlayerState>;
  myUserId: string | null;
  roomId: string | null;
  hoveredCardBoard: GameCardInstance | null;
  selectedCards: string[];
  arrows: Arrow[];
  drawingArrowFrom: string | null;
  
  // Turn Control
  activePlayerId: string | null;
  currentPhase: TurnPhase;

  initGame: (roomId: string, myUserId: string, myDeckCards: GameCardInstance[]) => void;
  setHoveredCardBoard: (card: GameCardInstance | null) => void;
  toggleCardSelection: (instanceId: string, multi: boolean) => void;
  clearSelection: () => void;
  tapSelected: () => void;
  
  // Arrows
  addArrow: (arrow: Arrow) => void;
  removeArrow: (id: string) => void;
  clearArrows: () => void;
  setDrawingArrowFrom: (id: string | null) => void;
  
  
  // Tokens
  createToken: (name: string, power: string, toughness: string, imageUrl?: string) => void;
  cloneCard: (instanceId: string) => void;
  
  // AÃƒÂ§ÃƒÂµes Locais (Atualizam o estado e disparam o Broadcast)
  moveCard: (instanceId: string, x: number, y: number) => void;
  tapCard: (instanceId: string) => void;
  changeZone: (instanceId: string, zone: Zone) => void;
  changeLife: (userId: string, delta: number) => void;
  updateCounters: (instanceId: string, delta: number) => void;
  drawCards: (count: number) => void;
  shuffleLibrary: () => void;
  mulligan: () => void;
  
  // Turn Actions
  setPhase: (phase: TurnPhase) => void;
  passTurn: () => void;
  untapAll: () => void;
  
  // Utils
  autoArrange: () => void;
  
  // Handler para receber eventos de outros jogadores
  handleBroadcast: (event: BattlefieldEvent) => void;
}

export const useBattlefieldStore = create<BattlefieldState>((set, get) => ({
  cards: {},
  players: {},
  myUserId: null,
  roomId: null,
  hoveredCardBoard: null,
  selectedCards: [],
  arrows: [],
  drawingArrowFrom: null,
  activePlayerId: null,
  currentPhase: 'UNTAP',

  setHoveredCardBoard: (card) => set({ hoveredCardBoard: card }),

  toggleCardSelection: (instanceId, multi) => {
    set((state) => {
      if (multi) {
        if (state.selectedCards.includes(instanceId)) {
          return { selectedCards: state.selectedCards.filter(id => id !== instanceId) };
        } else {
          return { selectedCards: [...state.selectedCards, instanceId] };
        }
      } else {
        return { selectedCards: [instanceId] };
      }
    });
  },

  clearSelection: () => set({ selectedCards: [] }),

  tapSelected: () => {
    const { cards, selectedCards, myUserId } = get();
    if (!myUserId || selectedCards.length === 0) return;

    let updated = false;
    const newCards = { ...cards };

    selectedCards.forEach(instanceId => {
      const card = newCards[instanceId];
      if (card && card.ownerId === myUserId) {
        newCards[instanceId] = { ...card, tapped: !card.tapped };
        updated = true;
        battlefieldService.broadcast('TAP_CARD', myUserId, { instanceId, tapped: newCards[instanceId].tapped });
      }
    });

    if (updated) {
      set({ cards: newCards, selectedCards: [] });
    }
  },

  initGame: (roomId, myUserId, myDeckCards) => {
    // Reset completo: garante que nao carrega estado de salas anteriores
    const freshCards: Record<string, any> = {};
    myDeckCards.forEach(c => {
      freshCards[c.instanceId] = c;
    });

    const freshPlayers: Record<string, any> = {};
    freshPlayers[myUserId] = { userId: myUserId, life: 40, commanderDamage: {} };

    // activePlayerId: mantém o turno atual se já foi definido por outro jogador,
    // caso contrário o primeiro a entrar assume o turno inicial.
    const currentActive = get().activePlayerId;
    const newActivePlayerId = currentActive ?? myUserId;

    set({ roomId, myUserId, cards: freshCards, players: freshPlayers, hoveredCardBoard: null, selectedCards: [], arrows: [], activePlayerId: newActivePlayerId });

    // Transmite meu estado para os outros na sala (onde minhas cartas estão)
    battlefieldService.broadcast('SYNC_PLAYER_STATE', myUserId, {
      cards: myDeckCards,
      player: freshPlayers[myUserId],
      activePlayerId: newActivePlayerId,
    });
  },

  addArrow: (arrow) => {
    set((state) => ({ arrows: [...state.arrows, arrow] }));
    const { myUserId } = get();
    if (myUserId) battlefieldService.broadcast('ADD_ARROW', myUserId, { arrow });
  },

  removeArrow: (id) => {
    set((state) => ({ arrows: state.arrows.filter(a => a.id !== id) }));
    const { myUserId } = get();
    if (myUserId) battlefieldService.broadcast('REMOVE_ARROW', myUserId, { arrowId: id });
  },

  clearArrows: () => {
    set({ arrows: [] });
    const { myUserId } = get();
    if (myUserId) battlefieldService.broadcast('CLEAR_ARROWS', myUserId, {});
  },

  setDrawingArrowFrom: (id) => set({ drawingArrowFrom: id }),

  moveCard: (instanceId, x, y) => {
    const { cards, myUserId } = get();
    const card = cards[instanceId];
    if (!card || !myUserId) return;

    // Atualiza localmente
    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: { ...state.cards[instanceId], x, y }
      }
    }));

    // Avisa o servidor
    battlefieldService.broadcast('MOVE_CARD', myUserId, { instanceId, x, y });
  },

  tapCard: (instanceId) => {
    const { cards, myUserId } = get();
    const card = cards[instanceId];
    if (!card || !myUserId) return;

    const newTapped = !card.tapped;
    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: { ...state.cards[instanceId], tapped: newTapped }
      }
    }));

    battlefieldService.broadcast('TAP_CARD', myUserId, { instanceId, tapped: newTapped });
  },

  changeZone: (instanceId, zone) => {
    const { cards, myUserId } = get();
    const card = cards[instanceId];
    if (!card || !myUserId) return;

    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: { ...state.cards[instanceId], zone }
      }
    }));

    battlefieldService.broadcast('CHANGE_ZONE', myUserId, { instanceId, zone });
  },

  changeLife: (userId, delta) => {
    const { players, myUserId } = get();
    const p = players[userId];
    if (!p || !myUserId) return;

    const newLife = p.life + delta;
    set((state) => ({
      players: {
        ...state.players,
        [userId]: { ...state.players[userId], life: newLife }
      }
    }));

    battlefieldService.broadcast('CHANGE_LIFE', myUserId, { targetUserId: userId, life: newLife });
  },

  updateCounters: (instanceId, delta) => {
    const { cards, myUserId } = get();
    const card = cards[instanceId];
    if (!card || !myUserId) return;

    const newCounters = card.counters + delta;
    set((state) => ({
      cards: {
        ...state.cards,
        [instanceId]: { ...state.cards[instanceId], counters: newCounters }
      }
    }));

    battlefieldService.broadcast('UPDATE_COUNTERS', myUserId, { instanceId, counters: newCounters });
  },

  drawCards: (count) => {
    const { cards, myUserId } = get();
    if (!myUserId) return;

    const myLibrary = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'LIBRARY');
    
    // Sort by order
    const sortedLibrary = [...myLibrary].sort((a, b) => a.order - b.order);
    const toDraw = sortedLibrary.slice(0, count);

    if (toDraw.length === 0) return;

    set((state) => {
      const newCards = { ...state.cards };
      toDraw.forEach(c => {
        newCards[c.instanceId] = { ...c, zone: 'HAND' };
        battlefieldService.broadcast('CHANGE_ZONE', myUserId, { instanceId: c.instanceId, zone: 'HAND' });
      });
      return { cards: newCards };
    });
  },

  shuffleLibrary: () => {
    const { cards, myUserId } = get();
    if (!myUserId) return;

    const myLibrary = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'LIBRARY');
    
    // Create new order array and shuffle it
    const newOrders = myLibrary.map((_, i) => i).sort(() => Math.random() - 0.5);
    
    set((state) => {
      const newCards = { ...state.cards };
      myLibrary.forEach((c, index) => {
        newCards[c.instanceId] = { ...c, order: newOrders[index] };
      });
      return { cards: newCards };
    });

    // We can broadcast a simple event to show a notification to other players
    battlefieldService.broadcast('SHUFFLE_LIBRARY', myUserId, {});
  },

  createToken: (name, power, toughness, imageUrl) => {
    const { myUserId } = get();
    if (!myUserId) return;

    const tokenInstanceId = crypto.randomUUID();
    // Spawn in the center of the player's board area (left side - 240px sidebar)
    const boardW = window.innerWidth - 240;
    const boardH = window.innerHeight * 0.45; // bottom 45%
    const token: GameCardInstance = {
      instanceId: tokenInstanceId,
      ownerId: myUserId,
      scryfallId: 'token',
      name: name || 'Token',
      imageUrl: imageUrl || 'https://cards.scryfall.io/large/front/1/7/17b124eb-6d0d-4fb1-b580-c1bc68f3a8b2.jpg?1696660144', // Generic token art
      zone: 'BATTLEFIELD',
      x: Math.max(20, boardW / 2 - 50),
      y: Math.max(20, boardH / 2 - 70),
      tapped: false,
      faceDown: false,
      isCommander: false,
      counters: 0,
      order: 0,
      typeLine: `Token Criatura — ${power}/${toughness}`
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [tokenInstanceId]: token
      }
    }));

    battlefieldService.broadcast('CREATE_TOKEN', myUserId, { token });
  },

  cloneCard: (instanceId) => {
    const { cards, myUserId } = get();
    const originalCard = cards[instanceId];
    
    if (!myUserId || !originalCard) return;

    const cloneInstanceId = crypto.randomUUID();
    const clonedCard: GameCardInstance = {
      ...originalCard,
      instanceId: cloneInstanceId,
      name: `${originalCard.name} (Cópia)`,
      x: originalCard.x + 20,
      y: originalCard.y + 20,
      tapped: false,
      counters: 0,
      order: 0,
      isCommander: false, // Copies of commanders are not commanders
    };

    set((state) => ({
      cards: {
        ...state.cards,
        [cloneInstanceId]: clonedCard
      }
    }));

    // We can just use the CREATE_TOKEN event to broadcast new cards
    battlefieldService.broadcast('CREATE_TOKEN', myUserId, { token: clonedCard });
  },

  mulligan: () => {
    const { cards, myUserId } = get();
    if (!myUserId) return;

    const myHand = Object.values(cards).filter(c => c.ownerId === myUserId && c.zone === 'HAND');
    
    set((state) => {
      const newCards = { ...state.cards };
      
      // Mover tudo da mão para o grimório
      myHand.forEach(c => {
        newCards[c.instanceId] = { ...c, zone: 'LIBRARY' };
        battlefieldService.broadcast('CHANGE_ZONE', myUserId, { instanceId: c.instanceId, zone: 'LIBRARY' });
      });

      return { cards: newCards };
    });

    // Depois de mover pro grimório, precisamos embaralhar e comprar 7.
    // O grimório inteiro deve ser re-embaralhado.
    // Como os IDs e posições já não importam pois a view do grimório não reflete a ordem, 
    // apenas pegar os próximos 7 no drawCards que pegam pseudo-random (porque os IDs não são sequenciais)
    // Para ser mais "correto", podemos embaralhar a ordem se tivéssemos um array.
    // Vamos apenas chamar drawCards 7 vezes ou uma de 7.
    setTimeout(() => {
      get().drawCards(7);
    }, 100);
  },

  setPhase: (phase) => {
    const { myUserId } = get();
    set({ currentPhase: phase });
    if (myUserId) battlefieldService.broadcast('SYNC_PHASE', myUserId, { phase });
  },

  passTurn: () => {
    const { players, activePlayerId, myUserId } = get();
    const playerIds = Object.keys(players).sort(); // Sort para ter uma ordem consistente
    const currentIndex = playerIds.indexOf(activePlayerId || myUserId || '');
    const nextIndex = (currentIndex + 1) % playerIds.length;
    const nextPlayerId = playerIds[nextIndex];
    
    set({ activePlayerId: nextPlayerId, currentPhase: 'UNTAP' });
    if (myUserId) {
      battlefieldService.broadcast('SYNC_TURN', myUserId, { activePlayerId: nextPlayerId });
    }
  },

  untapAll: () => {
    const { cards, myUserId } = get();
    if (!myUserId) return;
    
    let updated = false;
    const newCards = { ...cards };
    
    Object.values(newCards).forEach(card => {
      if (card.ownerId === myUserId && card.zone === 'BATTLEFIELD' && card.tapped) {
        newCards[card.instanceId] = { ...card, tapped: false };
        updated = true;
      }
    });
    
    if (updated) {
      set({ cards: newCards });
      // Podemos enviar um evento massivo ou um evento customizado. O mais facil e enviar todo meu deck pra garantir
      const myCardsList = Object.values(newCards).filter(c => c.ownerId === myUserId);
      battlefieldService.broadcast('SYNC_PLAYER_STATE', myUserId, {
        cards: myCardsList,
        player: get().players[myUserId],
      });
    }
  },

  autoArrange: () => {
    const { cards, myUserId } = get();
    if (!myUserId) return;
    
    let updated = false;
    const newCards = { ...cards };
    const myField = Object.values(newCards).filter(c => c.ownerId === myUserId && c.zone === 'BATTLEFIELD');
    
    // Separate lands from non-lands (creatures, artifacts, enchantments, planeswalkers)
    const isLand = (c: GameCardInstance) => (c.typeLine || '').toLowerCase().includes('land');
    const lands = myField.filter(isLand);
    const nonLands = myField.filter(c => !isLand(c));

    // Non-lands go to the upper creature zone (y starts near 0)
    nonLands.forEach((c, i) => {
      newCards[c.instanceId] = { ...c, x: 20 + (i % 8) * 110, y: 20 + Math.floor(i / 8) * 150 };
      updated = true;
    });
    
    // Lands go to the lower land zone — offset below creatures section
    const landRowOffset = nonLands.length > 0 ? Math.ceil(nonLands.length / 8) * 150 + 40 : 20;
    lands.forEach((c, i) => {
      newCards[c.instanceId] = { ...c, x: 20 + (i % 8) * 110, y: landRowOffset + Math.floor(i / 8) * 150 };
      updated = true;
    });
    
    if (updated) {
      set({ cards: newCards });
      const myCardsList = Object.values(newCards).filter(c => c.ownerId === myUserId);
      battlefieldService.broadcast('SYNC_PLAYER_STATE', myUserId, {
        cards: myCardsList,
        player: get().players[myUserId],
      });
    }
  },

  handleBroadcast: (event) => {
    const { type, userId, payload } = event;
    const { myUserId } = get();

    // Ignora eventos que eu mesmo enviei
    if (userId === myUserId) return;

    switch (type) {
      case 'SYNC_PLAYER_STATE': {
        const { cards: remoteCards, player: remotePlayer, activePlayerId: remoteActiveId } = payload;
        set((state) => {
          const newCards = { ...state.cards };
          remoteCards.forEach((c: GameCardInstance) => {
            newCards[c.instanceId] = c;
          });
          return {
            cards: newCards,
            players: {
              ...state.players,
              [remotePlayer.userId]: remotePlayer
            },
            // Respeitar o activePlayerId remoto somente se não temos um definido
            ...(state.activePlayerId === null && remoteActiveId ? { activePlayerId: remoteActiveId } : {}),
          };
        });

        // Responder com o NOSSO estado para que o jogador que acabou de
        // entrar veja a nossa mesa. Usamos SYNC_RESPONSE para não criar
        // loop (SYNC_RESPONSE não dispara outra resposta).
        {
          const { myUserId, cards: currentCards, players: currentPlayers, activePlayerId: currentActive } = get();
          if (myUserId) {
            const myCardsList = Object.values(currentCards).filter(c => c.ownerId === myUserId);
            const myPlayer = currentPlayers[myUserId];
            battlefieldService.broadcast('SYNC_RESPONSE', myUserId, {
              cards: myCardsList,
              player: myPlayer,
              activePlayerId: currentActive,
            });
          }
        }
        break;
      }
      case 'SYNC_RESPONSE': {
        // Mesmo comportamento do SYNC_PLAYER_STATE, mas SEM disparar nova resposta
        const { cards: remoteCards, player: remotePlayer, activePlayerId: remoteActiveId } = payload;
        set((state) => {
          const newCards = { ...state.cards };
          remoteCards.forEach((c: GameCardInstance) => {
            newCards[c.instanceId] = c;
          });
          return {
            cards: newCards,
            players: {
              ...state.players,
              [remotePlayer.userId]: remotePlayer
            },
            // Aceitar o activePlayerId da resposta se ainda não definido
            ...(state.activePlayerId === null && remoteActiveId ? { activePlayerId: remoteActiveId } : {}),
          };
        });
        break;
      }
      case 'MOVE_CARD': {
        const { instanceId, x, y } = payload;
        set((state) => ({
          cards: {
            ...state.cards,
            [instanceId]: { ...state.cards[instanceId], x, y }
          }
        }));
        break;
      }
      case 'TAP_CARD': {
        const { instanceId, tapped } = payload;
        set((state) => ({
          cards: {
            ...state.cards,
            [instanceId]: { ...state.cards[instanceId], tapped }
          }
        }));
        break;
      }
      case 'CHANGE_ZONE': {
        const { instanceId, zone } = payload;
        set((state) => ({
          cards: {
            ...state.cards,
            [instanceId]: { ...state.cards[instanceId], zone }
          }
        }));
        break;
      }
      case 'CHANGE_LIFE': {
        const { targetUserId, life } = payload;
        set((state) => ({
          players: {
            ...state.players,
            [targetUserId]: { ...state.players[targetUserId], life }
          }
        }));
        break;
      }
      case 'UPDATE_COUNTERS': {
        const { instanceId, counters } = payload;
        set((state) => ({
          cards: {
            ...state.cards,
            [instanceId]: { ...state.cards[instanceId], counters }
          }
        }));
        break;
      }
      case 'SYNC_PHASE': {
        const { phase } = payload;
        set({ currentPhase: phase });
        break;
      }
      case 'ADD_ARROW': {
        const { arrow } = payload;
        set((state) => ({ arrows: [...state.arrows, arrow] }));
        break;
      }
      case 'REMOVE_ARROW': {
        const { arrowId } = payload;
        set((state) => ({ arrows: state.arrows.filter(a => a.id !== arrowId) }));
        break;
      }
      case 'CLEAR_ARROWS': {
        set({ arrows: [] });
        break;
      }
      case 'CREATE_TOKEN': {
        const { token } = payload;
        set((state) => ({
          cards: {
            ...state.cards,
            [token.instanceId]: token
          }
        }));
        break;
      }
      case 'SYNC_TURN': {
        const { activePlayerId } = payload;
        set({ activePlayerId, currentPhase: 'UNTAP' });
        break;
      }
    }
  }
}));

// Função utilitária para converter as cartas salvas no Deck do banco
// em instâncias para o Battlefield.
export function generateDeckInstances(ownerId: string, savedCards: any[]): GameCardInstance[] {
  const instances: GameCardInstance[] = [];
  
  for (const card of savedCards) {
    for (let i = 0; i < card.quantity; i++) {
      instances.push({
        instanceId: uuidv4(),
        ownerId,
        scryfallId: card.cardId || card.id, // suporte se estivermos lendo do db ou local
        name: card.name,
        imageUrl: card.image_url || card.imageUrl, // Suporte para o DB e para o estado local
        zone: (card.isCommander || card.is_commander) ? 'COMMAND' : 'LIBRARY',
        x: 0,
        y: 0,
        tapped: false,
        faceDown: false, // Todas as cartas entram "face up" no campo por padrão
        isCommander: card.isCommander || card.is_commander || false,
        counters: 0,
        order: Math.random(), // initial shuffle
        typeLine: card.type_line || card.typeLine || '',
      });
    }
  }
  
  // Embaralhar as cartas (fisher-yates simples), ignorando os comandantes que já estão no Command Zone
  const library = instances.filter(c => c.zone === 'LIBRARY');
  for (let i = library.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [library[i], library[j]] = [library[j], library[i]];
  }
  
  // Retorna comandantes + library embaralhada
  return [...instances.filter(c => c.zone === 'COMMAND'), ...library];
}



