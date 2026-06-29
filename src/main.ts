import { IPC } from './shared/ipc-channels';
import { app, BrowserWindow, shell, ipcMain, globalShortcut, dialog, nativeImage, webContents, clipboard, net, session, protocol, screen, desktopCapturer } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import Store from 'electron-store';
import { pathToFileURL } from 'url';
import { AI_LIST } from './shared/ai-list';

protocol.registerSchemesAsPrivileged([
  { scheme: 'media', privileges: { secure: true, standard: true, corsEnabled: true, supportFetchAPI: true, stream: true } }
]);
import { THRED_FOLDERS } from './config/thredFolders';
import { ThredConfig } from './electron';
import { jsInjectAll } from './injection-scripts';
import * as secretStore from './secretStore';


declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Disable WebAuthn (Passkeys) globally.
// Electron's implementation of WebAuthn often conflicts with Google OAuth, 
// causing the "Windows Security" passkey popup to appear and then fail or block login.
// Disabling it forces Google to gracefully fall back to a standard password prompt.
app.commandLine.appendSwitch('disable-features', 'WebAuthentication');

app.setPath('userData', path.join(app.getPath('appData'), 'thred_v2'));

let store: Store;

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let currentThredFolderPath = '';

function getThredFolderPath(): string {
  const folder = store.get('thredFolderPath') as string;
  return folder || app.getPath('downloads');
}

// webContentsId -> aiId
const webviewMap = new Map<number, string>();
// webContentsId -> Promise resolving when register-webview fires
const webviewReadyMap = new Map<number, { promise: Promise<string>; resolve: (aiId: string) => void }>();
// aiId -> zoomFactor (0.5 to 2.0)
const zoomMap = new Map<string, number>();

const AI_IDS = AI_LIST.map(ai => ai.id);


function getDownloadSubfolder(filename: string): string {
  const ext = path.extname(filename).toLowerCase();

  const imageExts = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];
  const videoExts = ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.flv', '.wmv'];
  const audioExts = ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a'];
  const docExts = ['.pdf', '.doc', '.docx', '.txt', '.rtf', '.odt', '.xls', '.xlsx', '.ppt', '.pptx', '.csv'];
  const codeExts = ['.js', '.ts', '.tsx', '.jsx', '.py', '.html', '.css', '.json', '.yaml', '.yml', '.md', '.sh', '.rb', '.go', '.rs', '.cpp', '.c', '.java', '.php'];

  if (imageExts.includes(ext)) return 'Images';
  if (videoExts.includes(ext)) return 'Videos';
  if (audioExts.includes(ext)) return 'Audio';
  if (docExts.includes(ext)) return 'Documents';
  if (codeExts.includes(ext)) return 'Code';
  return 'Documents';
}

function getUniqueFilePath(dir: string, filename: string): string {
  const ext = path.extname(filename);
  const base = path.basename(filename, ext);
  let destPath = path.join(dir, filename);
  let counter = 1;

  while (fs.existsSync(destPath)) {
    destPath = path.join(dir, `${base} (${counter})${ext}`);
    counter++;
  }

  return destPath;
}

function isAIDownloadOrInternalLink(urlStr: string): boolean {
  try {
    const url = new URL(urlStr);
    const host = url.hostname.toLowerCase();
    const pathname = url.pathname.toLowerCase();
    
    // 1. Check if the URL is a known download, export, or file path
    const hasDownloadKeywords = 
      pathname.includes('/export') || 
      pathname.includes('/download') || 
      pathname.includes('/file') || 
      pathname.includes('/attachment') || 
      pathname.includes('/storage') ||
      url.searchParams.has('export') ||
      url.searchParams.has('download');
      
    if (hasDownloadKeywords) return true;

    // 2. Check for standard file extensions in the pathname
    const fileExtensions = [
      '.pdf', '.docx', '.xlsx', '.pptx', '.zip', '.gz', '.tar', '.csv', 
      '.png', '.jpg', '.jpeg', '.gif', '.webp', '.txt', '.mp3', '.mp4', 
      '.wav', '.webm', '.json', '.xml', '.odt', '.ods', '.odp'
    ];
    if (fileExtensions.some(ext => pathname.endsWith(ext))) {
      return true;
    }

    // 3. Check if it's a domain associated with the AIs' internal sandboxes or services
    const aiFileDomains = [
      'googleusercontent.com',
      'docs.google.com',
      'drive.google.com',
      'storage.googleapis.com',
      'openai.com',
      'chatgpt.com',
      'claude.ai',
      'anthropic.com',
      'deepseek.com',
      'mistral.ai',
      'grok.com',
      'x.ai'
    ];
    
    if (aiFileDomains.some(domain => host === domain || host.endsWith('.' + domain))) {
      return true;
    }
  } catch (err) {
    // Ignore invalid URLs
  }
  return false;
}

function getAIIdFromUrl(url: string, webContentsId?: number): string {
  if (webContentsId !== undefined) {
    const mapped = webviewMap.get(webContentsId);
    if (mapped) return mapped;
  }
  const u = url.toLowerCase();
  
  for (const ai of AI_LIST) {
    try {
      const baseDomain = new URL(ai.url).hostname.replace(/^www\./, '');
      if (u.includes(baseDomain)) return ai.id;
      if (ai.loginUrl) {
        const loginDomain = new URL(ai.loginUrl).hostname.replace(/^www\./, '');
        if (u.includes(loginDomain)) return ai.id;
      }
      if (ai.domainAliases) {
        if (ai.domainAliases.some(alias => u.includes(alias))) return ai.id;
      }
    } catch (err) {
      // URL parsing bypassed for AI due to invalid configuration URL
    }
  }
  
  return 'unknown';
}

interface DownloadLogEntry {
  id: string;
  filename: string;
  path: string;
  subfolder: string;
  aiId: string;
  size: number;
  timestamp: number;
  mimeType: string;
}

interface DownloadErrorEntry {
  id: string;
  filename: string;
  reason: string;
  aiId: string;
  timestamp: number;
}

function appendDownloadLog(entry: DownloadLogEntry) {
  const basePath = getThredFolderPath();
  const logDir = path.join(basePath, '.system', 'Logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'downloads.json');
  let logs: DownloadLogEntry[] = [];

  if (fs.existsSync(logPath)) {
    try {
      const existing = fs.readFileSync(logPath, 'utf-8');
      const parsed = JSON.parse(existing);
      logs = Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      // The log is corrupt/unreadable. Don't silently overwrite it — that
      // would destroy any recoverable history. Move it aside first so the
      // user (or a later import) can still inspect it.

      try {
        fs.renameSync(logPath, `${logPath}.corrupt-${Date.now()}`);
      } catch (_) { /* ignored */ }
      logs = [];
    }
  }

  logs.unshift(entry);

  const MAX_LOG_ENTRIES = 1000;
  if (logs.length > MAX_LOG_ENTRIES) {
    const archived = logs.splice(MAX_LOG_ENTRIES);
    const archivePath = path.join(logDir, 'downloads.archive.json');
    try {
      let existingArchive: DownloadLogEntry[] = [];
      if (fs.existsSync(archivePath)) {
        const raw = fs.readFileSync(archivePath, 'utf-8');
        const parsed = JSON.parse(raw);
        existingArchive = Array.isArray(parsed) ? parsed : [];
      }
      existingArchive.unshift(...archived);
      fs.writeFileSync(archivePath, JSON.stringify(existingArchive, null, 2), 'utf-8');
    } catch (_) { /* ignored */ }
  }

  fs.writeFileSync(logPath, JSON.stringify(logs, null, 2), 'utf-8');
}

function sanitizeFilename(filename: string): string {
  // Replace invalid characters on Windows: < > : " / \ | ? *
  let sanitized = filename.replace(/[<>:"\\/|?*]/g, '_');
  // Truncate base filename to prevent Windows MAX_PATH (260 character) limits
  const ext = path.extname(sanitized);
  const base = path.basename(sanitized, ext);
  if (base.length > 80) {
    sanitized = base.slice(0, 80) + ext;
  }
  return sanitized;
}

const MAX_ERROR_LOG_ENTRIES = 200;

function appendDownloadErrorLog(entry: DownloadErrorEntry) {
  const basePath = getThredFolderPath();
  const logDir = path.join(basePath, '.system', 'Logs');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'downloads-errors.json');
  let errors: DownloadErrorEntry[] = [];
  if (fs.existsSync(logPath)) {
    try {
      const raw = fs.readFileSync(logPath, 'utf-8');
      const parsed = JSON.parse(raw);
      errors = Array.isArray(parsed) ? parsed : [];
    } catch { errors = []; }
  }
  errors.unshift(entry);
  if (errors.length > MAX_ERROR_LOG_ENTRIES) errors = errors.slice(0, MAX_ERROR_LOG_ENTRIES);
  fs.writeFileSync(logPath, JSON.stringify(errors, null, 2), 'utf-8');
}

// Track active Electron DownloadItem objects for cancel support (D22)
const activeDownloadItems: Map<string, Electron.DownloadItem> = new Map();

function registerDownloadHandlers() {
  const sessions = [
    session.defaultSession,
    ...AI_IDS.map(id => session.fromPartition(`persist:${id}`))
  ];

  sessions.forEach(sess => {
    sess.webRequest.onBeforeSendHeaders((details, callback) => {
      let isOAuth = false;
      try {
        const urlObj = new URL(details.url);
        const host = urlObj.hostname.toLowerCase();
        isOAuth = host.includes('google.com') ||
                  host.includes('youtube.com') ||
                  host.includes('live.com') ||
                  host.includes('microsoftonline.com') ||
                  host.includes('apple.com');
      } catch (_) { /* ignored */ }

      if (isOAuth) {
        details.requestHeaders['User-Agent'] = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
        details.requestHeaders['Sec-CH-UA'] = '"Chromium";v="125", "Google Chrome";v="125", "Not-A.Brand";v="99"';
        details.requestHeaders['Sec-CH-UA-Mobile'] = '?0';
        details.requestHeaders['Sec-CH-UA-Platform'] = '"Windows"';
      }
      callback({ cancel: false, requestHeaders: details.requestHeaders });
    });

    sess.on('will-download', (event, item, webContents) => {
      let rawFilename = item.getFilename();
      if (!rawFilename) {
        const mime = item.getMimeType() || '';
        let ext = '.bin';
        if (mime.includes('image/png')) ext = '.png';
        else if (mime.includes('image/jpeg')) ext = '.jpg';
        else if (mime.includes('image/gif')) ext = '.gif';
        else if (mime.includes('image/webp')) ext = '.webp';
        else if (mime.includes('video/mp4')) ext = '.mp4';
        else if (mime.includes('audio/mpeg') || mime.includes('audio/mp3')) ext = '.mp3';
        else if (mime.includes('application/pdf')) ext = '.pdf';
        
        rawFilename = `download_${Date.now()}${ext}`;
      }
      let filename = sanitizeFilename(rawFilename);
      if (!filename || filename === '_') {
        filename = `download_${Date.now()}`;
      }

      try {
        const subfolder = getDownloadSubfolder(filename);
        const basePath = getThredFolderPath();
        const destDir = path.join(basePath, 'Downloads', subfolder);

        fs.mkdirSync(destDir, { recursive: true });

        const destPath = getUniqueFilePath(destDir, filename);
        item.setSavePath(destPath);

        const aiId = getAIIdFromUrl(webContents.getURL(), webContents.id);
        const downloadId = crypto.randomUUID();

        // Store active DownloadItem for cancel support
        activeDownloadItems.set(downloadId, item);

        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download:started', {
            id: downloadId,
            filename,
            path: destPath,
            aiId,
            subfolder,
            totalBytes: item.getTotalBytes(),
            timestamp: Date.now()
          });
        }

        item.on('updated', (_event, state) => {
          if (state === 'progressing') {
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download:progress', {
                filename,
                receivedBytes: item.getReceivedBytes(),
                totalBytes: item.getTotalBytes()
              });
            }
          }
        });

        item.once('done', (_event, state) => {
          activeDownloadItems.delete(downloadId);
          if (state === 'completed') {
            appendDownloadLog({
              id: crypto.randomUUID(),
              filename,
              path: destPath,
              subfolder,
              aiId,
              size: item.getTotalBytes(),
              timestamp: Date.now(),
              mimeType: item.getMimeType()
            });

            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download:complete', {
                filename,
                path: destPath,
                aiId,
                subfolder
              });
            }
          } else {

            appendDownloadErrorLog({
              id: crypto.randomUUID(),
              filename,
              reason: state,
              aiId,
              timestamp: Date.now()
            });
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send('download:failed', { filename, reason: state });
            }
          }
        });
      } catch (err: any) {

        appendDownloadErrorLog({
          id: crypto.randomUUID(),
          filename,
          reason: err.message || 'Error inside handler',
          aiId: 'unknown',
          timestamp: Date.now()
        });
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('download:failed', { filename, reason: err.message || 'Error inside handler' });
        }
      }
    });
  });
}

