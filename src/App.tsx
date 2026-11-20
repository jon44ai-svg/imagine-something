import { MantineProvider } from '@mantine/core';
import { ModalsProvider } from '@mantine/modals';
import { Notifications } from '@mantine/notifications';
import { ContextMenuProvider } from 'mantine-contextmenu';
import { BrowserRouter } from 'react-router-dom';
import type { AppContainer } from './app/container';
import { AppRoutes } from './app/router';
import { ServicesProvider } from './app/ServicesContext';
import { ExecutionProvider } from './app/state/ExecutionContext';
import { LightboxProvider } from './app/state/LightboxContext';
import { QueueDataProvider } from './app/state/QueueDataContext';
import { SettingsProvider } from './app/state/SettingsContext';
import { appTheme } from './app/theme';

export interface AppProps {
  container?: AppContainer;
}

export default function App({ container }: AppProps) {
  return (
    <MantineProvider theme={appTheme} defaultColorScheme="dark">
      <ContextMenuProvider shadow="md" borderRadius="md">
        <ModalsProvider>
          <Notifications position="bottom-right" autoClose={3400} />
          <BrowserRouter>
            <ServicesProvider container={container}>
              <SettingsProvider>
                <QueueDataProvider>
                  <ExecutionProvider>
                    <LightboxProvider>
                      <AppRoutes />
                    </LightboxProvider>
                  </ExecutionProvider>
                </QueueDataProvider>
              </SettingsProvider>
            </ServicesProvider>
          </BrowserRouter>
        </ModalsProvider>
      </ContextMenuProvider>
    </MantineProvider>
  );
}
