import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Route, Routes } from 'react-router';

import { AppShell } from './AppShell';
import { AuthGate } from './AuthGate';
import { FeedbackHost } from './FeedbackHost';
import { queryClient } from './queryClient';
import { UpdatePrompt } from './StatusBanners';

/**
 * Data cache → router → session gate → shell. Every visible route renders the
 * same shell: the six sections live side by side in the Track, and the path
 * only says which one is in view (ADR-037).
 */
export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthGate>
          <Routes>
            <Route path="*" element={<AppShell />} />
          </Routes>
        </AuthGate>
        <FeedbackHost />
        <UpdatePrompt />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
