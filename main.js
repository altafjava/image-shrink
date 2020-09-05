const path = require('path');
const os = require('os');
const { app, BrowserWindow, Menu, ipcMain, shell } = require('electron');
const imagemin = require('imagemin');
const imageminPngquant = require('imagemin-pngquant');
const imageminMozjpeg = require('imagemin-mozjpeg');
const slash = require('slash');
const log = require('electron-log');

// Set env
process.env.NODE_ENV = 'production';
const isDev = process.env.NODE_ENV !== 'production' ? true : false;
const isMac = process.platform === 'darwin' ? true : false;

let mainWindow;
let aboutWindow;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    title: 'ImageShrink',
    width: isDev ? 800 : 500,
    height: 600,
    icon: './assets/icons/Icon_256x256.png',
    resizable: isDev ? true : false,
    backgroundColor: '#00000',
    webPreferences: {
      nodeIntegration: true,
    },
  });
  // To remove the warning[(electron) Security Warning: webFrame.executeJavaScript was called without worldSafeExecuteJavaScript enabled.] from console
  process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  // we can use either of these line to load the file
  // mainWindow.loadFile('./app/index.html');
  mainWindow.loadURL(`file://${__dirname}/app/index.html`);
}

function createAboutWindow() {
  // Menu.setApplicationMenu(null);
  aboutWindow = new BrowserWindow({
    title: 'About ImageShrink',
    width: 300,
    height: 300,
    icon: './assets/icons/Icon_256x256.png',
    resizable: false,
    backgroundColor: '#00000',
  });
  aboutWindow.loadFile('./app/about.html');
}

app.on('ready', () => {
  createMainWindow();
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);
  mainWindow.on('ready', () => (mainWindow = null));
});
const mainMenuTemplate = [
  ...(isMac
    ? [
        {
          label: app.name,
          submenu: [{ label: 'About', click: createAboutWindow }],
        },
      ]
    : []),
  {
    role: 'fileMenu',
  },
  ...(!isMac
    ? [
        {
          label: 'Help',
          submenu: [{ label: 'About', click: createAboutWindow }],
        },
      ]
    : []),
  ...(isDev
    ? [
        {
          label: 'Developer',
          submenu: [{ role: 'reload' }, { role: 'forcereload' }, { type: 'separator' }, { role: 'toggleDevTools' }],
        },
      ]
    : []),
];

ipcMain.on('image:minimize', (e, options) => {
  options.dest = path.join(os.homedir(), 'imageshrink');
  shrinkImage(options);
});

async function shrinkImage({ imgPath, quality, dest }) {
  try {
    const pngQuality = quality / 100;
    const files = await imagemin([slash(imgPath)], {
      destination: dest,
      plugins: [
        imageminMozjpeg({ quality }),
        imageminPngquant({
          quality: [pngQuality, pngQuality],
        }),
      ],
    });
    log.info(files);
    shell.openPath(dest);
    mainWindow.webContents.send('image:done');
  } catch (error) {
    log.error(error);
  }
}
app.on('window-all-closed', () => {
  if (!isMac) {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