// --- Thred Folder & Config Management ---
function createThredFolders(basePath: string) {
  THRED_FOLDERS.forEach(folder => {
    fs.mkdirSync(path.join(basePath, folder), { recursive: true });
  });
}

// Default preferences - should ideally be synced with renderer's DEFAULT_PREFS
const DEFAULT_MAIN_PREFS: Record<string, unknown> = {
  defaultSidebarState: 'expanded',
  accentColor: '#F4A460',
  defaultHomeView: 'grid',
  dailySummary: false,
  usageWarnings: true,
  tipsDismissed: false,
  autoUpdate: true,
  keyboardFocusMode: false,
  showAiNumbers: true,
  showTooltips: true,
  confirmClearSessions: true,
  showUrlBar: true,
  limitWarningAlerts: false,
  sessionAutoClear: false,
  showTipsAndUpdates: true,
};

function getSettingsPath(): string {
  const folderPath = getThredFolderPath();
  return path.join(folderPath, '.system', 'Config', 'settings.json');
}

function readSettings(): ThredConfig {
  const p = getSettingsPath();
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    const config = JSON.parse(raw) as ThredConfig;
    // Merge electron-store specific keys
    config.sidebarCollapsed = store.get('sidebarCollapsed', false) as boolean;
    // Backfill installDate for installs created before this field existed.
    if (!config.installDate) {
      try {
        const stat = fs.statSync(p);
        config.installDate = stat.birthtime ? stat.birthtime.toISOString() : new Date().toISOString();
      } catch {
        config.installDate = new Date().toISOString();
      }
      try {
        fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8');
      } catch (_) { /* ignored */ }
    }
    config.appVersion = app.getVersion();
    return config;
  } catch (err) {
    // Return standard defaults if there's any error reading
    const folderPath = getThredFolderPath();
    return {
      sidebarCollapsed: store.get('sidebarCollapsed', false) as boolean,
      thredFolderPath: folderPath,
      username: '',
      onboardingComplete: false,
      appVersion: app.getVersion(),
      preferences: DEFAULT_MAIN_PREFS,
      templates: [],
      aiListOrder: [],
      disabledAIs: [],
      zoomLevels: {},
      openedAIs: {},
    };
  }
}

function writeSettings(config: ThredConfig) {
  const p = getSettingsPath();
  fs.writeFileSync(p, JSON.stringify(config, null, 2), 'utf-8');
  // Also sync key configurations back to electron-store
  if (config.sidebarCollapsed !== undefined) store.set('sidebarCollapsed', config.sidebarCollapsed);
}



function initializeSettingsFile(folderPath: string) {
  const configDir = path.join(folderPath, '.system', 'Config');
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
  }

  const settingsPath = path.join(configDir, 'settings.json');
  if (!fs.existsSync(settingsPath)) {
    const defaultSettings: ThredConfig = {
      sidebarCollapsed: store.get('sidebarCollapsed', false) as boolean,
      thredFolderPath: folderPath,
      username: '',
      onboardingComplete: false,
      installDate: new Date().toISOString(),
      preferences: DEFAULT_MAIN_PREFS,
      templates: [],
      aiListOrder: [],
      disabledAIs: [],
      zoomLevels: {},
      openedAIs: {},
    };
    fs.writeFileSync(settingsPath, JSON.stringify(defaultSettings, null, 2), 'utf-8');
  }
}

// --- IPC Handlers (Config) ---
ipcMain.handle(IPC.THRED_GETCONFIG, async () => {
  return readSettings();
});

ipcMain.handle(IPC.THRED_SETCONFIG, async (_event, config: ThredConfig) => {
  writeSettings(config);
});

ipcMain.handle(IPC.THRED_UPDATECONFIG, async (_event, patch: Partial<ThredConfig>) => {
  const current = readSettings();
  const next = { ...current, ...patch };
  // Deep merge preferences if patch contains partial preferences
  if (patch.preferences && current.preferences) {
    next.preferences = { ...current.preferences, ...patch.preferences };
  }
  writeSettings(next);
  return next;
});

