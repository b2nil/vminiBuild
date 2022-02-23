import fs from "fs"
import path from 'path'
import esbuild from "esbuild"
import { cac } from "cac"
import { customRequire, DEFINE, extractConfigFromFile } from './utils'
import {
  printStats,
  vuePlugin,
  styleLoader,
  nativePlugin,
  vueminiPlugin,
} from "./plugins"

import type { BuildOptions } from "esbuild"
import type { UserConfig, CliOptions } from 'types'
import { normalizeAssetsURLOptions } from './compiler-mini'

const cli = cac("vmini")

async function getUserBuildConfig (opts: CliOptions): Promise<UserConfig> {
  let configFile = opts.c || opts.config
  let resolvedPath: string | undefined

  if (configFile) {
    const specifiedPath = path.resolve(process.cwd(), configFile)
    if (fs.existsSync(specifiedPath)) {
      resolvedPath = specifiedPath
    }
  } else {
    const tsconfigFile = path.resolve(process.cwd(), `mini.config.ts`)
    if (fs.existsSync(tsconfigFile)) {
      resolvedPath = tsconfigFile
    }

    if (!resolvedPath) {
      const jsconfigFile = path.resolve(process.cwd(), `mini.config.js`)
      if (fs.existsSync(jsconfigFile)) {
        resolvedPath = jsconfigFile
      }
    }
  }

  const buildConfig: UserConfig = {
    outDir: `dist`,
    emptyOutDir: false,
    platform: "weapp",
    designWidth: 750,
    logLevel: "debug"
  }

  if (!resolvedPath) {
    console.warn(`config file mini.config.ts/js not found`)
    console.warn(`use default config`)
    return buildConfig
  }

  const config = await extractConfigFromFile(resolvedPath, DEFINE.BUILD_CONFIG)

  if (!config) {
    console.warn(`Failed to read build config at: ${resolvedPath}`)
    console.warn("Please use `export default` or `exports.default` to export the build config")
    console.warn("Now use the build-in config instead.")
    return buildConfig
  }

  return config as UserConfig
}

async function initBuildOptions (userConfig: UserConfig): Promise<BuildOptions> {
  const { useCDN, ...userBuildOptions } = userConfig
  userBuildOptions.vue = {
    ...(userBuildOptions.vue || {}),
    useCDN,
    style: {
      ...(userBuildOptions.vue?.style || {}),
      postcssPlugins:
        userBuildOptions.vue?.style?.postcssPlugins
          ? userBuildOptions.vue?.style?.postcssPlugins
          : [
            customRequire(`postcss-pxtransform`)({
              platform: userBuildOptions.platform || `weapp`,
              designWidth: userBuildOptions.designWidth || 750
            })
          ],
      preprocessCustomRequire: customRequire
    },
    template: {
      ...(userBuildOptions.vue?.template || {}),
      preprocessCustomRequire: customRequire
    }
  }

  if (useCDN) {
    let { transformAssetUrls } = userBuildOptions.vue.template!

    if (!transformAssetUrls || transformAssetUrls === true) {
      transformAssetUrls = {
        base: `http://${useCDN.host}:${useCDN.port}/`
      }
    } else {
      transformAssetUrls = normalizeAssetsURLOptions(transformAssetUrls, {
        base: `http://${useCDN.host}:${useCDN.port}/`,
        includeAbsolute: false,
        tags: {}
      })
    }

    userBuildOptions.vue.template!["transformAssetUrls"] = transformAssetUrls
  }


  const buildOptions: BuildOptions = {
    entryPoints: ["src/app.ts", "src/app.config.ts"],
    outdir: userBuildOptions.outDir || `dist`,
    target: "esnext",
    format: "esm",
    bundle: true,
    color: true,
    metafile: true,
    incremental: true,
    splitting: true,
    define: {
      ...(userBuildOptions.define || {}),
      "process.env.__PLATFORM__": JSON.stringify(userBuildOptions.platform || "weapp")
    },
    watch: !userBuildOptions.watch ? false : {
      onRebuild (error, _res) {
        if (error) console.error('[x] rebuild failed:', error.message, "\n", error.stack)
        else console.log('[+] rebuild succeeded')
      }
    },
    logLevel: userBuildOptions.logLevel,
    chunkNames: 'common/[dir]/[name]-[hash]',
    assetNames: 'assets/[dir]/[name]-[hash]',
    plugins: [
      vueminiPlugin({
        watch: userBuildOptions.watch,
        minify: userBuildOptions.minify,
        aliases: userBuildOptions.aliases
      }),
      vuePlugin(userBuildOptions.vue),
      styleLoader(userBuildOptions.vue),
      nativePlugin(userBuildOptions.vue),
      ...(userBuildOptions.plugins || [])
    ]
  }

  return buildOptions
}

async function buildWithEsbuild (options: CliOptions) {
  const userConfig = await getUserBuildConfig(options)

  if (options.p || options.platform) {
    userConfig.platform = options.p || options.platform
  }

  process.env.__PLATFORM__ = userConfig.platform || 'weapp'

  userConfig.watch = options.w || options.watch
  userConfig.logLevel = options.l || options.logLevel
  userConfig.emptyOutDir = options.emptyOutDir || userConfig.emptyOutDir
  userConfig.minify = options.minify || userConfig.minify

  const buildOptions = await initBuildOptions(userConfig)

  // temprary hack to serve the whole src dir
  if (userConfig.useCDN) {
    esbuild.serve({
      ...userConfig.useCDN,
      servedir: `src`
    }, {
      entryPoints: [],
      outdir: `src/${userConfig.useCDN?.servedir || "images"}`,
      write: false
    }).then(_server => {
      // do nothing
    })
  }

  esbuild.build(buildOptions)
    .then(async (res) => {
      if (buildOptions.watch || userConfig.useCDN) {
        if (userConfig.useCDN) {
          console.log(`[+] serving static files at: http://${userConfig.useCDN.host}:${userConfig.useCDN.port}`)
        }
        console.log('[+] watching...')
      } else {
        await printStats(res.metafile!, esbuild)
      }
    })
    .catch((e: any) => {
      console.error(`[x] build error: \n${e.stack || e}`)
    })
}

export function printVersion () {
  const root = path.resolve(__dirname, "../")
  const ver = require(path.join(root, "package.json")).version
  console.log(`(^o^) vminiBuild v${ver} (^o^)`)
}

export function run () {
  cli
    .option("-p, --platform [platform]", "[string] weapp | alipay | swan | tt", { default: "weapp" })
    .option("-l, --loglevel <level>", `[string] debug | warn`)
    .option("-c, --config <configFilePath>", `[string] specify config file path, defualt: mini.config.ts/js`)

  cli
    .command("build")
    .option("-w, --watch", "[boolean] enable watch mode")
    .option("--minify", "[boolean] force minify the outputs")
    .option("--emptyOutDir", "[boolean] force empty OutDir")
    .action(buildWithEsbuild)

  cli.help()
  cli.parse()
}
