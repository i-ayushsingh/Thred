import { IPC } from './shared/ipc-channels';
import { contextBridge, ipcRenderer, webFrame } from 'electron';
import { ThredConfig } from './electron';

// Run immediately in the page's main context to suppress passkeys / WebAuthn popups.
// This prevents the "Windows Security - Sign in with a passkey" dialog from blocking Google Sign-In.
const suppressWebAuthnScript = `
  (function() {
    try {
      if (typeof window !== 'undefined') {
        // Suppress PublicKeyCredential API so sites know passkeys are not supported
        Object.defineProperty(window, 'PublicKeyCredential', {
          value: undefined,
          writable: true,
          configurable: true
        });
        
        // Suppress navigator.credentials WebAuthn calls
        if (navigator.credentials) {
          const originalGet = navigator.credentials.get;
          navigator.credentials.get = function(options) {
            if (options && options.publicKey) {
              return Promise.reject(new DOMException("NotAllowedError", "WebAuthn is disabled in this environment."));
            }
            return originalGet.call(navigator.credentials, options);
          };
          
          const originalCreate = navigator.credentials.create;
          navigator.credentials.create = function(options) {
            if (options && options.publicKey) {
              return Promise.reject(new DOMException("NotAllowedError", "WebAuthn is disabled in this environment."));
            }
            return originalCreate.call(navigator.credentials, options);
          };
        }
      }
    } catch (_) { /* ignored */ }
  })();
`;
try {
  webFrame.executeJavaScript(suppressWebAuthnScript);
} catch (_) { /* ignored */ }


// Only expose Electron APIs to the main app window (trusted host/protocol)
// to prevent third-party AI guest webviews from accessing sensitive IPC APIs.
const isMainWindow = window.location.protocol === 'file:' || 
                     window.location.hostname === 'localhost' || 
                     window.location.hostname === '127.0.0.1';

