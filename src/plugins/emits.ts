import path from "path"
import fs from "fs"
import {
  emitFile,
  assetsCache,
  utilsImportsCache,
  moduleImportsCache,
} from '../utils'

import type { Metafile, PluginBuild } from 'esbuild'
import type { UserConfig } from 'types'

export async function emitUtilsChunks (esbuild: PluginBuild["esbuild"], options: UserConfig) {
  esbuild.build({
    entryPoints: Array.from(utilsImportsCache),
    outdir: "dist",
    target: "esnext",
    format: "esm",
    chunkNames: 'common/[dir]/[name]-[hash]',
    bundle: true,
    splitting: true,
    watch: options.watch,
    minify: options.minify,
    // incremental: true,
    metafile: true,
    color: true,
  })
    .then(async (res) => {
      if (!options.watch)
        await printStats(res.metafile, esbuild)
    })
    .catch(e => {
      console.error(`[x] build error: \n${e.stack || e}`)
      process.exit(1)
    })
}

export async function emitModuleChunks (esbuild: PluginBuild["esbuild"], options: UserConfig) {
  const entries = Array.from(moduleImportsCache)
    .map(m => path.join(process.cwd(), "node_modules", m))

  esbuild.build({
    entryPoints: entries,
    outdir: "dist/miniprogram_npm",
    target: "esnext",
    format: "esm",
    chunkNames: 'chunks/[name]-[hash]',
    bundle: true,
    splitting: true,
    // incremental: true,
    metafile: true,
    color: true,
    watch: options.watch,
    minify: options.minify
  })
    .then(async (res) => {
      if (!options.watch)
        await printStats(res.metafile, esbuild)
    })
    .catch(e => {
      console.error(`[x] build error: \n${e.stack || e}`)
      process.exit(1)
    })
}

export async function printStats (metafile: Metafile, esbuild: PluginBuild["esbuild"]) {
  for (let [out, stats] of Object.entries(metafile.outputs)) {
    const inputs = stats.inputs

    if (out === "dist/app.config.css") {
      metafile.outputs["dist/app.wxss"] = stats
      out = "dist/app.wxss"
      delete metafile.outputs["dist/app.config.css"]
    }

    for (const [k, v] of Object.entries(inputs)) {
      const projectDir = path.resolve(process.cwd())
      if (k.includes(projectDir)) {
        const r = k.replace(projectDir, "")
          .replace(/:(\\|\/)src/, ":src")
          .replace(/\\/g, "/")

        metafile.outputs[out].inputs[r] = v

        delete metafile.outputs[out].inputs[k]
      } else if (k.startsWith("node_modules")) {
        const r = k.replace(/^node_modules(\/|\\)/, "")
        metafile.outputs[out].inputs[r] = v
        delete metafile.outputs[out].inputs[k]
      }
    }
  }

  const text = await esbuild.analyzeMetafile(metafile)
  console.log(text)
}

export async function emitJSONFiles (
  cache: Map<string, any>
) {
  cache.forEach(async (config, outFile) => {
    await emitFile(outFile, ".json", JSON.stringify(config, null, 2))
  })
}

export async function copyAssets () {
  Array.from(assetsCache).forEach(async (src) => {
    const dest = src.replace(/(\\|\/)?src((\\|\/))/, "dist")
    if (fs.existsSync(src) && (await fs.promises.lstat(src)).isDirectory()) {
      await copyDir(src, dest)
    } else if (fs.existsSync(src) && !fs.existsSync(dest)) {
      try {
        await fs.promises.mkdir(path.dirname(dest), { recursive: true })
        await fs.promises.copyFile(src, dest)
      } catch (error) {
        console.warn(error)
      }
    }
  })
}

export async function copyDir (src: string, dest: string) {
  const entries = await fs.promises.readdir(src, { withFileTypes: true })
  if (!fs.existsSync(dest)) {
    await fs.promises.mkdir(dest)
  }
  for (let entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)
    if (entry.isDirectory()) {
      await copyDir(srcPath, destPath)
    } else {
      await fs.promises.copyFile(srcPath, destPath)
    }
  }
}

