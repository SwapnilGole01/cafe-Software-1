import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { TableSessionProvider } from './context/TableSessionContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TableSessionProvider>
      <App />
    </TableSessionProvider>
  </StrictMode>,
);
