import * as crypto from "crypto"
import fs from "fs"
import path from "path"
import {
  cacheAssetPath,
  cacheUtilsImports,
  emitFile,
  externals,
  getFullPath,
  EXTENSIONS,
  getNativeImportsHelperCode,
  getRegExpMatchedCode,
  reqREG,
  genPreprocessOptions,
  genPostcssUrlOptions,
  customRequire
} from '../utils'
import {
  parse,
  compileScript,
  compileTemplate,
  compileStyleAsync,
  getPlatformDirective,
} from "../compiler-mini"

import type { Plugin } from "esbuild"
import type { PageConfig, TransformResult, VueOptions } from "types"
import type {
  SFCBlock,
  SFCStyleBlock
} from "@vue/compiler-sfc"

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


export default function vuePlugin (rawOptions: VueOptions = {}): Plugin {
  const { useCDN } = rawOptions
  return {
    name: "vuemini:vue",
    async setup (build) {
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
          const script = compileScript(descriptor, ret, rawOptions.script)

          // cache non-vue imports to build separately
          const imports = script.imports
          if (imports) {
            for (let imp of Array.from(imports)) {
              imp = path.resolve(path.dirname(filename), imp)
              if (!imp.endsWith(".vue")) cacheUtilsImports(imp)
            }
          }

          config = script.config || {}
          isComponent = Boolean(config.component)

          codeForBundle += script.code || ``
          const nativeImportsCode = await getNativeImportsHelperCode(config, filename)
          codeForBundle += "\n" + nativeImportsCode
          // post tranform
          // - to remove .vue imports and .vue components option
          // - to transform props to properties
          // - to transform script setup
          const post = compileScript(descriptor, ret, rawOptions.script, true)
          codeForEmit = post.code || ``
        }

        // handle style
        let cssCode = ``
        let cssModules: Record<string, Record<string, string>> = {}

        const deps = new Set<string>([])
        const styleBlocks: SFCStyleBlock[] = descriptor.styles
        for (const styleBlock of styleBlocks) {
          const usedCSSModules = Boolean(styleBlock.module)
          const styleRes = await compileStyleAsync({
            ...(rawOptions?.style || {}),
            id,
            filename,
            source: styleBlock.content,
            modules: usedCSSModules,
            preprocessLang: styleBlock.lang as any,
            preprocessOptions: genPreprocessOptions(
              filename,
              rawOptions?.style?.preprocessOptions
            ),
            postcssPlugins: [
              ...(rawOptions?.style?.postcssPlugins || []),
              customRequire(`postcss-url`)({
                url: !rawOptions.useCDN ? "inline" : genPostcssUrlOptions(rawOptions)
              })
            ],
          })

          if (styleRes.errors.length) {
            console.warn(styleRes.errors.map((e: any) => `${e}`).join("\n"))
          }

          if (styleRes.dependencies.size) {
            Array
              .from(styleRes.dependencies)
              .map(d => {
                if (!deps.has(d) && !d.startsWith(".vue")) deps.add(d)
              })
          }

          if (usedCSSModules) {
            const wxsModuleName = typeof styleBlock.module === "string"
              ? styleBlock.module
              : "styles"

            cssModules[wxsModuleName] = {
              ...(styleRes.modules || {})
            }
          }

          cssCode += styleRes.code.trim() + `\n`
        }

        // handle template
        const template = descriptor.template?.content || ""
        const platformDir = getPlatformDirective(process.env.__PLATFORM__ || "weapp")
        let { code: templateCode, ast, errors } = await compileTemplate(template, {
          ...(rawOptions?.template || {}),
          id,
          isComponent,
          cssModules,
          platformDir,
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
          const wxsSrc = wxsBlock.attrs.src
          const wxsSource = wxsBlock.content.trim()
          if (Boolean(wxsSource)) {
            wxs += `<wxs module="${m}">\n`
            wxs += wxsSource
            wxs += `\n</wxs>`
            codeForBundle += "\n" + getRegExpMatchedCode(wxsSource, reqREG)
          } else if (Boolean(wxsSrc) && wxsSrc !== true) {
            wxs += `<wxs module="${m}" src="${wxsSrc}"/>\n`
            codeForBundle += "\n" + `import "${wxsSrc}";`
          }
        }

        if (Boolean(wxs)) {
          templateCode = wxs + `\n` + templateCode
        }

        // cache asset urls used
        if (ast?.imports && !useCDN) {
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
          watchFiles: [args.path, ...Array.from(deps)]
        }
      })
    }
  }
}

export { vuePlugin }
vuePlugin.default = vuePlugin