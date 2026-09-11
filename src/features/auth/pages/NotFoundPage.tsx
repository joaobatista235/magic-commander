import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Sword } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#080810] flex flex-col items-center justify-center text-zinc-100 px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-600/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="relative z-10 text-center"
      >
        <div className="flex items-center justify-center mb-6">
          <div className="w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-2xl flex items-center justify-center">
            <Sword className="w-10 h-10 text-zinc-600" />
          </div>
        </div>

        <h1 className="text-8xl font-black text-zinc-800 mb-2 tabular-nums tracking-tight">404</h1>
        <h2 className="text-2xl font-bold text-zinc-300 mb-3">Página não encontrada</h2>
        <p className="text-zinc-600 mb-10 max-w-md mx-auto text-sm">
          Esta página não existe ou foi movida. Talvez você tenha seguido um link inválido ou digitado a URL errada.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="h-11 px-6 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-sm font-medium transition-colors"
          >
            Voltar
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="h-11 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 text-sm font-bold transition-all shadow-lg shadow-amber-900/20 flex items-center gap-2"
          >
            <Home className="w-4 h-4" />
            Ir ao Início
          </button>
        </div>
      </motion.div>
    </div>
  );
}
