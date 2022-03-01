import path from "path"
import fs from "fs"
import {
  reqREG,
  wxsSrcREG,
  emitFile,
  externals,
  EXTENSIONS,
  getFullPath,
  replaceRules,
  extractConfig,
  resolveImports,
  parseVueRequest,
  getRegExpMatchedCode,
  getNativeImportsHelperCode,
} from "../utils"
import {
  compileTemplate,
  compileStyleAsync,
  getPlatformDirective,
} from "../compiler-mini"

import type { Plugin } from "esbuild"
import type { VueOptions, PageConfig } from 'types'

export default function nativePlugin (options: VueOptions = {}): Plugin {
  return {
    name: "vuemini:native",
    async setup (build) {
      build.onResolve({ filter: /\?native/ }, async (args) => {
        const params = parseVueRequest(args.path)

        if (params.type) {
          args.path = args.path.split("?")[0]

          if (args.path.startsWith("./src")) {
            args.resolveDir = process.cwd()
          }

          return {
            path: getFullPath(args),
            namespace: `native-${params.type}`,
            watchFiles: [
              args.path
            ],
            pluginData: args.pluginData
          }
        }

        return {
          path: args.path,
          external: externals.includes(args.path)
        }
      })

      build.onResolve({ filter: /\.wxs$/ }, async (args) => {
        const fullpath = getFullPath(args)
        return {
          path: fullpath,
          namespace: "wxs",
          watchFiles: [
            args.path
          ]
        }
      })

      resolveImports("native-js", build)

      build.onLoad({ filter: /.*/, namespace: "native-wxss" }, async (args) => {
        const filename = args.path
        const lang = path.extname(args.path).slice(1)
        const source = await fs.promises.readFile(filename, "utf8")

        if (lang === "wxss") {
          await emitFile(filename, EXTENSIONS.WXSS, source)

          return {
            contents: ``,
            resolveDir: path.dirname(args.path),
            loader: "css",
            watchFiles: [args.path]
          }
        }

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

        await emitFile(filename, EXTENSIONS.WXSS, res.code)

        return {
          contents: ``,
          resolveDir: path.dirname(args.path),
          loader: "css",
          watchFiles: [args.path]
        }
      })

      build.onLoad({ filter: /.*/, namespace: "native-json" }, async (args) => {
        const filename = args.path
        const rawJson = await fs.promises.readFile(filename, "utf8")
        const config: PageConfig = await extractConfig(`(${rawJson})`, filename)
        const code = await getNativeImportsHelperCode(config, filename)
        await emitFile(filename, EXTENSIONS.JSON, JSON.stringify(config, null, 2))
        return {
          contents: code,
          resolveDir: path.dirname(args.path),
          loader: "js",
          watchFiles: [args.path]
        }
      })

      build.onLoad({ filter: /.*/, namespace: "native-wxml" }, async (args) => {
        const filename = args.path
        let nativeTemplate = await fs.promises.readFile(filename, "utf8")
        const importsCode = getRegExpMatchedCode(nativeTemplate, wxsSrcREG)

        // should transform asset urls if useCDN
        if (options.useCDN) {
          const platformDir = getPlatformDirective(process.env.__PLATFORM__ || "weapp")
          const ret = await compileTemplate(nativeTemplate, {
            ...(options),
            filename,
            id: "wxml",
            cssVars: [],
            cssModules: {},
            platformDir
          })
          nativeTemplate = ret.code
        }

        await emitFile(filename, EXTENSIONS.WXML, nativeTemplate)

        return {
          contents: importsCode,
          resolveDir: path.dirname(args.path),
          loader: "js",
          watchFiles: [args.path]
        }
      })

      build.onLoad({ filter: /.*/, namespace: "native-js" }, async (args) => {
        const filename = args.path
        const lang = path.extname(filename).slice(1)
        const source = await fs.promises.readFile(filename, "utf8")
        let code = ``

        const res = await build.esbuild.transform(source, {
          // add minify if needed
          format: "esm",
          loader: lang as "ts" | "js"
        })

        code += res.code
        await emitFile(filename, EXTENSIONS.JS, code)

        return {
          contents: code,
          resolveDir: path.dirname(args.path),
          loader: "js",
          watchFiles: [args.path]
        }
      })

      build.onLoad({ filter: /.*/, namespace: "wxs" }, async (args) => {
        const filename = args.path
        const source = await fs.promises.readFile(args.path, "utf8")
        const code = getRegExpMatchedCode(source, reqREG)
        await emitFile(filename, EXTENSIONS.WXS, source)
        return {
          contents: code,
          resolveDir: path.dirname(args.path),
          loader: "js",
          watchFiles: [args.path]
        }
      })
    }
  }
}

export { nativePlugin }
nativePlugin.default = nativePlugin
