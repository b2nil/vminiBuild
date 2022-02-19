import path from 'path'
import fs from "fs"
import {
  DEFINE,
  configCache,
  extractConfigFromFile,
} from "../utils"

export interface PluginData {
  projectDir: string
  projectConfigPath: string
  sitemapPath: string
}

export async function cacheAppRelatedConfigs (
  {
    projectConfigPath,
    sitemapPath,
  }: PluginData
) {
  if (fs.existsSync(projectConfigPath)) {
    const projConfig = await extractConfigFromFile(projectConfigPath, DEFINE.PROJECT_CONFIG)
    if (projConfig) {
      const projectOutfile = path.join("dist", "project.config.json")
      configCache.set(projectOutfile, projConfig)
    }
  }

  if (fs.existsSync(sitemapPath)) {
    const sitemapConfig = await extractConfigFromFile(sitemapPath, DEFINE.SITEMAP_CONFIG)
    if (Boolean(sitemapConfig)) {
      const sitemapOutfile = path.join("dist", "sitemap.json")
      configCache.set(sitemapOutfile, sitemapConfig)
    }
  }
}