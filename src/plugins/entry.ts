import path from "path"
import fs from "fs"
import {
  appConfigREG, appREG, emitFile, externals, isTS,
  resolveImports, loadRules, styleExts,
  cacheAssetPath, DEFINE, __OUT__,
  extractConfigFromFile, getNativeImportsHelperCode, getPagePath, getPagesEntryImportsHelperCode,
} from '../utils'
import { emitAppRelatedConfigs } from "./cache"
import {
  emitUtilsChunks,
  emitModuleChunks,
  copyAssets,
} from "./emits"

import type { PluginData } from "./cache"
import type { AppConfig, UserConfig } from 'types'
import type { Plugin } from "esbuild"

export default function vueminiPlugin (options: UserConfig = {}): Plugin {
  return {
    name: "esbuild:vuemini",
    async setup (build) {
      build.initialOptions.external = externals
      await loadRules(options)

      build.onResolve({ filter: /\.(t|j)sx?$/ }, async (args) => {
        const ext = isTS(args.path) ? "ts" : "js"
        const projectDir = args.resolveDir
        if (appREG.test(args.path)) {
          return {
            path: args.path,
            namespace: "app",
            watchFiles: [
              args.path
            ],
            pluginData: {
              projectDir
            }
          }
        }

        if (appConfigREG.test(args.path)) {
          const sitemapPath = path.join(projectDir, "src", `sitemap.${ext}`)
          const projectConfigPath = path.join(projectDir, `project.config.${ext}`)

          return {
            path: args.path,
            namespace: "config",
            watchFiles: [
              args.path,
              projectConfigPath,
              sitemapPath
            ],
            pluginData: {
              projectDir,
              sitemapPath,
              projectConfigPath,
            }
          }
        }

        return {
          path: args.path,
          watchFiles: [args.path],
          pluginData: {
            projectDir
          }
        }
      })

      resolveImports("app", build)

      build.onLoad({ filter: /.*/, namespace: "app" }, async (args) => {
        const { path: p, pluginData, } = args
        let contents = await fs.promises.readFile(p, "utf8")
        return {
          contents,
          resolveDir: path.join(pluginData.projectDir, "src"),
          loader: isTS(p) ? "ts" : "js",
          watchFiles: [args.path]
        }
      })

      build.onLoad({ filter: /.*/, namespace: "config" }, async (args) => {
        const { path: filename, pluginData, } = args
        await emitAppRelatedConfigs(pluginData as PluginData)

        const appConfig = await extractConfigFromFile(filename, DEFINE.APP_CONFIG) as AppConfig
        if (!appConfig) {
          console.warn(`[ERROR]: failed to extract app config`)
        }

        const configOutfile = path.join(pluginData.projectDir, `${__OUT__.dir}/app.json`)

        const pages: string[] = []
        appConfig.pages.forEach((page, _index) => {
          const pagePath = getPagePath(page)
          if (pagePath) pages.push(pagePath)
        })

        const subPackages = appConfig?.subPackages || []
        subPackages.forEach((sub) => {
          sub.pages.forEach(page => {
            const pagePath = getPagePath(page, sub.root)
            if (pagePath) pages.push(pagePath)
          })
        })

        const tabList = appConfig.tabBar?.list || []
        const getFullAssetPath = (assetPath: string) => {
          return path.resolve(process.cwd(), `src`, `${assetPath}`)
        }

        tabList.forEach(l => {
          if (l.iconPath) {
            cacheAssetPath(getFullAssetPath(l.iconPath))
          }
          if (l.selectedIconPath) {
            cacheAssetPath(getFullAssetPath(l.selectedIconPath))
          }
        })

        let contents = await getPagesEntryImportsHelperCode(pages, filename)

        // check native components
        contents += "\n" + await getNativeImportsHelperCode(
          appConfig,
          path.join(pluginData.projectDir, args.path)
        )

        // check app style
        styleExts.forEach(ext => {
          const temp = path.join(pluginData.projectDir, `src/app.${ext}`)
          if (fs.existsSync(temp)) {
            contents += `\nimport "./app.${ext}";`
            return
          }
        })

        await emitFile(configOutfile, ".json", JSON.stringify(appConfig, null, 2))

        return {
          contents: contents,
          loader: "js",
          resolveDir: path.join(pluginData.projectDir, "src"),
          watchFiles: [
            args.path,
          ]
        }
      })

      build.onEnd(async () => {
        await emitModuleChunks(build.esbuild, options)
        await emitUtilsChunks(build.esbuild, options)
        await copyAssets()
        if (fs.existsSync(`${__OUT__.dir}/app.config.js`)) {
          fs.rm(`${__OUT__.dir}/app.config.js`, (err) => {
            if (err) {
              console.error(`[x] error removing file: ${__OUT__.dir}/app.config.js\n${err.stack}`)
            }
          })
        }

        if (fs.existsSync(`${__OUT__.dir}/app.config.css`)) {
          fs.rename(`${__OUT__.dir}/app.config.css`, `${__OUT__.dir}/app.wxss`, (err) => {
            if (err) {
              console.error(`[x] failed to rename "${__OUT__.dir}/app.config.css" to "${__OUT__.dir}/app.wxss\n${err.stack}`)
            }
          })
        }
      })
    }
  }
}

export {
  vueminiPlugin
}
vueminiPlugin["default"] = vueminiPlugin