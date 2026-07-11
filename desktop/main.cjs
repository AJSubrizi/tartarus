/**
 * Tartarus desktop shell (Electron)
 * Starts the local server, native window, optional auto-update.
 */
const { app, BrowserWindow, shell, dialog } = require("electron");
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
  const iconPath =
    process.platform === "darwin"
      ? path.join(ROOT, "build", "icon.icns")
      : process.platform === "win32"
        ? path.join(ROOT, "build", "icon.ico")
        : path.join(ROOT, "build", "icon.png");

  mainWindow = new BrowserWindow({
    width: 920,
    height: 980,
    minWidth: 640,
    minHeight: 720,
    title: "Tartarus",
    backgroundColor: "#050506",
    titleBarStyle: "hiddenInset",
    trafficLightPosition: { x: 16, y: 16 },
    icon: iconPath,
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

/**
 * Auto-update from GitHub Releases (electron-updater).
 * Requires latest*.yml on the release + packaged app (not `electron .` dev).
 * Works unsigned with user consent; signed builds preferred on macOS/Windows.
 */
function setupAutoUpdater() {
  if (!app.isPackaged) {
    console.log("[tartarus] auto-update skipped (dev / unpackaged)");
    return;
  }
  if (process.env.TARTARUS_DISABLE_UPDATE === "1") {
    return;
  }

  let autoUpdater;
  try {
    ({ autoUpdater } = require("electron-updater"));
  } catch (e) {
    console.warn("[tartarus] electron-updater not available", e);
    return;
  }

  autoUpdater.autoDownload = false;
  autoUpdater.autoInstallOnAppQuit = true;
  // Allow checking even when unsigned (user still confirms install)
  autoUpdater.forceDevUpdateConfig = false;

  autoUpdater.on("error", (err) => {
    console.warn("[tartarus] update error", err?.message || err);
  });

  autoUpdater.on("update-available", async (info) => {
    console.log("[tartarus] update available", info?.version);
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Download", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Tartarus update",
      message: `Version ${info.version} is available`,
      detail: "Download and install on quit? Builds may be unsigned — Gatekeeper/SmartScreen can warn.",
    });
    if (response === 0) {
      try {
        await autoUpdater.downloadUpdate();
      } catch (e) {
        console.warn("[tartarus] download failed", e);
      }
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: `Tartarus ${info.version} downloaded`,
      detail: "Restart to install.",
    });
    if (response === 0) {
      autoUpdater.quitAndInstall(false, true);
    }
  });

  // Delay so UI is ready
  setTimeout(() => {
    autoUpdater.checkForUpdates().catch((e) => {
      console.warn("[tartarus] checkForUpdates", e?.message || e);
    });
  }, 4000);
}

app.whenReady().then(async () => {
  try {
    await startServer();
    createWindow();
    setupAutoUpdater();
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
