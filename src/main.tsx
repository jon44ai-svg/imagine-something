import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import '@mantine/dropzone/styles.css';
import '@mantine/spotlight/styles.css';
import '@mantine/carousel/styles.css';
import '@mantine/lightbox/styles.css';
import 'mantine-contextmenu/styles.css';
import '@gfazioli/mantine-border-animate/styles.css';
import '@gfazioli/mantine-compare/styles.css';
import '@gfazioli/mantine-depth-select/styles.css';
import '@gfazioli/mantine-led/styles.css';
import '@gfazioli/mantine-lens-select/styles.css';
import '@gfazioli/mantine-mask/styles.css';
import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
