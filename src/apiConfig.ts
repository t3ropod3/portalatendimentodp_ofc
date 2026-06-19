/**
 * Resolves the API URL dynamically to support running the frontend on Vercel
 * while connecting to the Google Cloud Run backend.
 */
export function getApiUrl(path: string): string {
  // Ensure the path starts with a slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  // If VITE_API_URL is configured, always use it
  const envApiUrl = (import.meta as any).env?.VITE_API_URL;
  if (envApiUrl) {
    const base = envApiUrl.endsWith('/') ? envApiUrl.slice(0, -1) : envApiUrl;
    return `${base}${cleanPath}`;
  }

  // Automatic routing based on current origin
  const hostname = window.location.hostname;
  
  // Se estivermos em produção Vercel, use URLs relativas para que o vercel.json faça o proxy corretamente.
  const isVercel = hostname.includes('vercel.app');
  
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
  const isProductionBackend = hostname.endsWith('.run.app') || hostname.endsWith('.google.com') || hostname.endsWith('.aistudio.google');

  if (!isLocalHost && !isProductionBackend) {
    // Return our stable Shared App URL as the fallback backend
    const stableBackend = 'https://ais-pre-rild7f6psslcmihyj7lza7-82519637447.us-east1.run.app';
    const finalUrl = `${stableBackend}${cleanPath}`;
    console.log(`[getApiUrl] Routing %c${path}%c to backend: %c${finalUrl}%c (detected hostname: ${hostname})`, 'color:orange', '', 'color:green', '');
    return finalUrl;
  }

  // Otherwise, use relative URLs (same host)
  console.log(`[getApiUrl] Routing %c${path}%c to relative path: %c${cleanPath}%c (detected hostname: ${hostname})`, 'color:orange', '', 'color:blue', '');
  return cleanPath;
}
