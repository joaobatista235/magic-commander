import { supabase } from '@/lib/supabase';
import type { Deck, DeckCard } from '@/stores/deckStore';

export interface RemoteDeck {
  id: string;
  user_id: string;
  name: string;
  commander_name: string | null;
  commander_image_url: string | null;
  created_at: string;
  updated_at: string;
}

export async function fetchDecks(): Promise<Deck[]> {
  const { data: decksData, error: decksError } = await supabase
    .from('decks')
    .select('*')
    .order('updated_at', { ascending: false });

  if (decksError || !decksData) return [];

  const deckIds = decksData.map(d => d.id);
  
  const { data: cardsData } = await supabase
    .from('deck_cards')
    .select('*')
    .in('deck_id', deckIds);

  return decksData.map(deck => {
    const cards = (cardsData || [])
      .filter(c => c.deck_id === deck.id)
      .map(c => ({
        id: c.card_id,
        name: c.name,
        type_line: c.type_line || '',
        mana_cost: c.mana_cost || '',
        image_uris: c.image_url ? { small: c.image_url, normal: c.image_url, large: c.image_url } : undefined,
        quantity: c.quantity,
        isCommander: c.is_commander,
      })) as DeckCard[];

    return {
      id: deck.id,
      name: deck.name,
      cards,
      updatedAt: new Date(deck.updated_at).getTime(),
    };
  });
}

export async function upsertDeck(deck: Deck, userId: string): Promise<string | null> {
  const commander = deck.cards.find(c => c.isCommander);
  const commanderImageUrl =
    commander?.image_uris?.normal ||
    (commander as any)?.card_faces?.[0]?.image_uris?.normal ||
    null;

  const { data, error } = await supabase
    .from('decks')
    .upsert({
      id: deck.id,
      user_id: userId,
      name: deck.name,
      commander_name: commander?.name || null,
      commander_image_url: commanderImageUrl,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id')
    .single();

  if (error || !data) return null;

  const deckId = data.id;

  await supabase.from('deck_cards').delete().eq('deck_id', deckId);

  if (deck.cards.length > 0) {
    const rows = deck.cards.map(c => ({
      deck_id: deckId,
      card_id: c.id,
      name: c.name,
      type_line: c.type_line,
      mana_cost: c.mana_cost,
      image_url: c.image_uris?.normal || (c as any).card_faces?.[0]?.image_uris?.normal || null,
      quantity: c.quantity,
      is_commander: c.isCommander,
    }));

    await supabase.from('deck_cards').insert(rows);
  }

  return deckId;
}

export async function deleteDeckRemote(deckId: string): Promise<void> {
  await supabase.from('decks').delete().eq('id', deckId);
}
