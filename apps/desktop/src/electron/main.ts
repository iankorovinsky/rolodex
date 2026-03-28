import { createHash, randomBytes } from 'node:crypto';
import { createServer } from 'node:http';
import { join } from 'node:path';
import { URL } from 'node:url';
import { app, BrowserWindow, ipcMain, nativeImage, shell } from 'electron';
import type { AddressInfo } from 'node:net';
import type { GranolaOAuthResult } from '@rolodex/types';

const isDev = !app.isPackaged;
const GRANOLA_MCP_RESOURCE = 'https://mcp.granola.ai/mcp';
const GRANOLA_AUTH_METADATA_URL = 'https://mcp.granola.ai/.well-known/oauth-authorization-server';

let mainWindow: BrowserWindow | null = null;
let granolaOauthPromise: Promise<GranolaOAuthResult> | null = null;
const appIconPath = join(app.getAppPath(), 'public', 'app-icon.png');

const setDevAppIcon = () => {
  if (!isDev || process.platform !== 'darwin') {
    return;
  }

  const icon = nativeImage.createFromPath(appIconPath);
  if (!icon.isEmpty()) {
    app.dock?.setIcon(icon);
  }
};

const createWindow = async () => {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1100,
    minHeight: 760,
    title: 'Rolodex',
    icon: appIconPath,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    await mainWindow.loadURL('http://127.0.0.1:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
    return;
  }

  await mainWindow.loadFile(join(__dirname, '../dist/index.html'));
};

const createPkceVerifier = () => randomBytes(32).toString('base64url');

const createPkceChallenge = (verifier: string) =>
  createHash('sha256').update(verifier, 'utf8').digest('base64url');

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) {
    throw new Error(`Request failed with HTTP ${response.status}.`);
  }

  return (await response.json()) as T;
};

const startLocalOauthCallbackServer = async (): Promise<{
  close: () => void;
  complete: Promise<{ code: string }>;
  redirectUri: string;
  state: string;
}> => {
  const state = randomBytes(16).toString('hex');
  const server = createServer();

  const complete = new Promise<{ code: string }>((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error('Granola sign-in timed out.'));
      },
      3 * 60 * 1000
    );

    const finish = () => {
      clearTimeout(timeout);
      server.close();
    };

    server.on('request', (req, res) => {
      try {
        const requestUrl = new URL(req.url || '/', 'http://127.0.0.1');
        const code = requestUrl.searchParams.get('code');
        const returnedState = requestUrl.searchParams.get('state');
        const error = requestUrl.searchParams.get('error');
        const errorDescription = requestUrl.searchParams.get('error_description');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

        if (error) {
          res.end(
            `<html><body style="font-family: sans-serif; padding: 24px;"><h1>Granola connection failed</h1><p>${errorDescription || error}</p><p>You can close this window and return to Rolodex.</p></body></html>`
          );
          finish();
          reject(new Error(errorDescription || error));
          return;
        }

        if (!code || !returnedState) {
          res.end(
            '<html><body style="font-family: sans-serif; padding: 24px;"><h1>Invalid callback</h1><p>Missing OAuth parameters. You can close this window and return to Rolodex.</p></body></html>'
          );
          finish();
          reject(new Error('Granola OAuth callback did not include a code.'));
          return;
        }

        if (returnedState !== state) {
          res.end(
            '<html><body style="font-family: sans-serif; padding: 24px;"><h1>State mismatch</h1><p>The Granola sign-in response could not be verified.</p></body></html>'
          );
          finish();
          reject(new Error('Granola OAuth state verification failed.'));
          return;
        }

        res.end(
          '<html><body style="font-family: sans-serif; padding: 24px;"><h1>Granola connected</h1><p>You can close this window and return to Rolodex.</p></body></html>'
        );
        finish();
        resolve({ code });
      } catch (error) {
        finish();
        reject(error);
      }
    });

    server.once('error', (error) => {
      finish();
      reject(error);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once('listening', () => resolve());
    server.once('error', reject);
    server.listen(0, '127.0.0.1');
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new Error('Failed to start the local OAuth callback server.');
  }

  return {
    close: () => server.close(),
    complete,
    redirectUri: `http://127.0.0.1:${address.port}/oauth/callback`,
    state,
  };
};

const startGranolaOAuth = async (): Promise<GranolaOAuthResult> => {
  const authMetadata = await fetchJson<{
    authorization_endpoint: string;
    registration_endpoint: string;
    token_endpoint: string;
  }>(GRANOLA_AUTH_METADATA_URL);

  const callback = await startLocalOauthCallbackServer();

  try {
    const registration = await fetchJson<{
      client_id: string;
    }>(authMetadata.registration_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_name: 'Rolodex',
        application_type: 'native',
        grant_types: ['authorization_code', 'refresh_token'],
        redirect_uris: [callback.redirectUri],
        response_types: ['code'],
        token_endpoint_auth_method: 'none',
      }),
    });

    const codeVerifier = createPkceVerifier();
    const authorizationUrl = new URL(authMetadata.authorization_endpoint);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', registration.client_id);
    authorizationUrl.searchParams.set('redirect_uri', callback.redirectUri);
    authorizationUrl.searchParams.set('scope', 'openid profile email offline_access');
    authorizationUrl.searchParams.set('state', callback.state);
    authorizationUrl.searchParams.set('code_challenge', createPkceChallenge(codeVerifier));
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');
    authorizationUrl.searchParams.set('resource', GRANOLA_MCP_RESOURCE);

    await shell.openExternal(authorizationUrl.toString());

    const { code } = await callback.complete;
    const tokenResponse = await fetchJson<{
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
    }>(authMetadata.token_endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: registration.client_id,
        code,
        redirect_uri: callback.redirectUri,
        code_verifier: codeVerifier,
        resource: GRANOLA_MCP_RESOURCE,
      }).toString(),
    });

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      tokenType: tokenResponse.token_type || null,
      scope: tokenResponse.scope || null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
    };
  } catch (error) {
    callback.close();
    throw error;
  }
};

ipcMain.handle('integrations:granola-oauth', async () => {
  if (!granolaOauthPromise) {
    granolaOauthPromise = startGranolaOAuth().finally(() => {
      granolaOauthPromise = null;
    });
  }

  return granolaOauthPromise;
});

app.whenReady().then(() => {
  setDevAppIcon();
  void createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      void createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
