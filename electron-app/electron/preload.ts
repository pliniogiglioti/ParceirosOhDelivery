import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  savePrinter: (name: string) => ipcRenderer.invoke('save-printer', name),
  getSavedPrinter: () => ipcRenderer.invoke('get-saved-printer'),
  saveAutoPrint: (enabled: boolean) => ipcRenderer.invoke('save-auto-print', enabled),
  getAutoPrint: () => ipcRenderer.invoke('get-auto-print'),
  printOrder: (html: string, printerName: string) =>
    ipcRenderer.invoke('print-order', html, printerName),
  isElectron: true,
})
