import { normalizePath } from './utils'

export const assetsCache = new Set<string>([])
export const moduleImportsCache = new Set<string>([])
export const utilsImportsCache = new Set<string>([])

export function cacheAssetPath (assetURL: string) {
  cachePath(assetURL, assetsCache)
}

export function cacheUtilsImports (assetURL: string) {
  cachePath(assetURL, utilsImportsCache)
}

export function cacheModuleImports (assetURL: string) {
  cachePath(assetURL, moduleImportsCache)
}

function cachePath (p: string, cache: Set<string>) {
  const normalized = normalizePath(p)
  if (!cache.has(normalized)) {
    cache.add(normalized)
  }
}