const createWindow = () => {
  // Win 5: Create and show splash screen immediately
  splashWindow = new BrowserWindow({
    width: 300,
    height: 300,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    center: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  
  splashWindow.loadFile(path.join(app.getAppPath(), 'src', 'splash.html'));

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    titleBarStyle: 'hidden',
    transparent: true,
    vibrancy: 'fullscreen-ui',
    backgroundMaterial: 'mica',
    show: false, // Don't show main window immediately
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(app.getAppPath(), 'public', 'icons', 'professional_trimmed.png')
  });

  mainWindow.webContents.on('before-input-event', (_e, input) => {
    if (input.key === 'F12') {
      mainWindow?.webContents.toggleDevTools();
    }
  });

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Closing the window fully quits the app (no hide-to-tray background process).
  mainWindow.on('close', () => {
    mainWindow = null;
    app.quit();
  });

  mainWindow.once('ready-to-show', () => {
    // Win 5: Close splash window and show main window
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }

    mainWindow?.show();
    mainWindow?.focus();
  });

  const registerGlobalMaximize = () => {
    try {
      if (!globalShortcut.isRegistered('CommandOrControl+Shift+N')) {
        globalShortcut.register('CommandOrControl+Shift+N', () => {
          if (mainWindow) {
            if (mainWindow.isMinimized()) {
              mainWindow.restore();
            }
            mainWindow.show();
            mainWindow.focus();
          }
        });
      }
    } catch (_) { /* ignored */ }
  };

  const unregisterGlobalMaximize = () => {
    try {
      if (globalShortcut.isRegistered('CommandOrControl+Shift+N')) {
        globalShortcut.unregister('CommandOrControl+Shift+N');
      }
    } catch (_) { /* ignored */ }
  };

  mainWindow.on('minimize', registerGlobalMaximize);
  mainWindow.on('hide', registerGlobalMaximize);
  mainWindow.on('restore', unregisterGlobalMaximize);
  mainWindow.on('show', unregisterGlobalMaximize);
  mainWindow.on('focus', unregisterGlobalMaximize);
  mainWindow.on('closed', unregisterGlobalMaximize);

  const shouldOpenAsOAuthPopup = (targetUrl: string): boolean => {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return false;
    }

    if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
      return false;
    }

    const host = parsedUrl.hostname.toLowerCase();
    const pathname = parsedUrl.pathname.toLowerCase();

    // OAuth provider hosts that must stay in-app to capture the callback redirect.
    const oauthHosts = [
      'accounts.google.com',
      'accounts.youtube.com',
      'login.live.com',
      'login.microsoftonline.com',
      'appleid.apple.com',
    ];
    const matchesHost = (h: string) => host === h || host.endsWith('.' + h);

    return (
      oauthHosts.some(matchesHost) ||
      host.endsWith('.okta.com') ||
      host.startsWith('sso.') ||
      (matchesHost('github.com') && pathname.startsWith('/login'))
    );
  };

  const openOAuthPopup = (url: string, parentWebContents: Electron.WebContents) => {
    const authWindow = new BrowserWindow({
      width: 700,
      height: 650,
      parent: mainWindow ?? undefined,
      autoHideMenuBar: true,
      webPreferences: {
        session: parentWebContents.session, // Crucial: share same session partition
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Spoof a standard newer Chrome UA so Google doesn't block the OAuth flow for being "too old"
    authWindow.webContents.userAgent =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';

    let callbackHandled = false;

    const handleCallback = (callbackUrl: string) => {
      if (callbackHandled) return;
      callbackHandled = true;
      parentWebContents.loadURL(callbackUrl);
      if (!authWindow.isDestroyed()) authWindow.close();
    };

    const isCallbackUrl = (navUrl: string): boolean => {
      try {
        const u = new URL(navUrl);
        const host = u.hostname.toLowerCase();
        
        // OAuth and login helpers must stay inside the popup
        const oauthHosts = [
          'accounts.google.com',
          'accounts.youtube.com',
          'login.live.com',
          'login.microsoftonline.com',
          'appleid.apple.com',
          'google.com',
          'policies.google.com',
          'support.google.com',
          'youtube.com',
          'live.com',
          'microsoftonline.com',
          'microsoft.com',
          'okta.com',
        ];
        const matchesHost = (h: string) => host === h || host.endsWith('.' + h);
        
        const isStillOAuth =
          oauthHosts.some(matchesHost) ||
          host.endsWith('.okta.com') ||
          host.startsWith('sso.');
          
        return !isStillOAuth;
      } catch {
        return false;
      }
    };

    // Client-side navigation (window.location, meta refresh)
    authWindow.webContents.on('will-navigate', (_, navUrl) => {
      if (isCallbackUrl(navUrl)) {
        handleCallback(navUrl);
      }
    });

    // Server-side HTTP redirect (302, 307, etc.)
    authWindow.webContents.on('will-redirect', (_, navUrl) => {
      if (isCallbackUrl(navUrl)) {
        handleCallback(navUrl);
      }
    });

    authWindow.loadURL(url);
  };

  mainWindow.webContents.on('will-attach-webview', (event, webPreferences, params) => {
    webPreferences.preload = path.join(__dirname, 'preload.js');
  });

  mainWindow.webContents.on('did-attach-webview', (_event, wc) => {
    attachZoomShortcutInterceptor(wc);

    // Intercept top-level navigations to OAuth endpoints (like direct link clicks or form submissions)
    wc.on('will-navigate', (event, url) => {
      if (shouldOpenAsOAuthPopup(url)) {
        event.preventDefault();
        openOAuthPopup(url, wc);
      }
    });

    // Intercept server-side redirects (like 302 redirects to accounts.google.com)
    wc.on('will-redirect', (event, url) => {
      if (shouldOpenAsOAuthPopup(url)) {
        event.preventDefault();
        openOAuthPopup(url, wc);
      }
    });

    wc.setWindowOpenHandler((details) => {
      if (shouldOpenAsOAuthPopup(details.url)) {
        openOAuthPopup(details.url, wc);
        return { action: 'deny' };
      }

      if (isAIDownloadOrInternalLink(details.url)) {
        return {
          action: 'allow',
          overrideBrowserWindowOptions: {
            show: false
          }
        };
      }

      shell.openExternal(details.url);
      return { action: 'deny' };
    });

    wc.on('did-create-window', (childWindow) => {
      setTimeout(() => {
        if (childWindow && !childWindow.isDestroyed()) {
          childWindow.destroy();
        }
      }, 20000);
    });
  });

  // Inject AI tool scripts into every webview after load
  mainWindow.webContents.on('did-attach-webview', (_event, wc) => {
    let resolveFn: ((aiId: string) => void) | undefined;
    const promise = new Promise<string>((resolve) => {
      resolveFn = resolve;
    });
    webviewReadyMap.set(wc.id, { promise, resolve: resolveFn! });

    const injectScripts = async () => {
      let aiId = webviewMap.get(wc.id);
      if (!aiId) {
        const entry = webviewReadyMap.get(wc.id);
        if (entry) {
          try {
            aiId = await Promise.race([
              entry.promise,
              new Promise<string>((_, reject) =>
                setTimeout(() => reject(new Error(`Timeout waiting for webview registration (webContentsId: ${wc.id})`)), 3000)
              )
            ]);
          } catch (err: any) {

            return;
          }
        } else {

          return;
        }
      }
      try {
        wc.executeJavaScript(jsInjectAll(aiId)).catch(() => {
          // Ignore
        });
      } catch (err) { console.error('[Thred Main] Ignored error:', err); }
    };

    const handleConsoleMessage = (_event: Electron.Event, _level: number, message: string) => {
      if (typeof message !== 'string' || !message.startsWith('THRED_MSG:')) return;
      // Only accept messages from a registered AI webview (our injected script).
      if (!webviewMap.has(wc.id)) return;
      try {
        const payload = JSON.parse(message.slice(10));
        if (!payload || typeof payload.type !== 'string') return;
        
        // Strict allowlist for THRED_MSG bridge to prevent malicious IPC injection
        const ALLOWED_THRED_MSG_TYPES = new Set([
          'THRED_COPY_CONTEXT',
          'THRED_LAST_CLICK_CONTEXT',
          'THRED_SAVE_PROMPT',
          'THRED_COPY'
        ]);
        if (!ALLOWED_THRED_MSG_TYPES.has(payload.type)) {

          return;
        }

        handleAIMessage(payload, wc);
      } catch (_) { /* ignored */ }
    };

    wc.on('did-finish-load', injectScripts);
    wc.on('dom-ready', injectScripts);
    wc.on('did-navigate-in-page', injectScripts);
    wc.on('console-message', handleConsoleMessage);

    wc.once('destroyed', () => {
      webviewReadyMap.delete(wc.id);
      wc.removeListener('did-finish-load', injectScripts);
      wc.removeListener('dom-ready', injectScripts);
      wc.removeListener('did-navigate-in-page', injectScripts);
      wc.removeListener('console-message', handleConsoleMessage);
    });
  });

  // Old electron-store usage (replaced by thred:getConfig)
  // Keep main window always visible on startup
};

app.whenReady().then(async () => {
  startMemoryProfiler();

  // Strip "Electron" and the app name from the default User-Agent
  // This gives us a 100% genuine Chrome signature matching the exact Chromium version used by Electron,
  // which perfectly passes Cloudflare Turnstile's advanced fingerprinting.
  const defaultUA = session.defaultSession.getUserAgent();
  const cleanUA = defaultUA.split(' ').filter(part => !part.toLowerCase().includes('electron') && !part.toLowerCase().includes('thred')).join(' ');
  app.userAgentFallback = cleanUA;

  
    

  let storeKey = secretStore.getSecret('store_key');
  if (!storeKey) {
    storeKey = crypto.randomBytes(32).toString('hex');
    secretStore.setSecret('store_key', storeKey);
  }
  store = new Store({ encryptionKey: storeKey });

  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const deniedPermissions = ['media', 'geolocation', 'midi', 'midiSysex', 'openExternal', 'window-placement'];
    if (deniedPermissions.includes(permission)) {
      callback(false);
    } else {
      callback(true);
    }
  });

  protocol.handle('media', (request) => {
    let filePath = decodeURIComponent(
      request.url.replace(/^media:\/\/local\//i, '').replace(/^media:\/\//i, '')
    );

    // Convert forward slashes to backslashes on Windows and format drive letter
    if (process.platform === 'win32') {
      filePath = filePath.replace(/\//g, '\\');
      while (filePath.startsWith('\\') || filePath.startsWith('/')) {
        filePath = filePath.slice(1);
      }
      if (/^[a-zA-Z]:?\\/.test(filePath)) {
        const drive = filePath.charAt(0);
        let rest = filePath.slice(1);
        if (rest.startsWith(':')) rest = rest.slice(1);
        while (rest.startsWith('\\')) rest = rest.slice(1);
        filePath = drive + ':\\' + rest;
      }
    }

    // Security: only serve files inside the Thred storage folder or the system downloads folder.
    const root1 = path.resolve(getThredFolderPath());
    const root2 = path.resolve(app.getPath('downloads'));
    const resolved = path.resolve(filePath);

    const rel1 = path.relative(root1, resolved);
    const rel2 = path.relative(root2, resolved);

    const isInsideRoot1 = !rel1.startsWith('..') && !path.isAbsolute(rel1);
    const isInsideRoot2 = !rel2.startsWith('..') && !path.isAbsolute(rel2);

    if (!isInsideRoot1 && !isInsideRoot2) {
      return new Response('Forbidden', { status: 403 });
    }

    if (!fs.existsSync(resolved)) {
      return new Response('Not Found', { status: 404 });
    }

    const ext = path.extname(resolved).toLowerCase();
    const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.bmp', '.ico', '.avif'];

    if (imageExts.includes(ext)) {
      let mimeType = 'image/png';
      if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.svg') mimeType = 'image/svg+xml';
      else if (ext === '.bmp') mimeType = 'image/bmp';
      else if (ext === '.ico') mimeType = 'image/x-icon';
      else if (ext === '.avif') mimeType = 'image/avif';

      const data = fs.readFileSync(resolved);
      return new Response(data, {
        status: 200,
        headers: {
          'Content-Type': mimeType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        }
      });
    }

    const fileUrl = pathToFileURL(resolved).toString();
    const fetchOptions: RequestInit = {
      method: request.method,
    };

    const headersInit: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      if (key.toLowerCase() !== 'referer') {
        headersInit[key] = value;
      }
    });
    fetchOptions.headers = headersInit;

    return net.fetch(fileUrl, fetchOptions).then(response => {
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });
    });
  });

  let folderPath = store.get('thredFolderPath') as string;
  let needsPicker = !folderPath || !fs.existsSync(folderPath);
  if (!folderPath && store.get('thredFolderPath')) {
    store.delete('thredFolderPath');
  }

  if (needsPicker) {
    const pickerParent = new BrowserWindow({
      width: 1,
      height: 1,
      show: false,
      skipTaskbar: true,
      paintWhenInitiallyHidden: true,
    });
    try {
      while (needsPicker) {
        const intro = await dialog.showMessageBox(pickerParent, {
          type: 'info',
          buttons: ['Choose Folder'],
          title: 'Setup Thred Storage',
          message: 'Choose where Thred stores your data (screenshots, notes, prompts, and settings).',
          detail: 'Default suggestion: Documents/Thred, but any location works.',
          noLink: true,
        });

        if (intro.response === 0) {
          const defaultPath = path.join(app.getPath('documents'), 'Thred');
          const result = await dialog.showOpenDialog(pickerParent, {
            title: 'Select Thred Storage Directory',
            defaultPath: defaultPath,
            properties: ['openDirectory', 'createDirectory'],
          });

          if (!result.canceled && result.filePaths[0]) {
            folderPath = result.filePaths[0];
            store.set('thredFolderPath', folderPath);
            needsPicker = false;
          }
        } else {
          const choice = await dialog.showMessageBox(pickerParent, {
            type: 'warning',
            buttons: ['Retry', 'Quit App'],
            title: 'Storage Required',
            message: 'A storage folder is required to run Thred. Please choose a location.',
            noLink: true,
            defaultId: 0,
            cancelId: 1,
          });
          if (choice.response === 1) {
            pickerParent.destroy();
            app.quit();
            return;
          }
        }
      }
    } finally {
      if (!pickerParent.isDestroyed()) pickerParent.destroy();
    }
  }

  // Create Thred folders
  try {
    createThredFolders(folderPath);

    // Initialize/ensure Thred/Config/settings.json exists
    initializeSettingsFile(folderPath);

    currentThredFolderPath = folderPath;
    registerDownloadHandlers();

    // Read settings once on launch (backfills installDate for older installs).
    readSettings();

    createWindow();
  } catch (err) {

    dialog.showErrorBox('Thred initialization failed', String(err instanceof Error ? err.stack || err.message : err));
    app.quit();
    return;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

ipcMain.on('download:blob', async (event, payload: { uint8Array: number[]; filename: string; mimeType: string }) => {
  const { uint8Array, filename, mimeType } = payload;
  const buffer = Buffer.from(uint8Array);
  
  const sanitized = sanitizeFilename(filename);
  try {
    const subfolder = getDownloadSubfolder(sanitized);
    const basePath = getThredFolderPath();
    const destDir = path.join(basePath, 'Downloads', subfolder);
    
    fs.mkdirSync(destDir, { recursive: true });
    
    const destPath = getUniqueFilePath(destDir, sanitized);
    fs.writeFileSync(destPath, buffer);
    
    const aiId = getAIIdFromUrl(event.sender.getURL(), event.sender.id);
    
    appendDownloadLog({
      id: crypto.randomUUID(),
      filename: sanitized,
      path: destPath,
      subfolder,
      aiId,
      size: buffer.length,
      timestamp: Date.now(),
      mimeType
    });
    
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:complete', {
        filename: sanitized,
        path: destPath,
        aiId,
        subfolder
      });
    }
  } catch (err: any) {

    appendDownloadErrorLog({
      id: crypto.randomUUID(),
      filename: sanitized,
      reason: err.message || 'Error saving blob',
      aiId: 'unknown',
      timestamp: Date.now()
    });
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('download:failed', { filename: sanitized, reason: err.message || 'Error saving blob' });
    }
  }
});

