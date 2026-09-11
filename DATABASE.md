# Entidades do Banco de Dados

Esta é uma modelagem inicial simplificada das principais entidades do **Magic Commander**.
Ela serve como guia para a construção dos modelos (seja no Prisma, TypeORM, ou Typescript types).

## Entidades Principais

### `User`
Representa um jogador cadastrado.
- `id` (UUID)
- `email` (String, único)
- `displayName` (String)
- `avatarUrl` (String)
- `status` (Enum: ONLINE, OFFLINE, PLAYING)
- `createdAt` (DateTime)

### `Deck`
Biblioteca de decks de um usuário.
- `id` (UUID)
- `userId` (UUID, Foreign Key)
- `name` (String)
- `commanderName` (String)
- `commanderImageUrl` (String)
- `description` (Text)
- `isPublic` (Boolean)
- `createdAt` / `updatedAt` (DateTime)

### `DeckCard`
A lista de cartas vinculada a um deck.
- `id` (UUID)
- `deckId` (UUID, Foreign Key)
- `cardId` (String - ID externo, ex: Scryfall ID)
- `name` (String)
- `quantity` (Int)
- `isCommander` (Boolean)

### `Room`
Sala de partida (Lobby).
- `id` (UUID)
- `ownerId` (UUID, Foreign Key)
- `name` (String)
- `password` (String, opcional)
- `maxPlayers` (Int, padrão 4)
- `status` (Enum: WAITING, PLAYING, FINISHED)

### `Player` (Lobby/Match Player)
Participação de um usuário em uma sala/partida.
- `id` (UUID)
- `roomId` (UUID, Foreign Key)
- `userId` (UUID, Foreign Key)
- `deckId` (UUID, Foreign Key)
- `isReady` (Boolean)
- `lifeTotal` (Int, padrão 40)
- `commanderDamage` (JSON/Dictionary)

### `Friend`
Lista de amigos.
- `id` (UUID)
- `userId1` (UUID)
- `userId2` (UUID)
- `status` (Enum: PENDING, ACCEPTED)

### `Message`
Chat persistido (Lobby ou Geral).
- `id` (UUID)
- `roomId` (UUID, opcional, Foreign Key)
- `userId` (UUID, Foreign Key)
- `content` (Text)
- `createdAt` (DateTime)

---
*Nota: Detalhes de implementação da partida (posição da carta no board, zonas como Cemitério/Exílio) não precisam ir para o banco relacional de imediato, e sim serem gerenciados na memória do servidor WebSocket/Redis duramente a partida, e persistidos temporariamente no estado do jogo.*
