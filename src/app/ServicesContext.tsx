import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createAppContainer, type AppContainer } from './container';

const ServicesContext = createContext<AppContainer | null>(null);

export interface ServicesProviderProps {
  container?: AppContainer;
  children: ReactNode;
}

export function ServicesProvider({ container, children }: ServicesProviderProps) {
  const resolved = useMemo(() => container ?? createAppContainer(), [container]);
  return <ServicesContext.Provider value={resolved}>{children}</ServicesContext.Provider>;
}

export function useServices(): AppContainer {
  const ctx = useContext(ServicesContext);
  if (!ctx) {
    throw new Error('useServices must be used inside a ServicesProvider');
  }
  return ctx;
}