ipcMain.on(IPC.WINDOW_MINIMIZE, () => {
  if (!mainWindow) return;
  mainWindow.minimize();
});
ipcMain.on(IPC.WINDOW_MAXIMIZE, () => {
  if (!mainWindow) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});
ipcMain.on(IPC.WINDOW_CLOSE, () => {
  if (!mainWindow) return;
  mainWindow.close();
});
ipcMain.on(IPC.APP_QUIT, () => {
  app.quit();
});
ipcMain.on(IPC.APP_RESTART, () => {
  app.relaunch();
  app.quit();
});
ipcMain.on(IPC.GET_PRELOAD_PATH, (event) => {
  event.returnValue = path.join(__dirname, 'preload.js');
});
ipcMain.handle(IPC.GET_WINDOW_IS_MAXIMIZED, () => mainWindow?.isMaximized() ?? false);

ipcMain.handle(IPC.SETTINGS_GETTHREDFOLDERPATH, async () => {
  return getThredFolderPath();
});

ipcMain.handle(IPC.SETTINGS_CHANGETHREDFOLDERPATH, async () => {
  if (!mainWindow) return null;
  const defaultPath = store.get('thredFolderPath', '') as string || path.join(app.getPath('documents'), 'Thred');
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Thred Storage Directory',
    defaultPath,
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const newPath = result.filePaths[0];
  store.set('thredFolderPath', newPath);
  currentThredFolderPath = newPath;
  createThredFolders(newPath);
  initializeSettingsFile(newPath);
  return newPath;
});

ipcMain.handle(IPC.SAVE_FILE, async (_event, data: Buffer | Uint8Array, defaultPath: string) => {
  if (!mainWindow) return false;
  try {
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
      defaultPath,
    });
    if (canceled || !filePath) return false;
    fs.writeFileSync(filePath, Buffer.from(data));
    return true;
  } catch (err) {

    return false;
  }
});

// Capture only the active AI webview's webContents (no sidebar, no topbar)
ipcMain.handle(IPC.SCREENSHOT_CAPTURE_CONTENT, async (_event, payload: { aiId: string }) => {
  if (!payload || !payload.aiId) return null;
  try {
    // Find the webContents for the given aiId
    let targetWc: Electron.WebContents | null = null;
    for (const [wcId, id] of webviewMap.entries()) {
      if (id === payload.aiId) {
        const wc = webContents.fromId(wcId);
        if (wc && !wc.isDestroyed()) {
          targetWc = wc;
          break;
        }
      }
    }
    if (!targetWc) return null;

    // capturePage() with no rect captures the visible viewport of the webContents only
    const image = await targetWc.capturePage();
    const size = image.getSize();
    return {
      base64: image.toPNG().toString('base64'),
      width: size.width,
      height: size.height,
    };
  } catch (err) {

    return null;
  }
});

// Capture the entire Thred window (sidebar + topbar + main content)
ipcMain.handle(IPC.SCREENSHOT_CAPTURE_WORKSPACE, async () => {
  if (!mainWindow || mainWindow.isDestroyed()) return null;
  try {
    // capturePage() with no bounds captures the full window
    const image = await mainWindow.webContents.capturePage();
    const size = image.getSize();
    return {
      base64: image.toPNG().toString('base64'),
      width: size.width,
      height: size.height,
    };
  } catch (err) {

    return null;
  }
});



// Copy a base64 PNG image to the system clipboard
ipcMain.handle(IPC.SCREENSHOT_COPY_TO_CLIPBOARD, async (_event, payload: { base64: string }) => {
  if (!payload || !payload.base64) return false;
  const image = nativeImage.createFromBuffer(Buffer.from(payload.base64, 'base64'));
  if (image.isEmpty()) return false;
  clipboard.writeImage(image);
  return true;
});

ipcMain.handle('clipboard:write-file', async (_event, filePath: string) => {
  try {
    if (!filePath || !fs.existsSync(filePath)) return false;
    const ext = path.extname(filePath).toLowerCase();
    
    // 1. If it's an image, copy as image
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext)) {
      const img = nativeImage.createFromPath(filePath);
      clipboard.writeImage(img);
      return true;
    }
    
    // 2. If it's a text/code file, copy as text
    if (['.txt', '.js', '.ts', '.jsx', '.tsx', '.json', '.html', '.css', '.py', '.go', '.sh', '.md'].includes(ext)) {
      const text = fs.readFileSync(filePath, 'utf-8');
      clipboard.writeText(text);
      return true;
    }
    
    // 3. Otherwise, copy the file reference so it can be pasted as a file
    (clipboard.write as any)({
      filenames: [filePath]
    });
    return true;
  } catch (err) {

    return false;
  }
});

