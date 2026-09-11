import { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Edit3, Check, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';

export default function ProfilePage() {
  const user = useAuthStore(state => state.user);
  const logout = useAuthStore(state => state.logout);
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  const handleSaveName = async () => {
    const trimmed = displayName.trim();
    if (!trimmed || trimmed.length < 2) {
      setNameError('O nome deve ter pelo menos 2 caracteres.');
      return;
    }
    if (trimmed.length > 30) {
      setNameError('O nome deve ter no máximo 30 caracteres.');
      return;
    }

    setSavingName(true);
    setNameError('');

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user?.id, display_name: trimmed }, { onConflict: 'id' });

    setSavingName(false);

    if (error) {
      setNameError('Erro ao salvar o nome. Tente novamente.');
    } else {
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    }
  };

  const initial = (user?.displayName || user?.email || 'J').charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800 bg-zinc-900/50 flex items-center px-6 gap-4 shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-2 text-zinc-500 hover:text-zinc-200 transition-colors group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
          <span className="text-sm">Dashboard</span>
        </button>
        <div className="h-5 w-px bg-zinc-800" />
        <h1 className="font-semibold text-zinc-100">Meu Perfil</h1>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-6 flex flex-col gap-6">
        {/* Avatar + Info */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex items-center gap-6"
        >
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-600 to-amber-800 flex items-center justify-center text-3xl font-black text-zinc-950 shadow-lg shadow-amber-900/20 shrink-0">
            {initial}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {editingName ? (
                <div className="flex items-center gap-2 w-full">
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSaveName()}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-zinc-100 text-sm focus:outline-none focus:border-amber-500/50 transition-colors"
                    autoFocus
                    maxLength={30}
                  />
                  <button
                    onClick={handleSaveName}
                    disabled={savingName}
                    className="w-8 h-8 bg-amber-600 hover:bg-amber-500 rounded-lg flex items-center justify-center text-zinc-950 transition-colors disabled:opacity-50"
                  >
                    {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => { setEditingName(false); setDisplayName(user?.displayName || ''); setNameError(''); }}
                    className="w-8 h-8 bg-zinc-800 hover:bg-zinc-700 rounded-lg flex items-center justify-center text-zinc-400 transition-colors text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-bold text-zinc-100 truncate">
                    {user?.displayName || 'Sem nome'}
                  </h2>
                  {nameSaved && <span className="text-xs text-green-400 font-bold">Salvo!</span>}
                  <button
                    onClick={() => setEditingName(true)}
                    className="ml-1 text-zinc-600 hover:text-amber-500 transition-colors"
                    title="Editar nome"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
            {nameError && <p className="text-xs text-red-400 mb-1">{nameError}</p>}
            <div className="flex items-center gap-1.5 text-sm text-zinc-500">
              <Mail className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{user?.email}</span>
            </div>
          </div>
        </motion.div>

        {/* Stats Placeholder */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Estatísticas</h3>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Partidas', value: '—' },
              { label: 'Vitórias', value: '—' },
              { label: 'Derrotas', value: '—' },
            ].map(stat => (
              <div key={stat.label} className="bg-zinc-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-zinc-300">{stat.value}</p>
                <p className="text-xs text-zinc-600 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-zinc-700 italic mt-4 text-center">
            Estatísticas detalhadas em breve.
          </p>
        </motion.div>

        {/* Account Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6"
        >
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Conta</h3>
          <button
            onClick={() => { logout(); navigate('/login'); }}
            className="flex items-center gap-3 text-sm text-red-400 hover:text-red-300 transition-colors group"
          >
            <div className="w-8 h-8 bg-red-500/10 group-hover:bg-red-500/20 rounded-lg flex items-center justify-center transition-colors">
              <LogOut className="w-4 h-4" />
            </div>
            Sair da conta
          </button>
        </motion.div>
      </main>
    </div>
  );
}
