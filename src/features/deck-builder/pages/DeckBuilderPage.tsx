import DeckList from '../components/DeckList';
import CardSearch from '../components/CardSearch';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function DeckBuilderPage() {
  const navigate = useNavigate();

  return (
    <div className="h-screen w-full flex flex-col bg-zinc-950 overflow-hidden">
      <header className="h-14 border-b border-zinc-800 flex items-center px-4 shrink-0 bg-zinc-900/50">
        <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')} className="text-zinc-400 hover:text-zinc-100">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="ml-4 font-semibold text-zinc-100">Editor de Deck</h1>
      </header>
      
      <main className="flex-1 flex overflow-hidden">
        <DeckList />
        <CardSearch />
      </main>
    </div>
  );
}
