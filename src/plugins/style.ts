import path from "path"
import fs from "fs"
import { compileStyleAsync } from "../compiler-mini"
import {
  cssREG,
  getFullPath,
  genPreprocessOptions,
  customRequire,
  genPostcssUrlOptions
} from "../utils"

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
        const source = await fs.promises.readFile(filename, "utf8")
        const deps = new Set<string>([])
        const res = await compileStyleAsync({
          source,
          filename,
          id: "stylefile",
          preprocessLang: lang as any,
          preprocessOptions: genPreprocessOptions(
            filename,
            options?.style?.preprocessOptions
          ),
          postcssPlugins: [
            ...(options?.style?.postcssPlugins || []),
            customRequire(`postcss-url`)({
              url: !options.useCDN ? "inline" : genPostcssUrlOptions(options)
            })
          ],
          ...(options?.style || {})
        })

        if (res.errors.length) {
          console.warn(res.errors.map((e) => `${e}`).join("\n"))
        }

        if (res.dependencies.size) {
          Array
            .from(res.dependencies)
            .map(d => {
              if (!deps.has(d) && !d.startsWith(".vue")) deps.add(d)
            })
        }

        return {
          contents: res.code,
          resolveDir: path.dirname(args.path),
          loader: "css",
          watchFiles: [args.path, ...Array.from(deps)]
        }
      })
    }
  }
}

export { styleLoader }
styleLoader.default = styleLoader
