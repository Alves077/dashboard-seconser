import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// Só no `npm run dev`: serve em <base>/dados-locais/ os CSVs de uma pasta FORA do repositório
// (o retrato do banco, base_csv). Dado real nunca entra no repo nem no build.
function dadosLocais(pasta: string | undefined): Plugin {
  return {
    name: 'dados-locais',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use(`${server.config.base}dados-locais`, (req, res, next) => {
        const nome = decodeURIComponent((req.url ?? '/').split('?')[0]).replace(/^\/+/, '')
        // só um arquivo .csv da pasta, sem subpastas (nada de ../)
        if (!pasta || !/^[\w.-]+\.csv$/.test(nome)) return next()
        const arquivo = path.join(pasta, nome)
        if (!fs.existsSync(arquivo)) {
          res.statusCode = 404
          res.end()
          return
        }
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Last-Modified', fs.statSync(arquivo).mtime.toUTCString())
        fs.createReadStream(arquivo).pipe(res)
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: '/dashboard-seconser/',
    plugins: [react(), tailwindcss(), dadosLocais(env.DADOS_LOCAIS)],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
  }
})
