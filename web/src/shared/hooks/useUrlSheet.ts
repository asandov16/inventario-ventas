import { useCallback } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';

interface SheetHistoryState {
  sheetOpenedInApp: true;
}

function wasOpenedInApp(state: unknown): state is SheetHistoryState {
  return typeof state === 'object' && state !== null && 'sheetOpenedInApp' in state;
}

/**
 * Keeps a sheet's open state in a URL parameter (?venta=<id>), so the phone's
 * "back" closes it and the link can be reloaded (RF-UX-05, ADR-037).
 * Opening pushes a history entry; closing goes back to it when the app pushed
 * it, or just removes the parameter when the page was loaded with it.
 */
export function useUrlSheet(param: string) {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const value = searchParams.get(param);

  const open = useCallback(
    (nextValue = '1') => {
      const next = new URLSearchParams(location.search);
      next.set(param, nextValue);
      void navigate(
        { pathname: location.pathname, search: `?${next.toString()}` },
        { state: { sheetOpenedInApp: true } satisfies SheetHistoryState },
      );
    },
    [location.pathname, location.search, navigate, param],
  );

  const close = useCallback(() => {
    if (wasOpenedInApp(location.state)) {
      void navigate(-1);
      return;
    }
    const next = new URLSearchParams(location.search);
    next.delete(param);
    const search = next.toString();
    void navigate(
      { pathname: location.pathname, search: search ? `?${search}` : '' },
      { replace: true },
    );
  }, [location.pathname, location.search, location.state, navigate, param]);

  return { value, isOpen: value !== null, open, close };
}
