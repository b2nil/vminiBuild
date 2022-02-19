import path from "path"
import fs from "fs"
import { cssREG, getFullPath, replaceRules } from "../utils"
import { compileStyleAsync } from "../compiler-mini"
import type { Plugin } from "esbuild"
import type { VueOptions } from 'types'

export default function styleLoader (options: VueOptions = {}): Plugin {
  return {
    name: "vuemini:styleloader",
    async setup (build) {
      build.onResolve({ filter: cssREG }, async (args) => {
        const lang = path.extname(args.path).slice(1)
        const fullpath = getFullPath(args)
        return {
          path: fullpath,
          namespace: "styles",
          watchFiles: [
            args.path
          ],
          pluginData: {
            lang
          }
        }
      })

      build.onLoad({ filter: /.*/, namespace: "styles" }, async (args) => {
        const { path: filename, pluginData: { lang } } = args
        const source = fs.readFileSync(filename, "utf8")
        const res = await compileStyleAsync({
          source,
          filename,
          id: "stylefile",
          preprocessLang: lang as any,
          preprocessOptions: {
            includePaths: [
              path.dirname(filename),
              "src/styles",
              "node_modules"
            ],
            importer: [
              (url: string) => {
                const file = replaceRules(url)
                const modulePath = path.join(process.cwd(), "node_modules", file)
                if (fs.existsSync(modulePath)) return { file: modulePath }
                return { file }
              }
            ],
            ...(options?.style?.preprocessOptions || {})
          },
          ...(options?.style || {})
        })

        if (res.errors.length) {
          console.warn(res.errors.map((e) => `${e}`).join("\n"))
        }

        return {
          contents: res.code,
          resolveDir: path.dirname(args.path),
          loader: "css",
          watchFiles: [args.path]
        }
      })
    }
  }
}

export { styleLoader }
styleLoader.default = styleLoader
