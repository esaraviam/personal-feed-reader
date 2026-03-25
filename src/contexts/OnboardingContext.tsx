import { createContext, useCallback, useContext, useState } from 'react';

const STORAGE_KEY = 'dailybrief_onboarding_v1';

interface OnboardingContextValue {
  done: boolean;
  complete: () => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue>({
  done: true,
  complete: () => {},
  reset: () => {},
});

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const [done, setDone] = useState(() => localStorage.getItem(STORAGE_KEY) === 'true');

  const complete = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, 'true');
    setDone(true);
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setDone(false);
  }, []);

  return (
    <OnboardingContext.Provider value={{ done, complete, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export const useOnboarding = () => useContext(OnboardingContext);
