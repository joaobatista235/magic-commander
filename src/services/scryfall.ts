export interface ScryfallCard {
  id: string;
  name: string;
  mana_cost?: string;
  type_line: string;
  image_uris?: {
    small: string;
    normal: string;
    large: string;
  };
  card_faces?: {
    image_uris?: {
      small: string;
      normal: string;
      large: string;
    };
  }[];
}

export interface ScryfallSearchResponse {
  data: ScryfallCard[];
  has_more: boolean;
  next_page?: string;
}

export async function searchCards(query: string, page: number = 1): Promise<ScryfallSearchResponse> {
  const finalQuery = query.trim() || 'f:commander sort:edhrec';
  const encodedQuery = encodeURIComponent(finalQuery);
  const response = await fetch(`https://api.scryfall.com/cards/search?q=${encodedQuery}&page=${page}`);
  
  if (!response.ok) {
    if (response.status === 404) {
      return { data: [], has_more: false };
    }
    throw new Error('Falha ao buscar cartas');
  }

  return await response.json();
}

export async function fetchCardByName(name: string): Promise<ScryfallCard | null> {
  const response = await fetch(`https://api.scryfall.com/cards/named?exact=${encodeURIComponent(name)}`);
  if (!response.ok) return null;
  return await response.json();
}

// Busca múltiplas cartas por nome de uma vez usando a Collection endpoint
// Limite de 75 identificadores por requisição
export async function fetchCardCollection(names: string[]): Promise<ScryfallCard[]> {
  const identifiers = names.map(name => ({ name }));
  const results: ScryfallCard[] = [];
  
  for (let i = 0; i < identifiers.length; i += 75) {
    const chunk = identifiers.slice(i, i + 75);
    const response = await fetch('https://api.scryfall.com/cards/collection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifiers: chunk }),
    });
    
    if (!response.ok) continue;
    const data = await response.json();
    if (data.data) results.push(...data.data);
    
    // Respeitar rate limit do Scryfall
    if (i + 75 < identifiers.length) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  
  return results;
}
