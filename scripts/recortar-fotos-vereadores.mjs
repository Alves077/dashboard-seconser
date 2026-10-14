// Recorta as fotos dos vereadores no rosto, todas na mesma escala, e grava WebP 256×256 em
// public/img/vereadores/<id>.webp. Os parâmetros de cada foto ficam em docs/fotos-vereadores.json:
//   topo / queixo / cx  — alto da cabeça, queixo e centro do rosto, em fração da altura/largura da foto
//   cabeca              — quanto do quadrado a cabeça ocupa (0,58 em todas)
//   folga               — espaço acima da cabeça, em fração do quadrado
//   borda               — moldura branca a descontar (fração da largura), quando a foto tem
// Uso (o recorte é feito num Chrome sem janela, pelo protocolo de depuração):
//   chrome --headless=new --remote-debugging-port=9333 --user-data-dir=<pasta temporária>
//   node scripts/recortar-fotos-vereadores.mjs <pasta com as originais: <id>.png|.jpg> [porta]
// As originais vêm do site da Câmara (vereadores.foto_url no banco) e não entram no repositório.
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

const [pasta, porta = '9333'] = process.argv.slice(2)
if (!pasta) {
  console.error('uso: node scripts/recortar-fotos-vereadores.mjs <pasta-das-originais> [porta]')
  process.exit(1)
}
const raiz = path.resolve(import.meta.dirname, '..')
const P = JSON.parse(readFileSync(path.join(raiz, 'docs/fotos-vereadores.json'), 'utf8'))
const fotos = {}
for (const id of Object.keys(P)) {
  const arq = ['png', 'jpg', 'jpeg', 'webp'].map((e) => path.join(pasta, `${id}.${e}`)).find(existsSync)
  if (!arq) {
    console.warn(`sem original para ${id} — pulando`)
    continue
  }
  fotos[id] = 'data:image;base64,' + readFileSync(arq).toString('base64')
}

const alvo = await (await fetch(`http://127.0.0.1:${porta}/json/new?about:blank`, { method: 'PUT' })).json()
const ws = new WebSocket(alvo.webSocketDebuggerUrl)
let n = 0
const pend = new Map()
const env = (method, params = {}) =>
  new Promise((ok) => {
    pend.set(++n, ok)
    ws.send(JSON.stringify({ id: n, method, params }))
  })
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pend.has(m.id)) pend.get(m.id)(m)
}
await new Promise((ok) => (ws.onopen = ok))

const codigo = `(async () => {
  const P = ${JSON.stringify(P)}, F = ${JSON.stringify(fotos)}, out = {}
  for (const k of Object.keys(F)) {
    const im = new Image(); im.src = F[k]; await im.decode()
    const W = im.naturalWidth, H = im.naturalHeight, p = P[k]
    const b = (p.borda ?? 0) * W
    let lado = ((p.queixo - p.topo) * H) / (p.cabeca ?? 0.58)
    lado = Math.min(lado, W - 2 * b, H - 2 * b)
    let x = p.cx * W - lado / 2, y = p.topo * H - lado * (p.folga ?? 0.17)
    x = Math.max(b, Math.min(x, W - b - lado)); y = Math.max(b, Math.min(y, H - b - lado))
    const c = document.createElement('canvas'); c.width = c.height = 256
    const g = c.getContext('2d'); g.imageSmoothingQuality = 'high'
    g.drawImage(im, x, y, lado, lado, 0, 0, 256, 256)
    out[k] = c.toDataURL('image/webp', 0.95)
  }
  return out })()`
const r = await env('Runtime.evaluate', { expression: codigo, awaitPromise: true, returnByValue: true })
await fetch(`http://127.0.0.1:${porta}/json/close/${alvo.id}`)
if (r.result.exceptionDetails) {
  console.error(JSON.stringify(r.result.exceptionDetails).slice(0, 500))
  process.exit(1)
}
for (const [id, d] of Object.entries(r.result.result.value)) {
  writeFileSync(path.join(raiz, `public/img/vereadores/${id}.webp`), Buffer.from(d.split(',')[1], 'base64'))
}
console.log(`ok: ${Object.keys(r.result.result.value).length} fotos`)
process.exit(0)
