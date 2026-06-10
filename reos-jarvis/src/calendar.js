// REOS JARVIS — Google Calendar OAuth (main process)
const { ipcMain, shell, BrowserWindow } = require('electron');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const http = require('http');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_FILE = (dataDir) => path.join(dataDir, 'google-tokens.json');

function getOAuth2Client(dataDir, clientId, clientSecret) {
  const redirectUri = 'http://localhost:4242/oauth2callback';
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

function loadTokens(dataDir) {
  try { return JSON.parse(fs.readFileSync(TOKEN_FILE(dataDir), 'utf8')); }
  catch { return null; }
}

function saveTokens(dataDir, tokens) {
  fs.writeFileSync(TOKEN_FILE(dataDir), JSON.stringify(tokens), 'utf8');
}

module.exports = function registerCalendarHandlers(dataDir, store) {
  ipcMain.handle('calendar-auth-start', async () => {
    const clientId = store.get('google-client-id');
    const clientSecret = store.get('google-client-secret');
    if (!clientId || !clientSecret) {
      return { error: 'Google Client ID und Secret in Einstellungen hinterlegen.' };
    }

    const oauth2 = getOAuth2Client(dataDir, clientId, clientSecret);
    const authUrl = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES, prompt: 'consent' });

    // Start local server to catch redirect
    const code = await new Promise((resolve) => {
      const server = http.createServer((req, res) => {
        const url = new URL(req.url, 'http://localhost:4242');
        const code = url.searchParams.get('code');
        res.end('<html><body style="background:#020408;color:#C9A84C;font-family:monospace;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;font-size:18px">JARVIS: Authentifizierung erfolgreich. Dieses Fenster schließen.</body></html>');
        server.close();
        resolve(code);
      });
      server.listen(4242);
    });

    shell.openExternal(authUrl);
    if (!code) return { error: 'Auth fehlgeschlagen.' };

    const { tokens } = await oauth2.getToken(code);
    oauth2.setCredentials(tokens);
    saveTokens(dataDir, tokens);
    return { success: true };
  });

  ipcMain.handle('calendar-get-events', async (e, days = 14) => {
    const clientId = store.get('google-client-id');
    const clientSecret = store.get('google-client-secret');
    const tokens = loadTokens(dataDir);
    if (!clientId || !clientSecret || !tokens) return { error: 'Nicht authentifiziert.' };

    try {
      const oauth2 = getOAuth2Client(dataDir, clientId, clientSecret);
      oauth2.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2 });
      const now = new Date();
      const end = new Date(now.getTime() + days * 86400000);
      const res = await calendar.events.list({
        calendarId: 'primary',
        timeMin: now.toISOString(),
        timeMax: end.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50
      });
      return { events: res.data.items };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('calendar-create-event', async (e, event) => {
    const clientId = store.get('google-client-id');
    const clientSecret = store.get('google-client-secret');
    const tokens = loadTokens(dataDir);
    if (!clientId || !clientSecret || !tokens) return { error: 'Nicht authentifiziert.' };

    try {
      const oauth2 = getOAuth2Client(dataDir, clientId, clientSecret);
      oauth2.setCredentials(tokens);
      const calendar = google.calendar({ version: 'v3', auth: oauth2 });
      const res = await calendar.events.insert({ calendarId: 'primary', resource: event });
      return { event: res.data };
    } catch (err) {
      return { error: err.message };
    }
  });
};