// --- Zoom controls ---
ipcMain.on(IPC.REGISTER_WEBVIEW, (_event, payload: { aiId: string; webContentsId: number }) => {
  if (!payload || !payload.aiId || typeof payload.webContentsId !== 'number') return;
  webviewMap.set(payload.webContentsId, payload.aiId);

  // Resolve the ready promise if it exists
  const entry = webviewReadyMap.get(payload.webContentsId);
  if (entry) {
    entry.resolve(payload.aiId);
  }

  // Apply stored zoom factor on registration so the AI's level is restored
  // This will now read from settings.json
  const config = readSettings();
  const factor = config.zoomLevels[payload.aiId];
  if (typeof factor === 'number') {
    const wc = webContents.fromId(payload.webContentsId);
    if (wc && !wc.isDestroyed()) {
      try { wc.setZoomFactor(factor); } catch (err) { console.error('[Thred Main] Ignored error:', err); }
    }
  }

  // Cleanup when the webContents is destroyed (e.g. webview unmounts)
  const wc = webContents.fromId(payload.webContentsId);
  if (wc) {
    // Shift+F12 opens this webview's DevTools
    wc.on('before-input-event', (_e, input) => {
      if (input.type !== 'keyDown') return;
    });

    wc.once('destroyed', () => {
      webviewMap.delete(payload.webContentsId);
    });
  }
});

ipcMain.on(IPC.SET_ZOOM, (_event, payload: { aiId: string; factor: number }) => {
  if (!payload || !payload.aiId || typeof payload.factor !== 'number') return;
  const clamped = Math.max(0.5, Math.min(2.0, payload.factor));
  zoomMap.set(payload.aiId, clamped); // Still track in-memory zoom for immediate apply

  const config = readSettings();
  if (!config.zoomLevels) config.zoomLevels = {};
  config.zoomLevels[payload.aiId] = clamped;
  writeSettings(config);

  for (const [wcId, aiId] of webviewMap.entries()) {
    if (aiId === payload.aiId) {
      const wc = webContents.fromId(wcId);
      if (wc && !wc.isDestroyed()) {
        try { wc.setZoomFactor(clamped); } catch (err) { console.error('[Thred Main] Ignored error:', err); }
      }
    }
  }
});

function applyZoomShortcut(action: 'in' | 'out' | 'reset', aiId: string) {
  const current = zoomMap.get(aiId) ?? 1.0;
  let next = current;
  if (action === 'in') next = Math.min(2.0, +(current + 0.1).toFixed(2));
  else if (action === 'out') next = Math.max(0.5, +(current - 0.1).toFixed(2));
  else if (action === 'reset') next = 1.0;

  if (next === current) return;
  zoomMap.set(aiId, next);

  const config = readSettings();
  if (!config.zoomLevels) config.zoomLevels = {};
  config.zoomLevels[aiId] = next;
  writeSettings(config);

  for (const [wcId, id] of webviewMap.entries()) {
    if (id === aiId) {
      const wc = webContents.fromId(wcId);
      if (wc && !wc.isDestroyed()) {
        try { wc.setZoomFactor(next); } catch (err) { console.error('[Thred Main] Ignored error:', err); }
      }
    }
  }
  mainWindow?.webContents.send('zoom-applied', { aiId, factor: next, action });
}

// Attach before-input-event to every webview's webContents so shortcuts work
// when the BrowserView has focus, and never leak to the AI site's own shortcuts.
function isThredShortcut(input: Electron.Input): boolean {
  if (input.type !== 'keyDown') return false;

  const isCtrl = input.control || input.meta;
  const isShift = input.shift;
  const isAlt = input.alt;
  const key = input.key.toLowerCase();

  // Escape
  if (input.key === 'Escape') return true;

  // Alt + 1-0 or Alt + Arrows
  if (isAlt && !isCtrl && !isShift) {
    if (key >= '0' && key <= '9') return true;
    if (input.key === 'ArrowLeft' || input.key === 'ArrowRight') return true;
  }

  // Ctrl/Cmd + shortcuts
  if (isCtrl) {
    // Ctrl + character (excluding zoom shortcuts)
    if (!isShift && !isAlt) {
      const singleCtrlKeys = ['k', 'p', '/', 'q', ',', 'd', 'l', 'm', 'h', 'b', '[', ']', 'j', '\\', 's'];
      if (singleCtrlKeys.includes(key)) return true;
    }

    // Ctrl + Shift shortcuts
    if (isShift && !isAlt) {
      const ctrlShiftKeys = ['q', 'm', 'b', 'i', 'a', 'r', 'p', 'y', 'u', 'h', 'n', 'd', 's'];
      if (ctrlShiftKeys.includes(key)) return true;
    }

    // Ctrl + Alt shortcuts
    if (isAlt && !isShift) {
      const ctrlAltKeys = ['l', 'e', 'w', 'p', 'n', 'm', 'c', 'k', 'q', 'a', 'r', 'j', 'z', 'h', 'i', 'd', '=', 'v', 'b', 't'];
      const ctrlAltCodes = ['KeyL', 'KeyE', 'KeyW', 'KeyP', 'KeyN', 'KeyM', 'KeyC', 'KeyK', 'KeyQ', 'KeyA', 'KeyR', 'KeyJ', 'KeyZ', 'KeyH', 'KeyI', 'KeyD', 'Equal', 'KeyV', 'KeyB', 'KeyT'];
      if (ctrlAltKeys.includes(key) || (input.code && ctrlAltCodes.includes(input.code))) return true;
    }

    // Ctrl + Alt + Shift shortcuts
    if (isAlt && isShift) {
      const ctrlAltShiftKeys = ['s'];
      const ctrlAltShiftCodes = ['KeyS'];
      if (ctrlAltShiftKeys.includes(key) || (input.code && ctrlAltShiftCodes.includes(input.code))) return true;
    }
  }

  return false;
}

function attachZoomShortcutInterceptor(wc: Electron.WebContents) {
  wc.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;

    const isCtrl = input.control || input.meta;
    const isShift = input.shift;
    const isAlt = input.alt;
    const key = input.key.toLowerCase();


    // Handle zoom shortcuts immediately in main process
    if (isCtrl && !isShift && !isAlt && (key === '=' || key === '+' || key === '-' || key === '_' || key === '0')) {
      const aiId = webviewMap.get(wc.id);
      if (aiId) {
        event.preventDefault();
        if (key === '=' || key === '+') applyZoomShortcut('in', aiId);
        else if (key === '-' || key === '_') applyZoomShortcut('out', aiId);
        else if (key === '0') applyZoomShortcut('reset', aiId);
        return;
      }
    }

    // Intercept other shortcuts and forward them to the renderer
    if (isThredShortcut(input)) {
      event.preventDefault();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('webview-keydown', {
          key: input.key,
          code: input.code,
          ctrlKey: input.control || input.meta,
          shiftKey: input.shift,
          altKey: input.alt,
          metaKey: input.meta
        });
      }
    }
  });
}

// --- IPC Handlers (Vault) ---
function getVaultCategoryFolder(category: string): string {
  const root = getThredFolderPath();
  if (['Notes', 'To-do', 'Scratchpad', 'Calendar', 'Calculations'].includes(category)) {
    return path.join(root, 'Vault', 'Notebook', category);
  }
  if (['Content Capture', 'Workspace Capture'].includes(category)) {
    return path.join(root, 'Vault', 'Screenshots', category);
  }
  if (category === 'Bookmark') {
    return path.join(root, 'Bookmark');
  }
  return path.join(root, 'Vault', category);
}

// Maps filesystem category folder names to the new `kind` discriminator
const CATEGORY_TO_KIND: Record<string, string> = {
  'Prompts': 'prompt',
  'Codebook': 'code',
  'Responses': 'response',
  'Notes': 'note',
  'To-do': 'todo',
  'Scratchpad': 'scratchpad',
  'Whiteboard': 'whiteboard',
  'Content Capture': 'screenshot',
  'Workspace Capture': 'screenshot',
  'Calendar': 'calendar',
  'Calculations': 'calculation',
  'Notebooks': 'note', // legacy catch-all, refined by notebookSubtab
};

ipcMain.handle(IPC.THRED_VAULT_GETALL, async () => {
  const categories = [
    'Prompts', 'Codebook', 'Responses', 'Whiteboard',
    'Notebooks',
    'Notes', 'To-do', 'Scratchpad', 'Calendar', 'Calculations',
    'Content Capture', 'Workspace Capture',
    'Bookmark'
  ];
  const allItems: any[] = [];

  categories.forEach((category) => {
    const catDir = getVaultCategoryFolder(category);
    if (fs.existsSync(catDir)) {
      const files = fs.readdirSync(catDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
            const item = JSON.parse(content);
            // Ensure `kind` is set (migration bridge for old items)
            if (!item.kind) {
              if (item.notebookSubtab === 'todos') item.kind = 'todo';
              else if (item.notebookSubtab === 'scratchpad') item.kind = 'scratchpad';
              else if (item.notebookSubtab === 'calendar') item.kind = 'calendar';
              else if (item.notebookSubtab === 'calculator') item.kind = 'calculation';
              else item.kind = CATEGORY_TO_KIND[category] || 'note';
            }
            allItems.push({ ...item, category });
          } catch (_) { /* ignored */ }
        }
      });
    }
  });
  return allItems;
});

ipcMain.handle(IPC.THRED_VAULT_SAVE, async (_event, item: { id: string, category: string;[key: string]: any }) => {
  if (!item.id || !item.category) throw new Error('Item must have id and category');
  const catDir = getVaultCategoryFolder(item.category);
  if (!fs.existsSync(catDir)) {
    fs.mkdirSync(catDir, { recursive: true });
  }
  const itemPath = path.join(catDir, `${item.id}.json`);
  fs.writeFileSync(itemPath, JSON.stringify(item, null, 2), 'utf-8');
});

