import fs from "fs"
import path from 'path'
import esbuild from "esbuild"
import { cac } from "cac"
import { customRequire, DEFINE, extractConfigFromFile } from './utils'
import {
  printStats,
  vuePlugin,
  styleLoader,
  vueminiPlugin,
} from "./plugins"

import type { BuildOptions } from "esbuild"
import type { UserConfig, CliOptions } from 'types'

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
    console.warn(`config file vuemini.config.ts/js not found`)
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

async function initBuildOptions (userOptions: UserConfig): Promise<BuildOptions> {

  userOptions.vue = {
    ...(userOptions.vue || {}),
    style: {
      ...(userOptions.vue?.style || {}),
      postcssPlugins:
        userOptions.vue?.style?.postcssPlugins
          ? userOptions.vue?.style?.postcssPlugins
          : [
            customRequire(`postcss-pxtransform`)({
              platform: userOptions.platform || `weapp`,
              designWidth: userOptions.designWidth || 750
            })
          ],
      preprocessCustomRequire: customRequire
    },
    template: {
      ...(userOptions.vue?.template || {}),
      preprocessCustomRequire: customRequire
    }
  }

  const buildOptions: BuildOptions = {
    entryPoints: ["src/app.ts", "src/app.config.ts"],
    outdir: userOptions.outDir || `dist`,
    target: "esnext",
    format: "esm",
    bundle: true,
    color: true,
    metafile: true,
    incremental: true,
    splitting: true,
    define: {
      ...(userOptions.define || {}),
      "__PLATFORM__": `${userOptions.platform || 'weapp'}`
    },
    watch: !userOptions.watch ? false : {
      onRebuild (error, _res) {
        if (error) console.error('[x] rebuild failed:', error.message, "\n", error.stack)
        else console.log('[+] rebuild succeeded')
      }
    },
    logLevel: userOptions.logLevel,
    chunkNames: 'common/[dir]/[name]-[hash]',
    assetNames: 'assets/[dir]/[name]-[hash]',
    plugins: [
      vueminiPlugin({
        watch: userOptions.watch,
        minify: userOptions.minify,
        aliases: userOptions.aliases
      }),
      vuePlugin(userOptions.vue),
      styleLoader(userOptions.vue),
      ...(userOptions.plugins || [])
    ]
  }

  return buildOptions
}

async function buildWithEsbuild (options: CliOptions) {
  const userConfig = await getUserBuildConfig(options)

  if (options.p || options.platform) {
    userConfig.platform = options.p || options.platform
  }
  userConfig.watch = options.w || options.watch
  userConfig.logLevel = options.l || options.logLevel
  userConfig.emptyOutDir = options.emptyOutDir || userConfig.emptyOutDir
  userConfig.minify = options.minify || userConfig.minify

  const buildOptions = await initBuildOptions(userConfig)

  esbuild.build(buildOptions)
    .then(async (res) => {
      if (options.w || options.watch) {
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
    .option("-c, --config <configFilePath>", `[string] specify config file path, defualt: vuemini.config.ts/js`)

  cli
    .command("build")
    .option("-w, --watch", "[boolean] enable watch mode")
    .option("--minify", "[boolean] force minify the outputs")
    .option("--emptyOutDir", "[boolean] force empty OutDir")
    .action(buildWithEsbuild)

  cli.help()
  cli.parse()
}
