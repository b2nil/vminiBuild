import type {
  PageConfig,
  ComponentConfig,
  UsingComponents
} from "types"
import { normalizePath } from './utils'

export const configCache = new Map<string, any>()
export const assetsCache = new Set<string>([])
export const moduleImportsCache = new Set<string>([])
export const utilsImportsCache = new Set<string>([])
export const pagesConfigCache = new Map<string, PageConfig>()
export const componentsConfigCache = new Map<string, ComponentConfig>()
export const usingComponentsCache = new Map<string, UsingComponents>()

export function cacheAssetPath (assetURL: string) {
  const normalized = normalizePath(assetURL)
  if (!assetsCache.has(normalized)) {
    assetsCache.add(normalized)
  }
}