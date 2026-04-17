import type { PartnerOrder, PartnerStore } from '@/types'

// Detecta se está rodando dentro do Electron
export const isElectron = typeof window !== 'undefined' && !!(window as Window & { electronAPI?: unknown }).electronAPI

type ElectronAPI = {
  getPrinters: () => Promise<Array<{ name: string; displayName: string; isDefault: boolean }>>
  savePrinter: (name: string) => Promise<boolean>
  getSavedPrinter: () => Promise<string>
  saveAutoPrint: (enabled: boolean) => Promise<boolean>
  getAutoPrint: () => Promise<boolean>
  printOrder: (html: string, printerName: string) => Promise<{ success: boolean; error?: string }>
}

function getElectronAPI(): ElectronAPI | null {
  if (!isElectron) return null
  return (window as unknown as { electronAPI: ElectronAPI }).electronAPI
}

/** Gera o HTML do cupom 80mm */
export function buildReceiptHtml(order: PartnerOrder, store: PartnerStore): string {
  const date = new Date(order.createdAt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })

  const itemsHtml = (order.items ?? []).map((item) => `
    <tr>
      <td style="padding:2px 0">${item.quantity}x ${item.name}</td>
      <td style="text-align:right;padding:2px 0">R$ ${item.totalPrice.toFixed(2).replace('.', ',')}</td>
    </tr>
  `).join('')

  const totalHtml = `
    <tr><td colspan="2"><hr style="border:none;border-top:1px dashed #000;margin:4px 0"/></td></tr>
    <tr>
      <td><strong>TOTAL</strong></td>
      <td style="text-align:right"><strong>R$ ${order.total.toFixed(2).replace('.', ',')}</strong></td>
    </tr>
  `

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    width: 72mm;
    padding: 4mm;
    color: #000;
  }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .divider { border: none; border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { vertical-align: top; }
  .header { font-size: 14px; font-weight: bold; text-align: center; margin-bottom: 4px; }
  .sub { font-size: 11px; text-align: center; color: #333; margin-bottom: 6px; }
  .section-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin: 6px 0 2px; }
</style>
</head>
<body>
  <div class="header">${store.name}</div>
  <div class="sub">${date}</div>
  <hr class="divider"/>

  <div class="section-title">Pedido</div>
  <table>
    <tr>
      <td class="bold">Codigo</td>
      <td style="text-align:right" class="bold">${order.code}</td>
    </tr>
    <tr>
      <td>Cliente</td>
      <td style="text-align:right">${order.customerName}</td>
    </tr>
    <tr>
      <td>Tipo</td>
      <td style="text-align:right">${order.fulfillmentType === 'delivery' ? 'Entrega' : 'Retirada'}</td>
    </tr>
    <tr>
      <td>Pagamento</td>
      <td style="text-align:right">${order.paymentMethod}</td>
    </tr>
  </table>

  <hr class="divider"/>
  <div class="section-title">Itens</div>
  <table>
    ${itemsHtml}
    ${totalHtml}
  </table>

  <hr class="divider"/>
  <div class="center" style="font-size:10px;margin-top:4px">OhDelivery</div>
</body>
</html>`
}

/** Imprime um pedido via Electron */
export async function printOrder(
  order: PartnerOrder,
  store: PartnerStore,
  printerName: string
): Promise<{ success: boolean; error?: string }> {
  const api = getElectronAPI()
  if (!api) return { success: false, error: 'Nao esta rodando no Electron.' }

  const html = buildReceiptHtml(order, store)
  return api.printOrder(html, printerName)
}

export async function getPrinters() {
  const api = getElectronAPI()
  if (!api) return []
  return api.getPrinters()
}

export async function getSavedPrinter(): Promise<string> {
  const api = getElectronAPI()
  if (!api) return ''
  return api.getSavedPrinter()
}

export async function savePrinter(name: string): Promise<void> {
  const api = getElectronAPI()
  if (!api) return
  await api.savePrinter(name)
}

export async function getAutoPrint(): Promise<boolean> {
  const api = getElectronAPI()
  if (!api) return false
  return api.getAutoPrint()
}

export async function saveAutoPrint(enabled: boolean): Promise<void> {
  const api = getElectronAPI()
  if (!api) return
  await api.saveAutoPrint(enabled)
}
