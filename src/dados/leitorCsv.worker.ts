// Lê o CSV fora da linha principal (Web Worker): o retrato local tem ~5,5 MB e, lido na página,
// travava a tela por um instante. Só é usado no desenvolvimento (fonte "csv").
import Papa from 'papaparse'

self.onmessage = (e: MessageEvent<string>) => {
  const { data } = Papa.parse<Record<string, string>>(e.data, { header: true, skipEmptyLines: true })
  ;(self as unknown as Worker).postMessage(data)
}
