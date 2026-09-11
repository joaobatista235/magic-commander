import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Sword, Shield, Sparkles } from 'lucide-react';
import { signInWithEmail, signUpWithEmail } from '@/services/auth';
import { motion, AnimatePresence } from 'framer-motion';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [mode, setMode] = useState<'login' | 'register'>('login');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    const fn = mode === 'login' ? signInWithEmail : signUpWithEmail;
    const { data, error: authError } = await fn(email, password);

    setLoading(false);

    if (authError) {
      if (authError.message.includes('Invalid login credentials')) {
        setError('Email ou senha incorretos. Verifique seus dados e tente novamente.');
      } else if (authError.message.includes('User already registered')) {
        setError('Este email já está cadastrado. Faça login em vez disso.');
        setMode('login');
      } else if (authError.message.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (authError.message.includes('Failed to fetch') || authError.message.includes('NetworkError')) {
        setError('Sem conexão com o servidor. Verifique sua internet e tente novamente.');
      } else {
        setError(authError.message);
      }
      return;
    }

    if (mode === 'register' && data.user && !data.session) {
      setMode('login');
      setSuccess('Conta criada! Verifique seu email para confirmar o cadastro.');
      return;
    }

    navigate('/dashboard');
  };

  const switchMode = () => {
    setMode(m => m === 'login' ? 'register' : 'login');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen bg-[#080810] flex overflow-hidden relative">
      {/* Background decorative elements */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {/* Radial glow top-left */}
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] bg-amber-600/8 rounded-full blur-[100px]" />
        {/* Radial glow bottom-right */}
        <div className="absolute -bottom-40 -right-40 w-[500px] h-[500px] bg-violet-600/8 rounded-full blur-[100px]" />
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        {/* Floating card art (right side on large screens) */}
        <div className="hidden lg:flex absolute right-0 top-0 w-1/2 h-full items-center justify-center">
          <div className="relative">
            {/* Decorative card stack */}
            {[...Array(3)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, rotate: (i - 1) * 8, y: 20 }}
                animate={{ opacity: 0.15 - i * 0.04, rotate: (i - 1) * 8, y: 0 }}
                transition={{ delay: i * 0.15, duration: 0.8 }}
                className="absolute rounded-2xl border border-zinc-700/30"
                style={{
                  width: 260,
                  height: 362,
                  background: `linear-gradient(135deg, #1a1a2e ${i * 20}%, #16213e)`,
                  transform: `rotate(${(i - 1) * 8}deg) translateX(${(i - 1) * 20}px)`,
                }}
              />
            ))}
            {/* Icon overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 0.12, scale: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="relative w-64 h-96 flex items-center justify-center"
            >
              <Shield className="w-32 h-32 text-amber-400" />
            </motion.div>
          </div>
        </div>
      </div>

      {/* Left panel — form */}
      <div className="relative z-10 flex flex-col justify-center w-full lg:w-1/2 px-8 py-12 sm:px-16">
        <div className="max-w-sm w-full mx-auto lg:mx-0">

          {/* Logo / Branding */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-12"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-700 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/40">
                <Sword className="w-5 h-5 text-zinc-950" />
              </div>
              <div>
                <h1 className="text-lg font-black text-zinc-100 leading-none tracking-tight">Magic Commander</h1>
                <p className="text-[10px] text-zinc-600 font-medium uppercase tracking-[0.2em]">Multiplayer Online</p>
              </div>
            </div>

            <div className="flex items-center gap-4 text-zinc-700 text-xs">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-amber-600/60" />
                <span>Partidas em Tempo Real</span>
              </div>
              <div className="w-1 h-1 bg-zinc-800 rounded-full" />
              <div className="flex items-center gap-1.5">
                <Shield className="w-3 h-3 text-amber-600/60" />
                <span>Commander 4 Jogadores</span>
              </div>
            </div>
          </motion.div>

          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="mb-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={mode}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <h2 className="text-3xl font-black text-zinc-100 tracking-tight">
                    {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
                  </h2>
                  <p className="text-zinc-500 mt-2 text-sm">
                    {mode === 'login'
                      ? 'Entre para acessar seus decks e jogar Commander.'
                      : 'Registre-se para começar a jogar Commander online.'}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  autoComplete="email"
                  spellCheck={false}
                  placeholder="seu@email.com"
                  className="h-12 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                  Senha
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  className="h-12 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-100 text-sm placeholder:text-zinc-700 focus:outline-none focus:border-amber-600/50 focus:ring-1 focus:ring-amber-600/30 transition-all"
                />
              </div>

              {/* Error / Success messages */}
              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20"
                  >
                    <p className="text-sm text-red-400">{error}</p>
                  </motion.div>
                )}
                {success && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20"
                  >
                    <p className="text-sm text-green-400">{success}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={loading}
                className="h-12 mt-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-zinc-950 font-black text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-amber-900/30 hover:shadow-amber-900/50 hover:scale-[1.02] active:scale-[0.98]"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {mode === 'login' ? 'Entrar na Arena' : 'Criar Conta'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-zinc-600">
                {mode === 'login' ? 'Novo por aqui?' : 'Já tem uma conta?'}{' '}
                <button
                  type="button"
                  onClick={switchMode}
                  className="text-amber-500 hover:text-amber-400 font-bold transition-colors"
                >
                  {mode === 'login' ? 'Criar conta gratuita' : 'Fazer login'}
                </button>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
