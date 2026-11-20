const { app, BrowserWindow, shell, protocol, net } = require('electron');
const path = require('node:path');
const fs = require('node:fs/promises');
const { pathToFileURL } = require('node:url');

const APP_SCHEME = 'procura';
protocol.registerSchemesAsPrivileged([{
  scheme: APP_SCHEME,
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

const isDev = !app.isPackaged;
const distDirectory = path.resolve(__dirname, '..', 'dist');
let mainWindow;

async function registerAppProtocol() {
  protocol.handle(`${APP_SCHEME}://app`, async (request) => {
    const requestUrl = new URL(request.url);
    let relativePath;
    try {
      relativePath = decodeURIComponent(requestUrl.pathname).replace(/^\/+/, '');
    } catch {
      return new Response('Bad request', { status: 400 });
    }
    let target = path.resolve(distDirectory, relativePath || 'index.html');
    const safeRoot = distDirectory + path.sep;
    if (target !== distDirectory && !target.startsWith(safeRoot)) {
      return new Response('Forbidden', { status: 403 });
    }
    try {
      const info = await fs.stat(target);
      if (info.isDirectory()) target = path.join(target, 'index.html');
      await fs.access(target);
    } catch {
      if (path.extname(relativePath)) return new Response('Not found', { status: 404 });
      target = path.join(distDirectory, 'index.html');
    }
    return net.fetch(pathToFileURL(target).toString());
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440, height: 920, minWidth: 1024, minHeight: 700,
    show: false, title: 'Procura', backgroundColor: '#07130E', autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true
    }
  });
  mainWindow.once('ready-to-show', () => mainWindow.show());
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (event, url) => {
    const allowed = isDev ? url.startsWith('http://localhost:3000') : url.startsWith(`${APP_SCHEME}://app/`);
    if (!allowed) {
      event.preventDefault();
      if (/^https?:\/\//i.test(url)) shell.openExternal(url);
    }
  });
  if (isDev) mainWindow.loadURL('http://localhost:3000');
  else mainWindow.loadURL(`${APP_SCHEME}://app/`);
  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(async () => {
  app.setName('Procura');
  app.setAppUserModelId('ng.procura.desktop');
  if (!isDev) await registerAppProtocol();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
