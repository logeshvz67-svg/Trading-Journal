import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './store';
import { Layout } from './components/Layout';
import { Spinner, ToastHost } from './components/ui';
import Login from './pages/Login';

const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Prep = lazy(() => import('./pages/Prep'));
const Battle = lazy(() => import('./pages/Battle'));
const Forge = lazy(() => import('./pages/Forge'));
const Log = lazy(() => import('./pages/Log'));
const TradeDetail = lazy(() => import('./pages/TradeDetail'));
const Boss = lazy(() => import('./pages/Boss'));
const Campfire = lazy(() => import('./pages/Campfire'));
const More = lazy(() => import('./pages/More'));
const Settings = lazy(() => import('./pages/Settings'));
const Disclaimer = lazy(() => import('./pages/Disclaimer'));
const Monsters = lazy(() => import('./pages/Monsters'));
const Quests = lazy(() => import('./pages/Quests'));
const Rewards = lazy(() => import('./pages/Rewards'));
const Records = lazy(() => import('./pages/Records'));
const Academy = lazy(() => import('./pages/Academy'));
const Lesson = lazy(() => import('./pages/Lesson'));
const Flashcards = lazy(() => import('./pages/Flashcards'));
const Drills = lazy(() => import('./pages/Drills'));
const Glossary = lazy(() => import('./pages/Glossary'));
const Codex = lazy(() => import('./pages/Codex'));
const Mentor = lazy(() => import('./pages/Mentor'));

export function App() {
  const { session, me } = useStore();
  return (
    <BrowserRouter>
      <ToastHost />
      <Suspense fallback={<div className="mx-auto max-w-3xl px-4"><Spinner /></div>}>
        {!session ? (
          <Routes>
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="*" element={<Login />} />
          </Routes>
        ) : !me ? (
          <div className="mx-auto max-w-3xl px-4"><Spinner label="Opening your quest log..." /></div>
        ) : !me.profile.onboarded ? (
          <Routes>
            <Route path="/disclaimer" element={<Disclaimer />} />
            <Route path="*" element={<Onboarding />} />
          </Routes>
        ) : (
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="prep" element={<Prep />} />
              <Route path="battle" element={<Battle />} />
              <Route path="forge" element={<Forge />} />
              <Route path="log" element={<Log />} />
              <Route path="log/:id" element={<TradeDetail />} />
              <Route path="boss" element={<Boss />} />
              <Route path="campfire" element={<Campfire />} />
              <Route path="more" element={<More />} />
              <Route path="settings" element={<Settings />} />
              <Route path="disclaimer" element={<Disclaimer />} />
              <Route path="monsters" element={<Monsters />} />
              <Route path="quests" element={<Quests />} />
              <Route path="rewards" element={<Rewards />} />
              <Route path="records" element={<Records />} />
              <Route path="academy" element={<Academy />} />
              <Route path="academy/lesson/:id" element={<Lesson />} />
              <Route path="academy/cards" element={<Flashcards />} />
              <Route path="academy/drills" element={<Drills />} />
              <Route path="academy/drills/:id" element={<Drills />} />
              <Route path="academy/glossary" element={<Glossary />} />
              <Route path="codex" element={<Codex />} />
              <Route path="mentor" element={<Mentor />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        )}
      </Suspense>
    </BrowserRouter>
  );
}
