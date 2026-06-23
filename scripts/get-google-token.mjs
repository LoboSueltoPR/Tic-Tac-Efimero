// Corre esto UNA SOLA VEZ para obtener el refresh token de Google Calendar.
// El refresh token no expira — lo guardás en Vercel como variable de entorno.
//
// Uso:
//   node scripts/get-google-token.mjs
//
// Necesitás tener en .env:
//   VITE_GOOGLE_CLIENT_ID=...
//   GOOGLE_CLIENT_SECRET=...   ← secret del OAuth client (no el de la app frontend)

import { createServer } from 'http';
import { google } from 'googleapis';
import { readFileSync } from 'fs';

// Leer .env manualmente (sin dotenv)
const envLines = readFileSync(new URL('../.env', import.meta.url), 'utf-8').split('\n');
const env = {};
for (const line of envLines) {
  const [k, ...v] = line.split('=');
  if (k && v.length) env[k.trim()] = v.join('=').trim();
}

const CLIENT_ID     = env['VITE_GOOGLE_CLIENT_ID'];
const CLIENT_SECRET = env['GOOGLE_CLIENT_SECRET'];
const REDIRECT_URI  = 'http://localhost:3333/callback';

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('\n❌  Falta VITE_GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET en .env\n');
  console.error('   Obtené el client secret en Google Cloud Console:');
  console.error('   APIs & Services → Credentials → tu OAuth Client → Download JSON\n');
  process.exit(1);
}

const oauth2 = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI);

const authUrl = oauth2.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/calendar.events'],
});

console.log('\n1. Abrí esta URL en tu navegador:\n');
console.log('   ' + authUrl);
console.log('\n2. Autorizá con tu cuenta de Google');
console.log('3. Vas a ser redirigido a localhost — esta ventana captura el código\n');

// Servidor local para capturar el callback
const server = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:3333');
  const code = url.searchParams.get('code');
  if (!code) { res.end('Sin código'); return; }

  try {
    const { tokens } = await oauth2.getToken(code);
    res.end('<h2>✅ Listo, podés cerrar esta pestaña</h2>');
    server.close();

    console.log('\n✅  Refresh token obtenido!\n');
    console.log('Agregá estas variables en Vercel → Settings → Environment Variables:\n');
    console.log(`GOOGLE_CLIENT_ID     = ${CLIENT_ID}`);
    console.log(`GOOGLE_CLIENT_SECRET = ${CLIENT_SECRET}`);
    console.log(`GOOGLE_REFRESH_TOKEN = ${tokens.refresh_token}\n`);
  } catch (err) {
    res.end('Error: ' + err.message);
    console.error(err);
    server.close();
  }
});

server.listen(3333, () => {
  console.log('Esperando callback en http://localhost:3333 ...\n');
});
