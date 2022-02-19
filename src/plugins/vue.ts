import * as crypto from "crypto"
import fs from "fs"
import path from "path"
import {
  cacheAssetPath,
  emitFile,
  externals,
  extractConfig,
  getFullPath,
  getURLParams,
  replaceRules,
  resolveImports
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

interface PluginData {
  descriptor: SFCDescriptor
  id: string
  filename: string
  index?: number
  isComponent?: boolean
}

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

      build.onResolve({ filter: /.vue\?/ }, async (args) => {
        const params = getURLParams(args.path)
        if (params.type) {
          return {
            path: getFullPath(args),
            namespace: params.type || "file",
            pluginData: {
              ...args.pluginData,
              index: params.index
            }
          }
        }

        return {
          path: args.path,
          external: externals.includes(args.path)
        }
      })

      build.onLoad({ filter: /\.vue$/ }, async (args) => {
        const encPath = args.path.replace(/\\/g, "\\\\")
        const source = fs.readFileSync(args.path, 'utf8')
        const filename = path.relative(process.cwd(), args.path)
        const { descriptor } = parse(source, { filename })

        // extract page config here
        // to mark the template as a page or a component
        // for template cssVars transform during compileTemplate
        let pageConfig: PageConfig = {}
        const raw = descriptor?.script
          ? descriptor?.script?.content || ""
          : descriptor?.scriptSetup
            ? descriptor?.scriptSetup?.content || ""
            : ""

        // extract page config
        // for marking `.vue` file as a component or a page: 
        const dpcReg = /definePageConfig\(\{[\w\W]+?\}\)/g
        const m = dpcReg.exec(raw)
        if (m) {
          pageConfig = extractConfig(`exports.default = ${m[0]}`, filename, `definePageConfig`)
        }

        const id = crypto
          .createHash("md5")
          .update(filename)
          .digest()
          .toString("hex")
          .substring(0, 8)

        let code = ``
        code += `import script from "${encPath}?type=script";\n`
        for (const style in descriptor.styles) {
          code += `import "${encPath}?type=style&index=${style}";\n`
        }
        code += `import "${encPath}?type=template";\n`
        code += `export { script as default };\n`

        return {
          contents: code,
          resolveDir: path.dirname(args.path),
          loader: "js",
          watchFiles: [args.path],
          pluginData: {
            id,
            filename,
            descriptor,
            isComponent: pageConfig?.component
          }
        }
      })

      resolveImports("script", build)

      build.onLoad({ filter: /.*/, namespace: "script" }, async (args) => {
        const { descriptor, filename } = args.pluginData as PluginData
        const ret: TransformResult = {}
        let codeForBundle = ``
        if (descriptor.scriptSetup || descriptor.script) {
          const script = compileScript(descriptor, ret)

          codeForBundle += script.code || ``
          const config = script.config || {}

          // post tranform
          // - to remove .vue imports and .vue components option
          // - to transform props to properties
          // - to transform script setup
          const post = compileScript(descriptor, ret, true)

          emitFile(filename, EXTENSIONS.JSON, JSON.stringify(config, null, 2))
          emitFile(filename, EXTENSIONS.JS, post.code || ``)

          return {
            contents: codeForBundle,
            loader: script.lang
              ? script.lang as ("ts" | "jsx" | "tsx")
              : "js",
            resolveDir: path.dirname(filename)
          }
        }
      })

      build.onLoad({ filter: /.*/, namespace: "template" }, async (args) => {
        const { descriptor, id, filename, isComponent } = args.pluginData as PluginData
        const template = descriptor.template?.content || ""

        let { code: result, ast, errors } = compileTemplate(template, {
          ...(rawOptions?.template || {}),
          id,
          isComponent,
          filename: args.path,
          cssVars: descriptor.cssVars || [],
          preprocessLang: descriptor.template?.lang
        })

        if (errors.length) {
          result = ``
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
          result = wxs + `\n` + result
        }

        emitFile(filename, EXTENSIONS.WXML, result)

        let code = `export function render(){};`
        // cache asset urls used
        if (ast?.imports) {
          for (const imp of ast.imports) {
            const assetPath = path.resolve(path.dirname(filename), imp.path)
            cacheAssetPath(assetPath)
          }
        }

        return {
          contents: code,
          loader: "js"
        }
      })

      build.onLoad({ filter: /.*/, namespace: "style" }, async (args) => {
        const { descriptor, id, filename, index } = args.pluginData as PluginData

        const style: SFCStyleBlock = descriptor.styles[index || 0]

        const styleRes = await compileStyleAsync({
          ...(rawOptions?.style || {}),
          id,
          filename,
          source: style.content,
          preprocessLang: style.lang as any,
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

        emitFile(filename, EXTENSIONS.WXSS, styleRes.code)

        return {
          contents: "",
          loader: "css",
          resolveDir: path.dirname(args.path)
        }
      })
    }
  }
}

export { vuePlugin }
vuePlugin.default = vuePlugin