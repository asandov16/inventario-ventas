import { BrowserRouter, Route, Routes } from 'react-router';

import { AppShell } from './AppShell';

/**
 * Every visible route renders the same shell: the six sections live side by
 * side in the Track, and the path only says which one is in view (ADR-037).
 * Session (AuthGate) and data providers wrap this in Stage 2, PR 3.
 */
export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="*" element={<AppShell />} />
      </Routes>
    </BrowserRouter>
  );
}