ipcMain.handle(IPC.THRED_VAULT_DELETE, async (_event, payload: { id: string, category: string }) => {
  if (!payload.id || !payload.category) throw new Error('Must provide id and category');
  const catDir = getVaultCategoryFolder(payload.category);
  const itemPath = path.join(catDir, `${payload.id}.json`);
  if (fs.existsSync(itemPath)) {
    fs.unlinkSync(itemPath);
  }
});

// --- Vault Export/Import (F2) ---
ipcMain.handle(IPC.THRED_VAULT_EXPORTALL, async () => {
  // Reuse getAll to collect all items, then serialize
  const categories = [
    'Prompts', 'Codebook', 'Responses', 'Whiteboard',
    'Notebooks',
    'Notes', 'To-do', 'Scratchpad', 'Calendar', 'Calculations',
    'Content Capture', 'Workspace Capture',
    'Bookmark'
  ];
  const allItems: any[] = [];
  categories.forEach((category) => {
    const catDir = getVaultCategoryFolder(category);
    if (fs.existsSync(catDir)) {
      const files = fs.readdirSync(catDir);
      files.forEach(file => {
        if (file.endsWith('.json')) {
          try {
            const content = fs.readFileSync(path.join(catDir, file), 'utf-8');
            const item = JSON.parse(content);
            if (!item.kind) {
              if (item.notebookSubtab === 'todos') item.kind = 'todo';
              else if (item.notebookSubtab === 'scratchpad') item.kind = 'scratchpad';
              else if (item.notebookSubtab === 'calendar') item.kind = 'calendar';
              else if (item.notebookSubtab === 'calculator') item.kind = 'calculation';
              else item.kind = CATEGORY_TO_KIND[category] || 'note';
            }
            allItems.push({ ...item, category });
          } catch (_) { /* ignored */ }
        }
      });
    }
  });
  return JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), items: allItems }, null, 2);
});

ipcMain.handle(IPC.THRED_VAULT_IMPORTALL, async (_event, jsonStr: string, mode: 'merge' | 'replace') => {
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error('Invalid JSON');
  }
  const items: any[] = parsed.items || (Array.isArray(parsed) ? parsed : []);
  if (!items.length) return 0;

  // If replace mode, clear all existing vault folders first
  if (mode === 'replace') {
    const root = getThredFolderPath();
    const vaultRoot = path.join(root, 'Vault');
    const clearDirs = ['Prompts', 'Codebook', 'Responses', 'Whiteboard', 'Notebook'];
    clearDirs.forEach(dir => {
      const dirPath = path.join(vaultRoot, dir);
      if (fs.existsSync(dirPath)) {
        fs.readdirSync(dirPath).forEach(f => {
          const fp = path.join(dirPath, f);
          if (f.endsWith('.json')) fs.unlinkSync(fp);
          else if (fs.statSync(fp).isDirectory()) {
            fs.readdirSync(fp).forEach(sf => {
              const sfp = path.join(fp, sf);
              if (sf.endsWith('.json')) fs.unlinkSync(sfp);
            });
          }
        });
      }
    });
  }

  // Write each item
  let count = 0;
  for (const item of items) {
    if (!item.id || !item.category) continue;
    // Ensure kind
    if (!item.kind) {
      if (item.notebookSubtab === 'todos') item.kind = 'todo';
      else if (item.notebookSubtab === 'scratchpad') item.kind = 'scratchpad';
      else if (item.notebookSubtab === 'calendar') item.kind = 'calendar';
      else if (item.notebookSubtab === 'calculator') item.kind = 'calculation';
      else item.kind = CATEGORY_TO_KIND[item.category] || 'note';
    }
    const catDir = getVaultCategoryFolder(item.category);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
    fs.writeFileSync(path.join(catDir, `${item.id}.json`), JSON.stringify(item, null, 2), 'utf-8');
    count++;
  }
  return count;
});

// --- IPC Handlers (Tools) ---
function getToolFolder(toolName: string): string {
  const base = store.get('thredFolderPath') as string;
  const t = toolName.toLowerCase();
  if (t === 'notes' || t === 'note') return path.join(base, 'Tools', 'Notes');
  if (t === 'todos' || t === 'todo') return path.join(base, 'Tools', 'Todos');
  if (t === 'flashcards' || t === 'flashcard') return path.join(base, 'Tools', 'Flashcards');
  if (t === 'kanban') return path.join(base, 'Tools', 'Kanban');
  if (t === 'bookmarks' || t === 'bookmark') return path.join(base, 'Tools', 'Bookmarks');
  return path.join(base, 'Tools', toolName.charAt(0).toUpperCase() + toolName.slice(1));
}

function getBookmarkFilePath(): string {
  return path.join(getToolFolder('bookmarks'), 'bookmarks.json');
}

function readBookmarks(): any[] {
  const p = getBookmarkFilePath();
  try {
    if (fs.existsSync(p)) {
      const raw = fs.readFileSync(p, 'utf-8');
      return JSON.parse(raw);
    }
  } catch (_) { /* ignored */ }
  return [];
}

function writeBookmarks(data: any[]): void {
  const dir = getToolFolder('bookmarks');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(getBookmarkFilePath(), JSON.stringify(data, null, 2), 'utf-8');
}

ipcMain.removeHandler('thred:tools:get');
ipcMain.handle(IPC.THRED_TOOLS_GET, async (_event, toolName: string) => {
  const toolDir = getToolFolder(toolName);
  const dataPath = path.join(toolDir, 'data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {

      return null;
    }
  }
  return null;
});

ipcMain.removeHandler('thred:tools:save');
ipcMain.handle(IPC.THRED_TOOLS_SAVE, async (_event, payload: { toolName: string, data: any }) => {
  const toolDir = getToolFolder(payload.toolName);
  if (!fs.existsSync(toolDir)) {
    fs.mkdirSync(toolDir, { recursive: true });
  }
  const dataPath = path.join(toolDir, 'data.json');
  fs.writeFileSync(dataPath, JSON.stringify(payload.data, null, 2), 'utf-8');
});

ipcMain.handle(IPC.READ_CLIPBOARD_TEXT, async () => {
  return clipboard.readText();
});

// --- IPC Handlers (Bookmarks) ---
ipcMain.handle(IPC.BOOKMARKS_GETALL, async () => {
  return readBookmarks();
});

