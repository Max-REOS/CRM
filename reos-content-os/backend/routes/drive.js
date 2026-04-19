'use strict';

const express = require('express');
const router = express.Router();

const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const GOOGLE_DRIVE_UPLOAD_BASE = 'https://www.googleapis.com/upload/drive/v3';

/**
 * Checks whether all required Google Drive env vars are set.
 */
function isDriveConfigured() {
  return !!(
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET &&
    process.env.GOOGLE_REFRESH_TOKEN
  );
}

/**
 * Exchanges the stored refresh token for a short-lived access token.
 * Returns the access_token string.
 */
async function getAccessToken() {
  if (!isDriveConfigured()) {
    const err = new Error('Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your .env file.');
    err.code = 'NOT_CONFIGURED';
    throw err;
  }

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      refresh_token: process.env.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token'
    }).toString()
  });

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    const errMsg = data.error_description || data.error || `Token exchange failed: ${response.status}`;
    throw new Error(`Google OAuth error: ${errMsg}`);
  }

  return data.access_token;
}

/**
 * Makes an authenticated request to the Google Drive API.
 */
async function driveRequest(path, options = {}, baseUrl = GOOGLE_DRIVE_API_BASE) {
  const token = await getAccessToken();

  const url = `${baseUrl}${path}`;
  const headers = {
    'Authorization': `Bearer ${token}`,
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  const text = await response.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    const errMsg = data.error?.message || data.error || `Drive API error: ${response.status}`;
    const err = new Error(errMsg);
    err.status = response.status;
    err.driveError = data;
    throw err;
  }

  return data;
}

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /api/drive/status
 * Returns whether the Google Drive integration is configured.
 */
router.get('/status', (req, res) => {
  if (!isDriveConfigured()) {
    return res.json({
      configured: false,
      message: 'Google Drive is not configured. Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and GOOGLE_REFRESH_TOKEN in your .env file.'
    });
  }

  res.json({
    configured: true,
    message: 'Google Drive integration is configured.',
    defaultFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || null
  });
});

/**
 * GET /api/drive/files
 * Lists files in the configured Google Drive folder.
 * Query: ?folderId= (overrides env), ?pageToken=, ?query=
 */
router.get('/files', async (req, res) => {
  try {
    const folderId = req.query.folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

    const queryParts = [];
    if (folderId) {
      queryParts.push(`'${folderId}' in parents`);
    }
    if (req.query.query) {
      queryParts.push(`name contains '${req.query.query.replace(/'/g, "\\'")}'`);
    }
    queryParts.push('trashed = false');

    const params = new URLSearchParams({
      fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink,webContentLink,thumbnailLink)',
      orderBy: 'modifiedTime desc',
      pageSize: '50'
    });

    if (queryParts.length > 0) {
      params.set('q', queryParts.join(' and '));
    }

    if (req.query.pageToken) {
      params.set('pageToken', req.query.pageToken);
    }

    const data = await driveRequest(`/files?${params.toString()}`);

    res.json({
      success: true,
      data: {
        files: data.files || [],
        nextPageToken: data.nextPageToken || null,
        folderId: folderId || null
      }
    });
  } catch (err) {
    console.error('GET /api/drive/files error:', err);
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ success: false, configured: false, error: err.message });
    }
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/drive/upload
 * Uploads a file to Google Drive from base64 content.
 * Body: {
 *   filename: string,
 *   mimeType: string,
 *   content: string (base64-encoded file data),
 *   folderId?: string (overrides GOOGLE_DRIVE_FOLDER_ID)
 * }
 */
router.post('/upload', async (req, res) => {
  try {
    const { filename, mimeType, content, folderId } = req.body;

    if (!filename) return res.status(400).json({ success: false, error: 'filename is required' });
    if (!mimeType) return res.status(400).json({ success: false, error: 'mimeType is required' });
    if (!content) return res.status(400).json({ success: false, error: 'content (base64) is required' });

    const targetFolderId = folderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

    const token = await getAccessToken();

    // Build multipart body: metadata + binary content
    const metadata = { name: filename, mimeType };
    if (targetFolderId) {
      metadata.parents = [targetFolderId];
    }

    const boundary = 'reos_drive_upload_boundary';
    const metadataPart = JSON.stringify(metadata);
    const binaryData = Buffer.from(content, 'base64');

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`),
      Buffer.from(metadataPart),
      Buffer.from(`\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`),
      binaryData,
      Buffer.from(`\r\n--${boundary}--`)
    ]);

    const uploadResponse = await fetch(`${GOOGLE_DRIVE_UPLOAD_BASE}/files?uploadType=multipart&fields=id,name,mimeType,size,webViewLink,webContentLink`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': body.length.toString()
      },
      body
    });

    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      const errMsg = uploadData.error?.message || `Upload failed: ${uploadResponse.status}`;
      return res.status(uploadResponse.status).json({ success: false, error: errMsg, details: uploadData });
    }

    res.json({
      success: true,
      message: `File "${filename}" uploaded to Google Drive`,
      data: {
        id: uploadData.id,
        name: uploadData.name,
        mimeType: uploadData.mimeType,
        size: uploadData.size,
        webViewLink: uploadData.webViewLink,
        webContentLink: uploadData.webContentLink,
        folderId: targetFolderId || null
      }
    });
  } catch (err) {
    console.error('POST /api/drive/upload error:', err);
    if (err.code === 'NOT_CONFIGURED') {
      return res.status(503).json({ success: false, configured: false, error: err.message });
    }
    res.status(err.status || 500).json({ success: false, error: err.message });
  }
});

module.exports = router;
