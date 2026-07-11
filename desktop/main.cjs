/**
 * Tartarus desktop shell (Electron)
 * Starts the local server and opens a native window.
 */
const { app, BrowserWindow, shell } = require("electron");
const path = require("path");
const { pathToFileURL } = require("url");

const PORT = Number(process.env.PORT || 7340);
const ROOT = path.join(__dirname, "..");

/** @type {import('electron').BrowserWindow | null} */
let mainWindow = null;
let serverStarted = false;

async function startServer() {
  if (serverStarted) return;
  process.env.TARTARUS_NO_OPEN = "1";
  const serveUrl = pathToFileURL(path.join(ROOT, "dist", "serve.js")).href;
  const { startHttpServer } = await import(serveUrl);
  await startHttpServer(PORT, { open: false });
  serverStarted = true;
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 880,
    height: 920,
    minWidth: 640,
    minHeight: 720,
    title: "Tartarus",
    backgroundColor: "#050506",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${PORT}/`);

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
  } catch (err) {
    console.error("[tartarus desktop]", err);
    app.quit();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
