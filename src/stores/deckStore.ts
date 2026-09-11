import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ScryfallCard } from '../services/scryfall';
import { v4 as uuidv4 } from 'uuid';

export interface DeckCard extends ScryfallCard {
  quantity: number;
  isCommander: boolean;
}

export interface Deck {
  id: string;
  name: string;
  cards: DeckCard[];
  updatedAt: number;
}

interface DeckState {
  decks: Deck[];
  activeDeckId: string | null;
  cards: DeckCard[];
  syncing: boolean;

  addCard: (card: ScryfallCard) => void;
  removeCard: (cardId: string) => void;
  setCommander: (cardId: string) => void;
  clearDeck: () => void;

  createNewDeck: () => string;
  loadDeck: (id: string) => void;
  setDecks: (decks: Deck[]) => void;
  saveCurrentDeck: (name?: string) => Deck | null;
  deleteDeck: (id: string) => void;
  setSyncing: (v: boolean) => void;
}

export const useDeckStore = create<DeckState>()(
  persist(
    (set, get) => ({
      decks: [],
      activeDeckId: null,
      cards: [],
      syncing: false,

      setSyncing: (v) => set({ syncing: v }),

      setDecks: (decks) => set({ decks }),

      addCard: (card) => set((state) => {
        const existing = state.cards.find(c => c.id === card.id);
        if (existing) {
          return {
            cards: state.cards.map(c =>
              c.id === card.id ? { ...c, quantity: c.quantity + 1 } : c
            )
          };
        }
        return {
          cards: [...state.cards, { ...card, quantity: 1, isCommander: false }]
        };
      }),

      removeCard: (cardId) => set((state) => {
        const existing = state.cards.find(c => c.id === cardId);
        if (existing && existing.quantity > 1) {
          return {
            cards: state.cards.map(c =>
              c.id === cardId ? { ...c, quantity: c.quantity - 1 } : c
            )
          };
        }
        return {
          cards: state.cards.filter(c => c.id !== cardId)
        };
      }),

      setCommander: (cardId) => set((state) => ({
        cards: state.cards.map(c => ({
          ...c,
          isCommander: c.id === cardId
        }))
      })),

      clearDeck: () => set({ cards: [] }),

      createNewDeck: () => {
        const id = uuidv4();
        set({ activeDeckId: id, cards: [] });
        return id;
      },

      loadDeck: (id) => set((state) => {
        const deck = state.decks.find(d => d.id === id);
        if (deck) {
          return { activeDeckId: id, cards: deck.cards };
        }
        return state;
      }),

      saveCurrentDeck: (name) => {
        const state = get();
        if (!state.activeDeckId) return null;

        const existingDeck = state.decks.find(d => d.id === state.activeDeckId);
        const deckName = name || existingDeck?.name || 'Novo Deck';

        const updatedDeck: Deck = {
          id: state.activeDeckId,
          name: deckName,
          cards: state.cards,
          updatedAt: Date.now()
        };

        const otherDecks = state.decks.filter(d => d.id !== state.activeDeckId);
        set({ decks: [updatedDeck, ...otherDecks] });
        return updatedDeck;
      },

      deleteDeck: (id) => set((state) => ({
        decks: state.decks.filter(d => d.id !== id),
        activeDeckId: state.activeDeckId === id ? null : state.activeDeckId,
        cards: state.activeDeckId === id ? [] : state.cards
      }))
    }),
    {
      name: 'magic-commander-decks'
    }
  )
);
