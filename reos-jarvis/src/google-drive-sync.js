// REOS JARVIS — Google Drive Sync
const { ipcMain } = require('electron');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const APP_FOLDER_NAME = 'REOS-JARVIS-Data';
const SYNC_FILES = ['tasks.json', 'knowledge.json'];

function getOAuth2Client(store) {
  const clientId = store.get('google-client-id');
  const clientSecret = store.get('google-client-secret');
  const tokens = store.get('google-tokens');
  if (!clientId || !clientSecret || !tokens) return null;
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, 'http://localhost:4242/oauth2callback');
  oauth2.setCredentials(tokens);
  return oauth2;
}

function encrypt(text, passphrase) {
  if (!passphrase) return text;
  const key = crypto.scryptSync(passphrase, 'reos-salt', 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
  return iv.toString('hex') + ':' + cipher.update(text, 'utf8', 'hex') + cipher.final('hex');
}

function decrypt(text, passphrase) {
  if (!passphrase) return text;
  try {
    const [ivHex, encrypted] = text.split(':');
    const key = crypto.scryptSync(passphrase, 'reos-salt', 32);
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
  } catch { return text; }
}

module.exports = function registerDriveSyncHandlers(dataDir, store) {
  async function getOrCreateAppFolder(drive) {
    const res = await drive.files.list({
      q: `name='${APP_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id, name)',
      spaces: 'drive'
    });
    if (res.data.files.length > 0) return res.data.files[0].id;
    const folder = await drive.files.create({
      resource: { name: APP_FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
      fields: 'id'
    });
    return folder.data.id;
  }

  ipcMain.handle('drive-sync-upload', async () => {
    const auth = getOAuth2Client(store);
    if (!auth) return { error: 'Nicht authentifiziert.' };
    try {
      const drive = google.drive({ version: 'v3', auth });
      const folderId = await getOrCreateAppFolder(drive);
      const passphrase = store.get('sync-passphrase');

      for (const filename of SYNC_FILES) {
        const filePath = path.join(dataDir, filename);
        if (!fs.existsSync(filePath)) continue;
        let content = fs.readFileSync(filePath, 'utf8');
        if (passphrase) content = encrypt(content, passphrase);

        const existing = await drive.files.list({
          q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
          fields: 'files(id)'
        });

        const media = { mimeType: 'application/json', body: content };
        if (existing.data.files.length > 0) {
          await drive.files.update({ fileId: existing.data.files[0].id, media });
        } else {
          await drive.files.create({
            resource: { name: filename, parents: [folderId] },
            media, fields: 'id'
          });
        }
      }
      store.set('last-drive-sync', new Date().toISOString());
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });

  ipcMain.handle('drive-sync-download', async () => {
    const auth = getOAuth2Client(store);
    if (!auth) return { error: 'Nicht authentifiziert.' };
    try {
      const drive = google.drive({ version: 'v3', auth });
      const folderId = await getOrCreateAppFolder(drive);
      const passphrase = store.get('sync-passphrase');

      for (const filename of SYNC_FILES) {
        const existing = await drive.files.list({
          q: `name='${filename}' and '${folderId}' in parents and trashed=false`,
          fields: 'files(id, modifiedTime)'
        });
        if (existing.data.files.length === 0) continue;

        const fileId = existing.data.files[0].id;
        const res = await drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' });
        let content = res.data;
        if (passphrase) content = decrypt(content, passphrase);

        fs.writeFileSync(path.join(dataDir, filename), content, 'utf8');
      }
      return { success: true };
    } catch (err) {
      return { error: err.message };
    }
  });
};