if (isMainWindow) {
  contextBridge.exposeInMainWorld('electron', {
    preloadPath: ipcRenderer.sendSync('get-preload-path'),
    readClipboardText: () => ipcRenderer.invoke(IPC.READ_CLIPBOARD_TEXT),
    windowMinimize: () => ipcRenderer.send(IPC.WINDOW_MINIMIZE),
    windowMaximize: () => ipcRenderer.send(IPC.WINDOW_MAXIMIZE),
    windowClose: () => ipcRenderer.send(IPC.WINDOW_CLOSE),
    appQuit: () => ipcRenderer.send(IPC.APP_QUIT),
    appRestart: () => ipcRenderer.send(IPC.APP_RESTART),
    getWindowIsMaximized: () => ipcRenderer.invoke(IPC.GET_WINDOW_IS_MAXIMIZED),
    saveFile: (data: Uint8Array | ArrayBuffer | any, defaultPath: string) => ipcRenderer.invoke(IPC.SAVE_FILE, data, defaultPath),
    captureContent: (aiId: string) => ipcRenderer.invoke(IPC.SCREENSHOT_CAPTURE_CONTENT, { aiId }) as Promise<{ base64: string; width: number; height: number } | null>,
    captureWorkspace: () => ipcRenderer.invoke(IPC.SCREENSHOT_CAPTURE_WORKSPACE) as Promise<{ base64: string; width: number; height: number } | null>,
    copyImageToClipboard: (base64: string) => ipcRenderer.invoke(IPC.SCREENSHOT_COPY_TO_CLIPBOARD, { base64 }) as Promise<boolean>,
    copyFileToClipboard: (filePath: string) => ipcRenderer.invoke('clipboard:write-file', filePath) as Promise<boolean>,
    registerWebview: (data: { aiId: string; webContentsId: number }) => ipcRenderer.send(IPC.REGISTER_WEBVIEW, data),
    setZoom: (data: { aiId: string; factor: number }) => ipcRenderer.send(IPC.SET_ZOOM, data),
    onZoomApplied: (callback: (data: { aiId: string; factor: number; action: 'in' | 'out' | 'reset' }) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.ZOOM_APPLIED, handler);
      return () => { ipcRenderer.removeListener(IPC.ZOOM_APPLIED, handler); };
    },
    getConfig: () => ipcRenderer.invoke(IPC.THRED_GETCONFIG),
    setConfig: (config: ThredConfig) => ipcRenderer.invoke(IPC.THRED_SETCONFIG, config),
    updateConfig: (patch: Partial<ThredConfig>) => ipcRenderer.invoke(IPC.THRED_UPDATECONFIG, patch),
    getThredFolderPath: () => ipcRenderer.invoke(IPC.SETTINGS_GETTHREDFOLDERPATH),
    changeThredFolderPath: () => ipcRenderer.invoke(IPC.SETTINGS_CHANGETHREDFOLDERPATH),
    vaultGetAll: () => ipcRenderer.invoke(IPC.THRED_VAULT_GETALL),
    vaultSave: (item: any) => ipcRenderer.invoke(IPC.THRED_VAULT_SAVE, item),
    vaultDelete: (id: string, category: string) => ipcRenderer.invoke(IPC.THRED_VAULT_DELETE, { id, category }),
    vaultExportAll: () => ipcRenderer.invoke(IPC.THRED_VAULT_EXPORTALL),
    vaultImportAll: (jsonStr: string, mode: 'merge' | 'replace') => ipcRenderer.invoke(IPC.THRED_VAULT_IMPORTALL, jsonStr, mode),
    toolsGet: (toolName: string) => ipcRenderer.invoke(IPC.THRED_TOOLS_GET, toolName),
    toolsSave: (payload: { toolName: string, data: any }) => ipcRenderer.invoke(IPC.THRED_TOOLS_SAVE, payload),
    statsGet: () => ipcRenderer.invoke(IPC.THRED_STATS_GET),
    userdataGet: (featureName: string) => ipcRenderer.invoke(IPC.THRED_USERDATA_GET, featureName),
    userdataSave: (featureName: string, data: any) => ipcRenderer.invoke(IPC.THRED_USERDATA_SAVE, { featureName, data }),
    saveScreenshot: (payload: { type: 'content' | 'workspace', pngBuffer: Uint8Array, aiId: string }) => ipcRenderer.invoke(IPC.THRED_SCREENSHOTS_SAVE, payload),
    getScreenshots: () => ipcRenderer.invoke(IPC.THRED_SCREENSHOTS_GETALL),
    deleteScreenshot: (id: string) => ipcRenderer.invoke(IPC.THRED_SCREENSHOTS_DELETE, id),
    readScreenshot: (filePath: string) => ipcRenderer.invoke(IPC.THRED_SCREENSHOTS_READ, filePath),
    submitReport: (report: { aiModel: string; category: string; description: string }) => ipcRenderer.invoke(IPC.THRED_REPORT_SUBMIT, report),
    bookmarksGetAll: () => ipcRenderer.invoke(IPC.BOOKMARKS_GETALL),
    bookmarksAdd: (bookmark: any) => ipcRenderer.invoke(IPC.BOOKMARKS_ADD, bookmark),
    bookmarksRemove: (id: string) => ipcRenderer.invoke(IPC.BOOKMARKS_REMOVE, id),
    bookmarksTogglePin: (id: string) => ipcRenderer.invoke(IPC.BOOKMARKS_TOGGLEPIN, id),
    bookmarksToggleSidebar: (id: string) => ipcRenderer.invoke(IPC.BOOKMARKS_TOGGLESIDEBAR, id),
    bookmarksGetByUrl: (url: string) => ipcRenderer.invoke(IPC.BOOKMARKS_GETBYURL, url),
    bookmarksGetPageTitle: (aiId: string) => ipcRenderer.invoke(IPC.BOOKMARKS_GETPAGETITLE, aiId),
    bookmarksUpdate: (id: string, updates: { name?: string; category?: string; favicon?: string }) => ipcRenderer.invoke(IPC.BOOKMARKS_UPDATE, id, updates),
    bookmarksCheckDuplicate: (url: string) => ipcRenderer.invoke(IPC.BOOKMARKS_CHECKDUPLICATE, url),
    onAIMessage: (callback: (payload: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.THRED_AI_MESSAGE, handler);
      return () => { ipcRenderer.removeListener(IPC.THRED_AI_MESSAGE, handler); };
    },
    downloadsGetAll: () => ipcRenderer.invoke(IPC.DOWNLOADS_GETALL),
    downloadsOpenFile: (path: string) => ipcRenderer.invoke(IPC.DOWNLOADS_OPENFILE, path),
    openExternalUrl: (url: string) => ipcRenderer.invoke(IPC.SHELL_OPENEXTERNAL, url),
    downloadsDeleteEntry: (id: string, deleteFile?: boolean) => ipcRenderer.invoke(IPC.DOWNLOADS_DELETEENTRY, id, deleteFile),
    downloadsGetErrors: () => ipcRenderer.invoke(IPC.DOWNLOADS_GETERRORS),
    downloadsClearErrors: () => ipcRenderer.invoke(IPC.DOWNLOADS_CLEARERRORS),
    downloadsRename: (id: string, newFilename: string) => ipcRenderer.invoke(IPC.DOWNLOADS_RENAME, id, newFilename),
    downloadsMoveToSubfolder: (id: string, targetSubfolder: string) => ipcRenderer.invoke(IPC.DOWNLOADS_MOVETOSUBFOLDER, id, targetSubfolder),
    downloadsRevealInOS: (filePath: string) => ipcRenderer.invoke(IPC.DOWNLOADS_REVEALINOS, filePath),
    downloadsCancel: (downloadId: string) => ipcRenderer.invoke(IPC.DOWNLOADS_CANCEL, downloadId),
    onDownloadStarted: (callback: (payload: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.DOWNLOAD_STARTED, handler);
      return () => { ipcRenderer.removeListener(IPC.DOWNLOAD_STARTED, handler); };
    },
    onDownloadProgress: (callback: (payload: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.DOWNLOAD_PROGRESS, handler);
      return () => { ipcRenderer.removeListener(IPC.DOWNLOAD_PROGRESS, handler); };
    },
    onDownloadComplete: (callback: (payload: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.DOWNLOAD_COMPLETE, handler);
      return () => { ipcRenderer.removeListener(IPC.DOWNLOAD_COMPLETE, handler); };
    },
    onDownloadFailed: (callback: (payload: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.DOWNLOAD_FAILED, handler);
      return () => { ipcRenderer.removeListener(IPC.DOWNLOAD_FAILED, handler); };
    },
    onWebviewKeydown: (callback: (event: any) => void) => {
      const handler = (_event: any, data: any) => callback(data);
      ipcRenderer.on(IPC.WEBVIEW_KEYDOWN, handler);
      return () => { ipcRenderer.removeListener(IPC.WEBVIEW_KEYDOWN, handler); };
    },
  });
} else {
  // We are inside the guest webview
  const injectBlobInterceptor = `
    (function() {
      try {
        if (typeof window === 'undefined') return;

        const blobCache = new Map();

        const originalCreate = URL.createObjectURL;
        URL.createObjectURL = function(obj) {
          const url = originalCreate.call(URL, obj);
          if (obj instanceof Blob) {
            blobCache.set(url, obj);
          }
          return url;
        };

        const originalRevoke = URL.revokeObjectURL;
        URL.revokeObjectURL = function(url) {
          setTimeout(() => {
            try {
              originalRevoke.call(URL, url);
            } catch (_) { /* ignored */ }
            blobCache.delete(url);
          }, 15000);
        };

        const handleAnchor = async (anchor) => {
          const href = anchor.href;
          if (href && (href.startsWith('blob:') || href.startsWith('data:'))) {
            try {
              const filename = anchor.download || 'download';
              let blob;
              
              if (href.startsWith('blob:')) {
                const cached = blobCache.get(href);
                if (cached) {
                  blob = cached;
                } else {
                  const response = await fetch(href);
                  blob = await response.blob();
                }
              } else {
                const parts = href.split(',');
                const meta = parts[0];
                const base64Data = parts[1];
                const mime = meta.split(';')[0].replace('data:', '');
                const binary = atob(base64Data);
                const len = binary.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                  bytes[i] = binary.charCodeAt(i);
                }
                blob = new Blob([bytes], { type: mime });
              }

              const reader = new FileReader();
              reader.onload = () => {
                const arrayBuffer = reader.result;
                const uint8 = new Uint8Array(arrayBuffer);
                
                const event = new CustomEvent('thred-download-blob', {
                  detail: {
                    uint8Array: Array.from(uint8),
                    filename: filename,
                    mimeType: blob.type
                  }
                });
                window.dispatchEvent(event);
              };
              reader.readAsArrayBuffer(blob);
            } catch (_) { /* ignored */ }
            return true;
          }
          return false;
        };

        // 1. Intercept physical clicks that bubble up
        document.addEventListener('click', async (e) => {
          let target = e.target;
          while (target && target !== document.body) {
            if (target.tagName === 'A') {
              const handled = await handleAnchor(target);
              if (handled) {
                e.preventDefault();
                e.stopPropagation();
                return;
              }
            }
            target = target.parentElement;
          }
        }, true);

        // 2. Intercept programmatic .click() calls on HTMLAnchorElement prototype
        const originalClick = HTMLAnchorElement.prototype.click;
        HTMLAnchorElement.prototype.click = function() {
          const href = this.href;
          if (href && (href.startsWith('blob:') || href.startsWith('data:'))) {
            handleAnchor(this);
            return;
          }
          return originalClick.apply(this, arguments);
        };
      } catch (_) { /* ignored */ }
    })();
  `;

  try {
    webFrame.executeJavaScript(injectBlobInterceptor);
  } catch (_) { /* ignored */ }

  // Listen for the custom event sent from the main context
  window.addEventListener('thred-download-blob', (e: any) => {
    if (e.detail) {
      ipcRenderer.send('download:blob', e.detail);
    }
  });
}
