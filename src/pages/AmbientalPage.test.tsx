import { StrictMode } from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, it, expect } from 'vitest';

let resolveLoad: (v: any) => void = () => {};
vi.mock('@/lib/ambiental/browser', () => ({
  MAX_BYTES: 25 * 1024 * 1024,
  openPdf: vi.fn(),
  loadState: vi.fn(() => new Promise((r) => { resolveLoad = r; })),
  saveState: vi.fn(() => Promise.resolve()),
  clearState: vi.fn(() => Promise.resolve()),
  storageErrorMessage: (e: any) => String(e?.message ?? e),
}));

import AmbientalPage from './AmbientalPage';

it('StrictMode mount/cleanup/mount + restauração lenta: controles bloqueados até concluir e resultado aplicado', async () => {
  render(<StrictMode><AmbientalPage /></StrictMode>);
  const load = screen.getByRole('button', { name: /Carregar caso/ });
  expect(load).toBeDisabled();
  expect(screen.getByLabelText('Documento')).toBeDisabled();
  expect(screen.getByText(/Restaurando trabalho salvo/)).toBeInTheDocument();
  // restauração lenta de um arquivo salvo inválido (não-PDF)
  await act(async () => { resolveLoad({ source: 'upload', fileName: 'x.pdf', bytes: new TextEncoder().encode('hello').buffer, mode: 'full', reviews: [], savedAt: '' }); });
  // se mountedRef ficasse false após o remount, o erro nunca seria exibido
  await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('não é um PDF'));
  expect(screen.getByRole('button', { name: /Carregar caso/ })).toBeEnabled();
  expect(screen.getByLabelText('Documento')).toBeEnabled();
});
