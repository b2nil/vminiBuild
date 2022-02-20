import * as crypto from "crypto"
import fs from "fs"
import path from "path"
import {
  cacheAssetPath,
  emitFile,
  externals,
  getFullPath,
  replaceRules,
} from '../utils'
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyleAsync,
} from "../compiler-mini"

import type { Plugin } from "esbuild"
import type { PageConfig, TransformResult, VueOptions } from "types"
import type {
  SFCDescriptor,
  SFCBlock,
  SFCStyleBlock
} from "@vue/compiler-sfc"

enum EXTENSIONS {
  WXML = ".wxml",
  JSON = ".json",
  WXSS = ".wxss",
  JS = ".js"
}

// interface PluginData {
//   descriptor: SFCDescriptor
//   id: string
//   filename: string
//   index?: number
//   isComponent?: boolean
// }

const getWxsBlock = (blocks: SFCBlock[]): (null | SFCBlock) => {
  let block = null
  blocks.forEach(b => {
    if (b.type === "wxs") {
      if (Boolean(b.attrs.module)) {
        block = b
        return
      } else {
        console.warn("[WARNING] wxs block must declare module name.")
      }
    }
  })
  return block
}


export default function vuePlugin (rawOptions?: VueOptions): Plugin {

  return {
    name: "vuemini:vue",
    async setup (build) {
      build.initialOptions.define = {
        ...build.initialOptions.define,
        "__PLATFORM__": "'weapp'"
      }

      build.onResolve({ filter: /\.vue/ }, async (args) => {
        if (/\.vue$/.test(args.path)) {
          return {
            path: getFullPath(args),
            namespace: "vue",
            pluginData: {
              ...args.pluginData
            }
          }
        }

        return {
          path: args.path,
          external: externals.includes(args.path)
        }
      })

      build.onLoad({ filter: /.*/, namespace: "vue" }, async (args) => {
        const source = fs.readFileSync(args.path, 'utf8')
        const filename = path.relative(process.cwd(), args.path)
        const { descriptor } = parse(source, { filename })

        const id = crypto
          .createHash("md5")
          .update(filename)
          .digest()
          .toString("hex")
          .substring(0, 8)

        let isComponent = false
        let config: PageConfig = {}
        // handle script
        let codeForEmit = ``
        let codeForBundle = ``
        if (descriptor.scriptSetup || descriptor.script) {
          const ret: TransformResult = {}
          const script = compileScript(descriptor, ret)
          config = script.config || {}
          isComponent = Boolean(config.component)

          codeForBundle += script.code || ``
          // post tranform
          // - to remove .vue imports and .vue components option
          // - to transform props to properties
          // - to transform script setup
          const post = compileScript(descriptor, ret, true)
          codeForEmit = post.code || ``
        }

        // handle style
        let cssCode = ``
        let cssModules: Record<string, Record<string, string>> = {}

        const styleBlocks: SFCStyleBlock[] = descriptor.styles
        for (const styleBlock of styleBlocks) {
          const usedCSSModules = Boolean(styleBlock.module)
          const styleRes = await compileStyleAsync({
            ...(rawOptions?.style || {}),
            id,
            filename,
            source: styleBlock.content,
            // scoped: style.scoped,//not to support yet
            modules: usedCSSModules,
            preprocessLang: styleBlock.lang as any,
            preprocessOptions: {
              includePaths: ["src/styles", "node_modules", path.dirname(filename)],
              importer: [
                (url: string) => {
                  const file = replaceRules(url)
                  const modulePath = path.join(process.cwd(), "node_modules", file)
                  if (fs.existsSync(modulePath)) return { file: modulePath }
                  return { file }
                }
              ],
              ...(rawOptions?.style?.preprocessOptions || {})
            }
          })

          if (styleRes.errors.length) {
            console.warn(styleRes.errors.map((e: any) => `${e}`).join("\n"))
          }

          if (usedCSSModules) {
            const wxsModuleName = typeof styleBlock.module === "string"
              ? styleBlock.module
              : "$style"

            cssModules[wxsModuleName] = {
              ...(styleRes.modules || {})
            }
          }

          cssCode += styleRes.code + `\n`
        }

        // handle template
        const template = descriptor.template?.content || ""

        let { code: templateCode, ast, errors } = compileTemplate(template, {
          ...(rawOptions?.template || {}),
          id,
          isComponent,
          cssModules,
          filename: args.path,
          cssVars: descriptor.cssVars || [],
          preprocessLang: descriptor.template?.lang
        })

        if (errors.length) {
          templateCode = ``
          for (const err of errors) {
            console.warn(`[x] ${err}`)
          }
        }

        // handle wxs
        let wxs = ""
        const wxsBlock = getWxsBlock(descriptor.customBlocks)
        if (wxsBlock) {
          const m = wxsBlock.attrs.module
          wxs += `<wxs module="${m}">\n`
          wxs += wxsBlock.content.trim()
          wxs += `\n</wxs>`
        }

        if (Boolean(wxs)) {
          templateCode = wxs + `\n` + templateCode
        }

        // cache asset urls used
        if (ast?.imports) {
          for (const imp of ast.imports) {
            const assetPath = path.resolve(path.dirname(filename), imp.path)
            cacheAssetPath(assetPath)
          }
        }

        await emitFile(filename, EXTENSIONS.JS, codeForEmit || ``)
        await emitFile(filename, EXTENSIONS.WXML, templateCode)
        await emitFile(filename, EXTENSIONS.WXSS, cssCode)
        await emitFile(filename, EXTENSIONS.JSON, JSON.stringify(config, null, 2))

        return {
          contents: codeForBundle,
          resolveDir: path.dirname(args.path),
          loader: "ts",
          watchFiles: [args.path]
        }
      })
    }
  }
}

export { vuePlugin }
vuePlugin.default = vuePlugin