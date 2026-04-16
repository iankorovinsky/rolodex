import { createHash, randomBytes } from 'node:crypto';
import { access, copyFile, constants as fsConstants, unlink } from 'node:fs/promises';
import { createServer } from 'node:http';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { URL } from 'node:url';
import { app, BrowserWindow, ipcMain, nativeImage, shell } from 'electron';
import type { AddressInfo } from 'node:net';
import type { GranolaOAuthResult, OAuthIntegrationType, ProviderOAuthResult } from '@rolodex/types';

const isDev = !app.isPackaged;
const GRANOLA_MCP_RESOURCE = 'https://mcp.granola.ai/mcp';
const GRANOLA_AUTH_METADATA_URL = 'https://mcp.granola.ai/.well-known/oauth-authorization-server';
/** OIDC userinfo; issuer also publishes this at `/.well-known/openid-configuration`. */
const GRANOLA_USERINFO_URL = 'https://mcp-auth.granola.ai/oauth2/userinfo';

let mainWindow: BrowserWindow | null = null;
let granolaOauthPromise: Promise<GranolaOAuthResult> | null = null;
let providerOauthPromise: Promise<ProviderOAuthResult> | null = null;
const appIconPath = join(app.getAppPath(), 'public', 'app-icon', 'app-icon.png');
const pendingOauthCallbacks = new Map<
  string,
  {
    close: () => void;
    complete: Promise<{ code: string }>;
    redirectUri: string;
  }
>();

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

const createUrlEncodedBody = (params: Record<string, string>) =>
  new URLSearchParams(params).toString();

/** Minimal page that tries to close the OAuth browser tab; the app shows success/error via toasts. */
const OAUTH_CALLBACK_CLOSE_HTML = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Rolodex</title></head><body style="margin:0"><script>
(function(){
  function c(){ try { window.close(); } catch (e) {} }
  c();
  setTimeout(c, 50);
  setTimeout(c, 200);
})();
</script></body></html>`;

const fetchJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, init);

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    const detail = body.trim();
    throw new Error(
      detail
        ? `Request failed with HTTP ${response.status}: ${detail}`
        : `Request failed with HTTP ${response.status}.`
    );
  }

  return (await response.json()) as T;
};

const decodeGranolaIdTokenPayload = (idToken: string) => {
  const parts = idToken.split('.');
  if (parts.length < 2) {
    return null;
  }
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8');
    return JSON.parse(json) as {
      sub?: string;
      email?: string;
      name?: string;
    };
  } catch {
    return null;
  }
};

const resolveGranolaAccountIdentity = async (
  accessToken: string,
  idToken?: string | null
): Promise<{
  externalAccountId: string | null;
  accountEmail: string | null;
  accountLabel: string | null;
}> => {
  try {
    const userInfo = await fetchJson<{
      sub?: string;
      email?: string;
      name?: string;
      preferred_username?: string;
    }>(GRANOLA_USERINFO_URL, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    const sub = userInfo.sub?.trim() || null;
    const email = userInfo.email?.trim() || null;
    const label = userInfo.name?.trim() || email || userInfo.preferred_username?.trim() || null;
    if (sub || email || label) {
      return {
        externalAccountId: sub,
        accountEmail: email,
        accountLabel: label,
      };
    }
  } catch {
    // Fall back to id_token if present.
  }

  if (idToken) {
    const payload = decodeGranolaIdTokenPayload(idToken);
    if (payload) {
      const sub = payload.sub?.trim() || null;
      const email = payload.email?.trim() || null;
      const label = payload.name?.trim() || email || null;
      if (sub || email || label) {
        return {
          externalAccountId: sub,
          accountEmail: email,
          accountLabel: label,
        };
      }
    }
  }

  return {
    externalAccountId: null,
    accountEmail: null,
    accountLabel: null,
  };
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
          res.end(OAUTH_CALLBACK_CLOSE_HTML);
          finish();
          reject(new Error(errorDescription || error));
          return;
        }

        if (!code || !returnedState) {
          res.end(OAUTH_CALLBACK_CLOSE_HTML);
          finish();
          reject(new Error('Granola OAuth callback did not include a code.'));
          return;
        }

        if (returnedState !== state) {
          res.end(OAUTH_CALLBACK_CLOSE_HTML);
          finish();
          reject(new Error('Granola OAuth state verification failed.'));
          return;
        }

        res.end(OAUTH_CALLBACK_CLOSE_HTML);
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
    redirectUri: `http://localhost:${address.port}/oauth/callback`,
    state,
  };
};

