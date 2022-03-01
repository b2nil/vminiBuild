import os from "os"
import path from "path"
import fs from "fs"
import { replaceRules } from './paths'
import { moduleImportsCache, utilsImportsCache } from './cache'

import type { OnResolveArgs, PluginBuild } from "esbuild"

export enum EXTENSIONS {
  WXML = ".wxml",
  JSON = ".json",
  WXSS = ".wxss",
  JS = ".js",
  WXS = ".wxs"
}

export const __OUT__ = { dir: `dist` }
export const __PROD__ = process.env.NODE_ENV === "production"
export const appREG = /app\.(t|j)sx?$/
export const appConfigREG = /app\.config\.(t|j)sx?$/
export const cssREG = /\.(css|less|scss|stylus|sass)$/
export const styleExts = ["css", "less", "scss", "stylus", "sass"]
export const customRequire = (id: string) => require(path.resolve(process.cwd(), `node_modules/${id}`))

export const isTS = (f: string) => path.extname(f) === ".ts"
export const isWindows = os.platform() === 'win32'
export function normalizePath (id: string): string {
  return isWindows ? id.replace(/\\/g, "\\\\") : id
}

export const getOutputFilename = (
  p: string,
  ext: string
) => p.replace("src", __OUT__.dir).replace(".vue", ext)

export async function emitFile (filename: string, ext: string, code: string) {
  const outputFilename = getOutputFilename(filename, ext)
  const dir = path.dirname(outputFilename)

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  fs.promises.writeFile(outputFilename, code, "utf8")
}

function getFilename (p: string) {
  const exts = [".ts", "/index.ts", ".js", "/index.js"]
  for (const e of exts) {
    const temp = e.startsWith(".") ? p + e : path.join(p, e)
    if (fs.existsSync(temp)) {
      p = temp
      break
    }
  }
  return p
}

export function resolveImports (namespace: string, build: PluginBuild) {
  return build.onResolve({ filter: /.*/, namespace }, async (args) => {
    if (
      (/^(\.|\@\/)/.test(args.path) && !args.path.endsWith(".vue")) ||
      externals.includes(args.path)
    ) {
      args.path = replaceRules(args.path)
      if (externals.includes(args.path)) {
        if (!moduleImportsCache.has(args.path)) {
          moduleImportsCache.add(args.path)
        }

        return {
          path: args.path,
          external: true
        }
      }

      const fullpath = normalizePath(getFilename(getFullPath(args)))

      if (!utilsImportsCache.has(fullpath)) {
        utilsImportsCache.add(fullpath)
      }

      return {
        path: args.path,
        external: true
      }
    }
  })
}

export function parseVueRequest (search: string): Record<string, string> {
  let hashes = search.slice(search.indexOf('?') + 1).split('&')
  return hashes.reduce((params, hash) => {
    let [key, val] = hash.split('=')
    return Object.assign(params, { [key]: decodeURIComponent(val) })
  }, {})
}

export function getFullPath (args: OnResolveArgs) {
  return path.isAbsolute(args.path) ? args.path : path.join(args.resolveDir, args.path)
}

const getDeps = (): string[] => {
  const pkgPath = normalizePath(path.join(process.cwd(), `package.json`))
  const pkg = require(pkgPath)
  return Object.keys(pkg.dependencies)
}

export const externals = getDeps()

export function checkFileExists (mod: string): string {
  const exts = [".ts", ".js"]
  let filename = mod
  for (const e of exts) {
    let temp = mod + e
    if (fs.existsSync(temp)) {
      filename = temp
      break
    } else if (fs.existsSync(path.join(mod, "index" + e))) {
      filename = path.join(mod, "index" + e)
      break
    }
  }
  return filename
}