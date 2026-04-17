import { app, BrowserWindow, ipcMain, Menu, PrinterInfo } from 'electron'
import * as path from 'path'
import Store from 'electron-store'

const store = new Store()
const isDev = process.env.NODE_ENV === 'development'

let mainWindow: BrowserWindow | null = null

function createWindow() {
  // Remove a barra de menu nativa (File, Edit, View, Help)
  Menu.setApplicationMenu(null)

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    autoHideMenuBar: true,
    menuBarVisible: false,
    title: 'OhDelivery Parceiros',
    icon: path.join(__dirname, '../public/favico.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// ── IPC: Listar impressoras disponíveis ──────────────────────────────────────
ipcMain.handle('get-printers', async (): Promise<PrinterInfo[]> => {
  if (!mainWindow) return []
  return mainWindow.webContents.getPrintersAsync()
})

// ── IPC: Salvar impressora selecionada ───────────────────────────────────────
ipcMain.handle('save-printer', (_event, printerName: string) => {
  store.set('selectedPrinter', printerName)
  return true
})

ipcMain.handle('get-saved-printer', () => {
  return store.get('selectedPrinter', '') as string
})

// ── IPC: Salvar configuração de impressão automática ─────────────────────────
ipcMain.handle('save-auto-print', (_event, enabled: boolean) => {
  store.set('autoPrint', enabled)
  return true
})

ipcMain.handle('get-auto-print', () => {
  return store.get('autoPrint', false) as boolean
})

// ── IPC: Imprimir cupom ──────────────────────────────────────────────────────
ipcMain.handle('print-order', async (_event, html: string, printerName: string) => {
  return new Promise<{ success: boolean; error?: string }>((resolve) => {
    const printWindow = new BrowserWindow({
      show: false,
      webPreferences: { contextIsolation: true },
    })

    printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

    printWindow.webContents.once('did-finish-load', () => {
      printWindow.webContents.print(
        {
          silent: true,
          printBackground: true,
          deviceName: printerName,
          margins: { marginType: 'none' },
          pageSize: { width: 80000, height: 297000 }, // 80mm largura
        },
        (success, errorType) => {
          printWindow.close()
          if (success) {
            resolve({ success: true })
          } else {
            resolve({ success: false, error: errorType })
          }
        }
      )
    })
  })
})