const startHostedOauthCallbackServer = async (options: {
  failureTitle: string;
  redirectHost?: '127.0.0.1' | 'localhost';
  redirectPath?: string;
  useFixedPort?: number;
  successTitle: string;
}): Promise<{
  close: () => void;
  complete: Promise<{ code: string }>;
  redirectUri: string;
}> => {
  const server = createServer();

  const complete = new Promise<{ code: string }>((resolve, reject) => {
    const timeout = setTimeout(
      () => {
        server.close();
        reject(new Error(`${options.successTitle} timed out.`));
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
        const error = requestUrl.searchParams.get('error');
        const errorDescription = requestUrl.searchParams.get('error_description');

        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });

        if (error) {
          res.end(OAUTH_CALLBACK_CLOSE_HTML);
          finish();
          reject(new Error(errorDescription || error));
          return;
        }

        if (!code) {
          res.end(OAUTH_CALLBACK_CLOSE_HTML);
          finish();
          reject(new Error('OAuth callback did not include a code.'));
          return;
        }

        res.end(OAUTH_CALLBACK_CLOSE_HTML);
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
    server.listen(options.useFixedPort ?? 0, '127.0.0.1');
  });

  const address = server.address() as AddressInfo | null;
  if (!address) {
    server.close();
    throw new Error('Failed to start the local OAuth callback server.');
  }

  return {
    close: () => server.close(),
    complete,
    redirectUri: `http://${options.redirectHost || 'localhost'}:${address.port}${options.redirectPath ?? '/oauth/callback'}`,
  };
};

const startGranolaOAuth = async (): Promise<GranolaOAuthResult> => {
  const authMetadata = await fetchJson<{
    authorization_endpoint: string;
    registration_endpoint: string;
    token_endpoint: string;
  }>(GRANOLA_AUTH_METADATA_URL);

  const callback = await startLocalOauthCallbackServer();
  let oauthBrowserWindow: BrowserWindow | null = null;

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

    const oauthPartition = `temp:granola-oauth-${randomBytes(8).toString('hex')}`;
    oauthBrowserWindow = new BrowserWindow({
      parent: mainWindow ?? undefined,
      modal: Boolean(mainWindow),
      width: 520,
      height: 800,
      minWidth: 420,
      minHeight: 560,
      show: true,
      title: 'Sign in to Granola',
      autoHideMenuBar: true,
      icon: nativeImage.createFromPath(appIconPath),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        partition: oauthPartition,
      },
    });

    try {
      await oauthBrowserWindow.loadURL(authorizationUrl.toString());
    } catch {
      if (!oauthBrowserWindow.isDestroyed()) {
        oauthBrowserWindow.close();
      }
      oauthBrowserWindow = null;
      throw new Error('Failed to open Granola sign-in.');
    }

    const { code } = await callback.complete;
    const tokenResponse = await fetchJson<{
      access_token: string;
      id_token?: string;
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

    const identity = await resolveGranolaAccountIdentity(
      tokenResponse.access_token,
      tokenResponse.id_token
    );

    return {
      accessToken: tokenResponse.access_token,
      clientId: registration.client_id,
      refreshToken: tokenResponse.refresh_token || null,
      tokenType: tokenResponse.token_type || null,
      scope: tokenResponse.scope || null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      externalAccountId: identity.externalAccountId,
      accountEmail: identity.accountEmail,
      accountLabel: identity.accountLabel,
    };
  } catch (error) {
    callback.close();
    throw error;
  } finally {
    if (oauthBrowserWindow && !oauthBrowserWindow.isDestroyed()) {
      oauthBrowserWindow.close();
    }
  }
};

