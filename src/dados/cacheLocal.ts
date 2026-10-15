// Guarda a última cópia da parte PÚBLICA no navegador (IndexedDB), para o site abrir na hora nas próximas visitas.
// Os dados só mudam uma vez por dia (sincronização do trabalho): ao abrir, um pedido pequeno pergunta qual é a
// última carga; se for a mesma da cópia guardada, usa a cópia — senão baixa tudo de novo e guarda.
// Nunca guarda o restrito (descrição, endereço, fotos): esse fica só na memória da aba (ver docs/SEGURANCA.md).
// Qualquer falha (navegação privada, armazenamento cheio, bloqueado) = segue sem cache, como antes.

const BANCO = 'dip-iluminacao'
const LOJA = 'cache'

function abrir(): Promise<IDBDatabase> {
  return new Promise((ok, falha) => {
    const pedido = indexedDB.open(BANCO, 1)
    pedido.onupgradeneeded = () => pedido.result.createObjectStore(LOJA)
    pedido.onsuccess = () => ok(pedido.result)
    pedido.onerror = () => falha(pedido.error)
  })
}

export async function lerCache<T>(chave: string): Promise<T | null> {
  try {
    const db = await abrir()
    return await new Promise<T | null>((ok) => {
      const pedido = db.transaction(LOJA, 'readonly').objectStore(LOJA).get(chave)
      pedido.onsuccess = () => ok((pedido.result as T | undefined) ?? null)
      pedido.onerror = () => ok(null)
    })
  } catch {
    return null
  }
}

export async function gravarCache(chave: string, valor: unknown): Promise<void> {
  try {
    const db = await abrir()
    await new Promise<void>((ok) => {
      const tx = db.transaction(LOJA, 'readwrite')
      tx.objectStore(LOJA).put(valor, chave)
      tx.oncomplete = () => ok()
      tx.onerror = () => ok()
      tx.onabort = () => ok()
    })
  } catch {
    /* sem cache: só não fica mais rápido na próxima visita */
  }
}