ipcMain.handle(IPC.BOOKMARKS_ADD, async (_event, bookmark: { name: string; url: string; aiId: string; category: string; favicon?: string }) => {
  const bookmarks = readBookmarks();
  let favicon = bookmark.favicon;
  if (!favicon && bookmark.url) {
    try {
      const domain = new URL(bookmark.url).hostname;
      favicon = `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
    } catch {
      // Ignore invalid URLs
    }
  }
  const newBookmark = {
    id: crypto.randomUUID(),
    name: bookmark.name,
    url: bookmark.url,
    aiId: bookmark.aiId,
    category: bookmark.category || 'General',
    createdAt: new Date().toISOString(),
    favicon,
    pinned: (bookmark as any).pinned || false,
  };
  // Check if already bookmarked by URL
  const existingIndex = bookmarks.findIndex((b: any) => b.url === bookmark.url);
  if (existingIndex >= 0) {
    bookmarks[existingIndex] = { ...bookmarks[existingIndex], ...newBookmark, id: bookmarks[existingIndex].id, createdAt: bookmarks[existingIndex].createdAt };
  } else {
    bookmarks.push(newBookmark);
  }
  writeBookmarks(bookmarks);
  return existingIndex >= 0 ? bookmarks[existingIndex] : newBookmark;
});

ipcMain.handle(IPC.BOOKMARKS_UPDATE, async (_event, id: string, updates: { name?: string; category?: string; favicon?: string }) => {
  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex((b: any) => b.id === id);
  if (index >= 0) {
    if (updates.name !== undefined) bookmarks[index].name = updates.name;
    if (updates.category !== undefined) bookmarks[index].category = updates.category;
    if (updates.favicon !== undefined) bookmarks[index].favicon = updates.favicon;
    writeBookmarks(bookmarks);
    return bookmarks[index];
  }
  return null;
});

ipcMain.handle(IPC.BOOKMARKS_CHECKDUPLICATE, async (_event, url: string) => {
  const bookmarks = readBookmarks();
  return bookmarks.find((b: any) => b.url === url) || null;
});

ipcMain.handle(IPC.BOOKMARKS_REMOVE, async (_event, id: string) => {
  const bookmarks = readBookmarks();
  const filtered = bookmarks.filter((b: any) => b.id !== id);
  writeBookmarks(filtered);
});

ipcMain.handle(IPC.BOOKMARKS_TOGGLEPIN, async (_event, id: string) => {
  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex((b: any) => b.id === id);
  if (index >= 0) {
    const isPinning = !bookmarks[index].pinned;
    if (isPinning) {
      const pinnedCount = bookmarks.filter((b: any) => b.pinned).length;
      if (pinnedCount >= 8) return { limitReached: true };
    }
    bookmarks[index].pinned = !bookmarks[index].pinned;
    writeBookmarks(bookmarks);
    return bookmarks[index];
  }
  return null;
});

ipcMain.handle(IPC.BOOKMARKS_TOGGLESIDEBAR, async (_event, id: string) => {
  const bookmarks = readBookmarks();
  const index = bookmarks.findIndex((b: any) => b.id === id);
  if (index >= 0) {
    const isAdding = !bookmarks[index].sidebar;
    if (isAdding) {
      const sidebarCount = bookmarks.filter((b: any) => b.sidebar).length;
      if (sidebarCount >= 5) return { limitReached: true };
    }
    bookmarks[index].sidebar = !bookmarks[index].sidebar;
    writeBookmarks(bookmarks);
    return bookmarks[index];
  }
  return null;
});

ipcMain.handle(IPC.BOOKMARKS_GETBYURL, async (_event, url: string) => {
  const bookmarks = readBookmarks();
  return bookmarks.find((b: any) => b.url === url) || null;
});

ipcMain.handle(IPC.BOOKMARKS_GETPAGETITLE, async (_event, aiId: string) => {
  for (const [wcId, id] of webviewMap.entries()) {
    if (id === aiId) {
      try {
        const wc = webContents.fromId(wcId);
        if (wc) {
          const script = `
            (() => {
              try {
                let bestTitle = '';
                const path = window.location.pathname;
                const chatId = path.split('/').filter(Boolean).pop();
                
                const genericUI = [
                  'answer', 'links', 'images', 'web', 'writing', 'academic', 
                  'youtube', 'reddit', 'all', 'chat', 'new chat', 'search', 
                  'focus', 'pro', 'home', 'discover', 'library', 
                  'spaces', 'help', 'settings', 'profile', 'history',
                  'videos', 'news', 'shopping', 'maps', 'books', 'flights', 'finance'
                ];

                const genericNames = [
                  'chatgpt', 'claude', 'gemini', 'perplexity', 'grok', 
                  'deepseek', 'kimi', 
                  'mistral', 'huggingchat', 'new chat',
                  'chat',
                ];

                const getCleanText = (el) => {
                  if (!el) return '';
                  const clone = el.cloneNode(true);
                  clone.querySelectorAll('.sr-only, .hidden, [aria-hidden="true"]').forEach(n => n.remove());
                  return clone.textContent.trim();
                };

                // 1. Try to find a link that matches the current URL path (common for chat sidebars)
                if (path && path !== '/' && path.length > 2) {
                  const links = Array.from(document.querySelectorAll('a[href]'));
                  const activeLink = links.find(a => {
                    const href = a.getAttribute('href');
                    const isMatch = href === path || href?.endsWith(path) || (chatId && href?.includes(chatId));
                    if (!isMatch) return false;
                    const text = getCleanText(a).toLowerCase();
                    if (!text || text.length < 2) return false;
                    if (genericUI.includes(text) || genericNames.includes(text)) return false;
                    return true;
                  });
                  if (activeLink && activeLink.textContent) {
                    bestTitle = getCleanText(activeLink);
                  }
                }
                
                // 2. Try common active attributes if link fails
                if (!bestTitle || bestTitle.length < 2) {
                  const activeSelectors = [
                    '[aria-current="page"]', 
                    '[aria-selected="true"]',
                    '[data-active]',
                    'a[data-active]',
                    '.chat-item-drag-active',
                    '[class*="chat-item-drag-active"]',
                    'div[class*="active"] > div > span',
                    'div[class*="selected"] > div > span',
                    'li[class*="active"]',
                    '[data-active="true"]'
                  ];
                  for (const sel of activeSelectors) {
                    const activeItems = Array.from(document.querySelectorAll(sel));
                    let found = false;
                    for (const activeItem of activeItems) {
                      if (activeItem && activeItem.textContent && activeItem.textContent.trim().length > 1) {
                        const text = getCleanText(activeItem);
                        if (text && !genericUI.includes(text.toLowerCase()) && !genericNames.includes(text.toLowerCase())) {
                          bestTitle = text;
                          found = true;
                          break;
                        }
                      }
                    }
                    if (found) break;
                  }
                }

                // 3. Fallback to document title
                if (!bestTitle || bestTitle.length > 100) {
                  bestTitle = document.title;
                }
                
                // Clean up the text: take only the first line (sidebar items often have nested buttons like "Share", "Delete" which append text)
                if (bestTitle) {
                  bestTitle = bestTitle.split('\\n')[0].trim();
                }

                // 4. Clean up common generic suffixes/names
                bestTitle = bestTitle.replace(/\\s*[-|]\\s*(ChatGPT|Meta AI|Claude|Gemini|Perplexity|Grok|Qwen|Qwen Studio|Venice).*$/i, '');
                
                if (genericNames.includes(bestTitle.toLowerCase()) || genericUI.includes(bestTitle.toLowerCase())) {
                  bestTitle = ''; // Force empty if it's completely generic
                }
                
                if (!bestTitle && genericNames.includes(document.title.toLowerCase())) {
                  return ''; // Return empty so the user can type it, rather than defaulting to "Qwen Studio"
                }
                return bestTitle || document.title; // Ultimate fallback
              } catch (e) {
                return document.title;
              }
            })();
          `;
          const title = await wc.executeJavaScript(script);
          return title || '';
        }
      } catch (err) { console.error('[Thred Main] Ignored error:', err); }
      break;
    }
  }
  return '';
});



// --- IPC Handlers (Stats) ---
ipcMain.handle(IPC.THRED_STATS_GET, async () => {
  return {
    totalSessions: 0,
    sessionsToday: 0,
    sessionsThisWeek: 0,
    streak: 0,
    switchesToday: 0,
    aiUsageDistribution: {},
    distribution: null
  };
});

// --- IPC Handlers (UserData) ---
ipcMain.handle(IPC.THRED_USERDATA_GET, async (_event, featureName: string) => {
  const base = store.get('thredFolderPath') as string;
  const dataPath = path.join(base, 'UserData', featureName, 'data.json');
  if (fs.existsSync(dataPath)) {
    try {
      const raw = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {

      return null;
    }
  }
  return null;
});

ipcMain.handle(IPC.THRED_USERDATA_SAVE, async (_event, payload: { featureName: string, data: any }) => {
  const base = store.get('thredFolderPath') as string;
  const userDir = path.join(base, 'UserData', payload.featureName);
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
  }
  const dataPath = path.join(userDir, 'data.json');
  fs.writeFileSync(dataPath, JSON.stringify(payload.data, null, 2), 'utf-8');
});

// --- IPC Handlers (Screenshots) ---
ipcMain.handle(IPC.THRED_SCREENSHOTS_SAVE, async (_event, payload: { type: 'content' | 'workspace', pngBuffer: Uint8Array, aiId: string }) => {
  const base = store.get('thredFolderPath') as string;

  const folderMap: Record<string, string> = {
    content: 'Screenshots/Content',
    workspace: 'Screenshots/Workspace',
  };

  const subFolder = folderMap[payload.type] || 'Screenshots/Content';
  const timestampStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `screenshot_${timestampStr}.png`;
  const relativePath = path.join(subFolder, filename);
  const absolutePath = path.join(base, relativePath);

  const dirPath = path.dirname(absolutePath);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  fs.writeFileSync(absolutePath, Buffer.from(payload.pngBuffer));

  const logsDir = path.join(base, '.system', 'Logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }
  const metaPath = path.join(logsDir, 'screenshots.json');

  let screenshots = [];
  if (fs.existsSync(metaPath)) {
    try {
      screenshots = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    } catch (_) { /* ignored */ }
  }

  const id = 'ss-' + Math.random().toString(36).substring(7);
  const metadata = {
    id,
    type: payload.type,
    path: absolutePath,
    filename,
    timestamp: Date.now(),
    aiId: payload.aiId || 'system'
  };

  screenshots.unshift(metadata);
  fs.writeFileSync(metaPath, JSON.stringify(screenshots, null, 2), 'utf-8');

  return metadata;
});

ipcMain.handle(IPC.THRED_SCREENSHOTS_GETALL, async () => {
  const base = store.get('thredFolderPath') as string;
  const metaPath = path.join(base, '.system', 'Logs', 'screenshots.json');
  if (!fs.existsSync(metaPath)) return [];
  try {
    const raw = fs.readFileSync(metaPath, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {

    return [];
  }
});

ipcMain.handle(IPC.THRED_SCREENSHOTS_DELETE, async (_event, id) => {
  const base = store.get('thredFolderPath') as string;
  const metaPath = path.join(base, '.system', 'Logs', 'screenshots.json');
  if (!fs.existsSync(metaPath)) return;

  try {
    const screenshots = JSON.parse(fs.readFileSync(metaPath, 'utf-8'));
    const targetIndex = screenshots.findIndex((s: any) => s.id === id);
    if (targetIndex !== -1) {
      const target = screenshots[targetIndex];
      if (target.path && fs.existsSync(target.path)) {
        try { fs.unlinkSync(target.path); } catch (_) { /* ignored */ }
      }
      screenshots.splice(targetIndex, 1);
      fs.writeFileSync(metaPath, JSON.stringify(screenshots, null, 2), 'utf-8');
    }
  } catch (_) { /* ignored */ }
});

ipcMain.handle(IPC.THRED_SCREENSHOTS_READ, async (_event, filePath: string) => {
  try {
    if (!filePath || typeof filePath !== 'string') return null;
    // Security: only read files inside the Thred storage folder.
    const root = path.resolve(getThredFolderPath());
    const resolved = path.resolve(filePath);
    const rel = path.relative(root, resolved);
    if (rel.startsWith('..') || path.isAbsolute(rel)) return null;
    if (!fs.existsSync(resolved)) return null;
    const ext = path.extname(resolved).toLowerCase();
    let mimeType = 'image/png';
    if (ext === '.jpg' || ext === '.jpeg') mimeType = 'image/jpeg';
    else if (ext === '.gif') mimeType = 'image/gif';
    else if (ext === '.webp') mimeType = 'image/webp';
    else if (ext === '.svg') mimeType = 'image/svg+xml';
    else if (ext === '.mp4') mimeType = 'video/mp4';
    else if (ext === '.webm') mimeType = 'video/webm';
    else if (ext === '.ogg') mimeType = 'video/ogg';

    const data = fs.readFileSync(resolved);
    return `data:${mimeType};base64,${data.toString('base64')}`;
  } catch (err) {

    return null;
  }
});

ipcMain.handle(IPC.THRED_REPORT_SUBMIT, async (_event, report: { aiModel?: string; category?: string; description?: string }) => {
  try {
    const aiModel = typeof report?.aiModel === 'string' ? report.aiModel.slice(0, 200) : '';
    const category = typeof report?.category === 'string' ? report.category.slice(0, 100) : '';
    const description = typeof report?.description === 'string' ? report.description.slice(0, 5000) : '';
    if (!aiModel || !category || !description) {
      return { ok: false, error: 'Missing required fields' };
    }
    const base = getThredFolderPath();
    const logsDir = path.join(base, '.system', 'Logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const logPath = path.join(logsDir, 'reports.json');
    let reports: any[] = [];
    if (fs.existsSync(logPath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
        if (Array.isArray(parsed)) reports = parsed;
      } catch { /* corrupt log: start fresh */ }
    }
    const entry = {
      id: 'report-' + crypto.randomBytes(6).toString('hex'),
      aiModel,
      category,
      description,
      appVersion: app.getVersion(),
      platform: process.platform,
      createdAt: new Date().toISOString(),
    };
    reports.unshift(entry);
    fs.writeFileSync(logPath, JSON.stringify(reports, null, 2), 'utf-8');
    return { ok: true, id: entry.id };
  } catch (err: any) {

    return { ok: false, error: err?.message || 'Failed to save report' };
  }
});

// Forward AI messages from injected webview scripts to the renderer
function handleAIMessage(payload: any, _wc: Electron.WebContents) {
  if (!mainWindow || mainWindow.isDestroyed()) return;

  switch (payload.type) {
    case 'THRED_COPY_CONTEXT':
    case 'THRED_LAST_CLICK_CONTEXT': {
      mainWindow.webContents.send(IPC.THRED_AI_MESSAGE, payload);
      break;
    }
    case 'THRED_SAVE_PROMPT': {
      const text = typeof payload.text === 'string' ? payload.text.slice(0, 100000) : '';
      if (!text) break;
      const id = 'prompt-' + Math.random().toString(36).substring(7);
      const item = {
        id,
        title: `Prompt ${new Date().toLocaleString()}`,
        content: text,
        fullText: text,
        aiId: payload.aiId || 'unknown',
        category: 'Prompts',
        createdAt: new Date().toISOString(),
      };
      const catDir = getVaultCategoryFolder('Prompts');
      if (!fs.existsSync(catDir)) fs.mkdirSync(catDir, { recursive: true });
      fs.writeFileSync(path.join(catDir, `${id}.json`), JSON.stringify(item, null, 2), 'utf-8');
      mainWindow.webContents.send(IPC.THRED_AI_MESSAGE, { type: 'SAVE_PROMPT_DONE', message: 'Prompt saved to Vault' });
      break;
    }
    case 'THRED_COPY': {
      const copiedText = typeof payload.text === 'string' ? payload.text.slice(0, 100000) : '';
      clipboard.writeText(copiedText);
      mainWindow.webContents.send(IPC.THRED_AI_MESSAGE, { type: 'COPY_DONE', message: 'Copied to clipboard' });
      break;
    }
    default: {
      break;
    }
  }
}




// --- Listen for AI messages from renderer (forwarded from injected scripts) ---
ipcMain.on(IPC.THRED_ON_AI_MESSAGE, (_event, _payload: any) => {
  // Renderer can send messages here if needed
});

// --- End of new IPC Handlers ---



ipcMain.handle(IPC.DOWNLOADS_GETALL, async () => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads.json');
  try {
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) { console.error('[Thred Main] Ignored error:', err); }
  return [];
});

ipcMain.handle(IPC.DOWNLOADS_OPENFILE, async (_, filePath: string) => {
  shell.showItemInFolder(filePath);
});

ipcMain.handle(IPC.SHELL_OPENEXTERNAL, async (_, url: string) => {
  try {
    if (typeof url !== 'string') return;
    const parsed = new URL(url);
    const allowed = ['https:', 'http:', 'mailto:'];
    if (!allowed.includes(parsed.protocol)) {

      return;
    }
    await shell.openExternal(url);
  } catch (_) { /* ignored */ }
});

ipcMain.handle(IPC.DOWNLOADS_DELETEENTRY, async (_, id: string, deleteFile?: boolean) => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads.json');
  try {
    if (fs.existsSync(logPath)) {
      const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
      const entry = data.find((d: DownloadLogEntry) => d.id === id);
      if (deleteFile && entry && entry.path && fs.existsSync(entry.path)) {
        try { fs.unlinkSync(entry.path); } catch (e) { console.error('[Thred] Failed to delete download file:', e); }
      }
      const updated = data.filter((d: DownloadLogEntry) => d.id !== id);
      fs.writeFileSync(logPath, JSON.stringify(updated, null, 2), 'utf-8');
      return true;
    }
  } catch (err) { console.error('[Thred Main] Ignored error:', err); }
  return false;
});

ipcMain.handle(IPC.DOWNLOADS_GETERRORS, async () => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads-errors.json');
  try {
    if (fs.existsSync(logPath)) {
      const data = fs.readFileSync(logPath, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) { console.error('[Thred Main] Ignored error:', err); }
  return [];
});

ipcMain.handle(IPC.DOWNLOADS_CLEARERRORS, async () => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads-errors.json');
  try {
    if (fs.existsSync(logPath)) fs.unlinkSync(logPath);
  } catch (err) { console.error('[Thred Main] Ignored error:', err); }
  return true;
});

// D13: Inline rename — rename file on disk + update log entry
ipcMain.handle(IPC.DOWNLOADS_RENAME, async (_, id: string, newFilename: string) => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads.json');
  try {
    if (!fs.existsSync(logPath)) return false;
    const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const entry = data.find((d: DownloadLogEntry) => d.id === id);
    if (!entry) return false;

    const oldPath = entry.path;
    const dir = path.dirname(oldPath);
    const ext = path.extname(entry.filename);
    const base = newFilename.endsWith(ext) ? newFilename : newFilename;
    const newPath = getUniqueFilePath(dir, base);

    // Rename file on disk
    if (fs.existsSync(oldPath)) {
      fs.renameSync(oldPath, newPath);
    }

    // Update log entry
    entry.filename = path.basename(newPath);
    entry.path = newPath;
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2), 'utf-8');
    return { filename: entry.filename, path: newPath };
  } catch (err) {

    return false;
  }
});

// D14: Move to subfolder — move file on disk + update log entry
ipcMain.handle(IPC.DOWNLOADS_MOVETOSUBFOLDER, async (_, id: string, targetSubfolder: string) => {
  const basePath = currentThredFolderPath || app.getPath('downloads');
  const logPath = path.join(basePath, '.system', 'Logs', 'downloads.json');
  try {
    if (!fs.existsSync(logPath)) return false;
    const data = JSON.parse(fs.readFileSync(logPath, 'utf-8'));
    const entry = data.find((d: DownloadLogEntry) => d.id === id);
    if (!entry) return false;

    const destDir = path.join(basePath, 'Downloads', targetSubfolder);
    fs.mkdirSync(destDir, { recursive: true });

    const destPath = getUniqueFilePath(destDir, entry.filename);

    if (fs.existsSync(entry.path)) {
      fs.renameSync(entry.path, destPath);
    }

    entry.subfolder = targetSubfolder;
    entry.path = destPath;
    fs.writeFileSync(logPath, JSON.stringify(data, null, 2), 'utf-8');
    return { filename: entry.filename, path: destPath, subfolder: targetSubfolder };
  } catch (err) {

    return false;
  }
});

// D15: Reveal file in OS file explorer
ipcMain.handle(IPC.DOWNLOADS_REVEALINOS, async (_: any, filePath: string) => {
  try {
    shell.showItemInFolder(filePath);
    return true;
  } catch (err) {

    return false;
  }
});

// D22: Cancel an active download
ipcMain.handle(IPC.DOWNLOADS_CANCEL, async (_: any, downloadId: string) => {
  const item = activeDownloadItems.get(downloadId);
  if (item) {
    item.cancel();
    activeDownloadItems.delete(downloadId);
    return true;
  }
  return false;
});

export function startMemoryProfiler() {
  const isDev = !app.isPackaged || process.env.NODE_ENV === 'development';
  if (!isDev) return;

  setInterval(async () => {
    try {
      const allWebContents = webContents.getAllWebContents();
      const rows: Array<{ aiId: string; url: string; rssMB: string }> = [];
      let totalRss = 0;

      for (const wc of allWebContents) {
        if (wc.isDestroyed()) continue;
        try {
          const mem = await (wc as any).getProcessMemoryInfo();
          const rss = mem.residentSet / 1024; // KB to MB
          totalRss += rss;
          const aiId = webviewMap.get(wc.id) || 'main';
          const rawUrl = wc.getURL() || '';
          const url = rawUrl.length > 40 ? rawUrl.substring(0, 40) + '...' : rawUrl;
          rows.push({
            aiId,
            url,
            rssMB: `${rss.toFixed(2)} MB`
          });
        } catch (err) { console.error('[Thred Main] Ignored error:', err); }
      }
      
      if (rows.length > 0) {
        // RAM profiler data collected
      }
    } catch (_) { /* ignored */ }
  }, 15000);
}


