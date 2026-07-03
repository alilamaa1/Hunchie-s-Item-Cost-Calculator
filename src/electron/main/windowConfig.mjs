export function createMainWindowConfig(options = {}) {
  return {
    width: options.width ?? 1280,
    height: options.height ?? 820,
    minWidth: 980,
    minHeight: 680,
    webPreferences: {
      preload: options.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  };
}

