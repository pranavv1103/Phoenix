import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

const showFatalError = (error) => {
  const root = document.getElementById('root');
  if (!root) return;

  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);
  root.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;background:#111827;color:#f9fafb;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;">
      <div style="max-width:900px;width:100%;background:#1f2937;border:1px solid #374151;border-radius:12px;padding:20px;box-shadow:0 10px 25px rgba(0,0,0,.35);">
        <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;">Frontend Runtime Error</h1>
        <pre style="white-space:pre-wrap;word-break:break-word;background:#111827;border:1px solid #374151;border-radius:8px;padding:12px;margin:0;">${message}</pre>
        <p style="margin:12px 0 0;color:#9ca3af;font-size:14px;">Open DevTools console for full stack trace.</p>
      </div>
    </div>
  `;
};

window.addEventListener('error', (event) => {
  if (event?.error) showFatalError(event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  showFatalError(event?.reason ?? 'Unhandled Promise Rejection');
});

try {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
} catch (error) {
  showFatalError(error);
}
