import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './features/auth/pages/LoginPage';
import DashboardPage from './features/dashboard/pages/DashboardPage';
import DeckBuilderPage from './features/deck-builder/pages/DeckBuilderPage';
import LobbyPage from './features/lobby/pages/LobbyPage';
import RoomPage from './features/lobby/pages/RoomPage';
import BattlefieldPage from './features/battlefield/pages/BattlefieldPage';
import ProfilePage from './features/auth/pages/ProfilePage';
import NotFoundPage from './features/auth/pages/NotFoundPage';
import { useAuthStore } from './stores/authStore';
import type { ReactNode } from 'react';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuthStore();

  if (!initialized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-700 border-t-amber-500 rounded-full animate-spin" />
      </div>
    );
  }

  return user ? <>{children}</> : <Navigate to="/login" replace />;
}

function App() {
  const { user, initialized } = useAuthStore();

  return (
    <Routes>
      <Route
        path="/"
        element={
          !initialized ? null : user ? (
            <Navigate to="/dashboard" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/decks/new/edit" element={<ProtectedRoute><DeckBuilderPage /></ProtectedRoute>} />

      {/* Rotas de Multiplayer */}
      <Route path="/lobby" element={<ProtectedRoute><LobbyPage /></ProtectedRoute>} />
      <Route path="/lobby/:roomId" element={<ProtectedRoute><RoomPage /></ProtectedRoute>} />
      <Route path="/battlefield/:roomId" element={<ProtectedRoute><BattlefieldPage /></ProtectedRoute>} />

      {/* 404 Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}

export default App;
