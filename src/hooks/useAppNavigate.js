import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Internal screens share one history entry, so device Back can leave the app.
export function useAppNavigate() {
  const navigate = useNavigate();
  return useCallback((to, options = {}) => {
    if (typeof to === 'number') throw new Error('Use an explicit destination for internal navigation.');
    return navigate(to, { ...options, replace: true });
  }, [navigate]);
}