const getRequiredEnv = (name: string) => {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing ${name}.`);
  }

  return value;
};

const startProviderOAuth = async (type: OAuthIntegrationType): Promise<ProviderOAuthResult> => {
  console.log(`[integrations] starting provider oauth: ${type}`);
  const callback = await startHostedOauthCallbackServer({
    successTitle: `${type === 'google' ? 'Google' : 'Outlook'} connected`,
    failureTitle: `${type === 'google' ? 'Google' : 'Outlook'} connection failed`,
    redirectHost: type === 'google' ? '127.0.0.1' : 'localhost',
    redirectPath: type === 'google' ? '' : '',
  });
  console.log(`[integrations] callback ready for ${type}: ${callback.redirectUri}`);
  const codeVerifier = createPkceVerifier();
  const codeChallenge = createPkceChallenge(codeVerifier);

  try {
    if (type === 'google') {
      const clientId = getRequiredEnv('GOOGLE_OAUTH_CLIENT_ID');
      const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET?.trim() || null;
      const authorizationUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

      authorizationUrl.searchParams.set('client_id', clientId);
      authorizationUrl.searchParams.set('redirect_uri', callback.redirectUri);
      authorizationUrl.searchParams.set('response_type', 'code');
      authorizationUrl.searchParams.set(
        'scope',
        [
          'openid',
          'email',
          'profile',
          'https://www.googleapis.com/auth/gmail.readonly',
          'https://www.googleapis.com/auth/calendar.readonly',
        ].join(' ')
      );
      authorizationUrl.searchParams.set('access_type', 'offline');
      authorizationUrl.searchParams.set('prompt', 'consent');
      authorizationUrl.searchParams.set('code_challenge', codeChallenge);
      authorizationUrl.searchParams.set('code_challenge_method', 'S256');

      console.log(
        `[integrations] opening browser for google oauth: ${authorizationUrl.toString()}`
      );
      await shell.openExternal(authorizationUrl.toString());
      console.log('[integrations] browser open requested for google oauth');

      const { code } = await callback.complete;
      console.log('[integrations] received google oauth callback code');
      const tokenResponse = await fetchJson<{
        access_token: string;
        expires_in?: number;
        id_token?: string;
        refresh_token?: string;
        scope?: string;
        token_type?: string;
      }>('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: createUrlEncodedBody({
          client_id: clientId,
          ...(clientSecret ? { client_secret: clientSecret } : {}),
          code,
          code_verifier: codeVerifier,
          grant_type: 'authorization_code',
          redirect_uri: callback.redirectUri,
        }),
      });

      const userInfo = await fetchJson<{
        email?: string;
        name?: string;
        sub?: string;
      }>('https://openidconnect.googleapis.com/v1/userinfo', {
        headers: {
          Authorization: `Bearer ${tokenResponse.access_token}`,
        },
      });

      if (!userInfo.sub) {
        throw new Error('Google did not return an account identifier.');
      }

      return {
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token || null,
        tokenType: tokenResponse.token_type || null,
        scope: tokenResponse.scope || null,
        expiresAt: tokenResponse.expires_in
          ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
          : null,
        externalAccountId: userInfo.sub,
        accountLabel: userInfo.name || userInfo.email || 'Google',
        accountEmail: userInfo.email || null,
      };
    }

    const clientId = getRequiredEnv('MICROSOFT_OAUTH_CLIENT_ID');
    const tenantId = process.env.MICROSOFT_OAUTH_TENANT_ID?.trim() || 'common';
    const authorizationUrl = new URL(
      `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`
    );

    authorizationUrl.searchParams.set('client_id', clientId);
    authorizationUrl.searchParams.set('redirect_uri', callback.redirectUri);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('response_mode', 'query');
    authorizationUrl.searchParams.set(
      'scope',
      [
        'openid',
        'email',
        'profile',
        'offline_access',
        'User.Read',
        'Mail.Read',
        'Calendars.Read',
      ].join(' ')
    );
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    console.log(`[integrations] opening browser for outlook oauth: ${authorizationUrl.toString()}`);
    await shell.openExternal(authorizationUrl.toString());
    console.log('[integrations] browser open requested for outlook oauth');

    const { code } = await callback.complete;
    console.log('[integrations] received outlook oauth callback code');
    const tokenResponse = await fetchJson<{
      access_token: string;
      expires_in?: number;
      refresh_token?: string;
      scope?: string;
      token_type?: string;
    }>(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: createUrlEncodedBody({
        client_id: clientId,
        code,
        code_verifier: codeVerifier,
        grant_type: 'authorization_code',
        redirect_uri: callback.redirectUri,
      }),
    });

    const userInfo = await fetchJson<{
      displayName?: string;
      id?: string;
      mail?: string | null;
      userPrincipalName?: string | null;
    }>('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });

    if (!userInfo.id) {
      throw new Error('Microsoft did not return an account identifier.');
    }

    return {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token || null,
      tokenType: tokenResponse.token_type || null,
      scope: tokenResponse.scope || null,
      expiresAt: tokenResponse.expires_in
        ? new Date(Date.now() + tokenResponse.expires_in * 1000).toISOString()
        : null,
      externalAccountId: userInfo.id,
      accountLabel:
        userInfo.displayName || userInfo.mail || userInfo.userPrincipalName || 'Outlook',
      accountEmail: userInfo.mail || userInfo.userPrincipalName || null,
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

ipcMain.handle('integrations:provider-oauth', async (_event, type: OAuthIntegrationType) => {
  if (!providerOauthPromise) {
    providerOauthPromise = startProviderOAuth(type).finally(() => {
      providerOauthPromise = null;
    });
  }

  return providerOauthPromise;
});

const resolveMessagesDbPath = (raw: string) => {
  let t = raw.trim().replace(/^\uFF5E/, '~');
  if (!t) {
    return t;
  }
  if (t.startsWith('~/')) {
    const rest = t.slice(2).replace(/^[/\\]+/, '');
    return join(homedir(), rest);
  }
  if (t.startsWith('~\\')) {
    const rest = t.slice(2).replace(/^[/\\]+/, '');
    return join(homedir(), rest);
  }
  if (t === '~') {
    return homedir();
  }
  return t;
};

ipcMain.handle('integrations:open-full-disk-access-settings', async () => {
  if (process.platform !== 'darwin') {
    return;
  }
  await shell.openExternal(
    'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'
  );
});

ipcMain.handle('integrations:imessage-validate-path', async (_event, inputPath: unknown) => {
  const raw = typeof inputPath === 'string' ? inputPath : String(inputPath ?? '');
  let candidate = resolveMessagesDbPath(raw);

  if (!candidate) {
    throw new Error('A Messages database path is required.');
  }

  const tmpName = join(tmpdir(), `rolodex-chatdb-probe-${randomBytes(12).toString('hex')}.db`);

  const mapCopyError = (e: unknown): Error => {
    if (e instanceof Error) {
      if (
        e.message.startsWith('Messages database not found') ||
        e.message.startsWith('Cannot read Messages chat.db')
      ) {
        return e;
      }
    }
    const err = e as NodeJS.ErrnoException;
    if (err.code === 'ENOENT') {
      return new Error('Messages database not found at that path.');
    }
    if (err.code === 'EACCES' || err.code === 'EPERM') {
      return new Error(
        'Cannot read Messages chat.db. On macOS, grant Rolodex Full Disk Access in System Settings → Privacy & Security, then try again.'
      );
    }
    return new Error(err.message || 'Unable to access the Messages database.');
  };

  try {
    if (process.platform === 'darwin') {
      try {
        await copyFile(candidate, tmpName, fsConstants.COPYFILE_FICLONE);
      } catch (first) {
        const err = first as NodeJS.ErrnoException;
        if (err.code === 'EINVAL' || err.code === 'ENOTSUP' || err.code === 'ENOSYS') {
          await unlink(tmpName).catch(() => undefined);
          try {
            await copyFile(candidate, tmpName);
          } catch (second) {
            throw mapCopyError(second);
          }
        } else {
          throw mapCopyError(first);
        }
      }
    } else {
      try {
        await copyFile(candidate, tmpName);
      } catch (e) {
        throw mapCopyError(e);
      }
    }

    await access(tmpName, fsConstants.R_OK);

    return {
      path: candidate,
      valid: true,
    };
  } finally {
    await unlink(tmpName).catch(() => undefined);
  }
});

ipcMain.handle(
  'integrations:prepare-oauth-callback',
  async (_event, options: { failureTitle: string; successTitle: string }) => {
    const callback = await startHostedOauthCallbackServer(options);
    const callbackId = randomBytes(16).toString('hex');

    pendingOauthCallbacks.set(callbackId, callback);

    return {
      callbackId,
      redirectUri: callback.redirectUri,
    };
  }
);

ipcMain.handle(
  'integrations:complete-oauth-callback',
  async (_event, input: { authUrl: string; callbackId: string }) => {
    const callback = pendingOauthCallbacks.get(input.callbackId);
    if (!callback) {
      throw new Error('OAuth callback session was not found.');
    }

    try {
      await shell.openExternal(input.authUrl);
      return await callback.complete;
    } finally {
      callback.close();
      pendingOauthCallbacks.delete(input.callbackId);
    }
  }
);

ipcMain.handle('integrations:cancel-oauth-callback', async (_event, callbackId: string) => {
  const callback = pendingOauthCallbacks.get(callbackId);
  if (!callback) {
    return;
  }

  callback.close();
  pendingOauthCallbacks.delete(callbackId);
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
