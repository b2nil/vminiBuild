import path from 'path'
import fs from "fs"
import {
  DEFINE,
  __OUT__,
  emitFile,
  EXTENSIONS,
  extractConfigFromFile,
} from "../utils"

export interface PluginData {
  projectDir: string
  projectConfigPath: string
  sitemapPath: string
}

export async function emitAppRelatedConfigs (
  {
    projectConfigPath,
    sitemapPath,
  }: PluginData
) {
  if (fs.existsSync(projectConfigPath)) {
    const projConfig = await extractConfigFromFile(projectConfigPath, DEFINE.PROJECT_CONFIG)
    if (projConfig) {
      const projectOutfile = path.join(__OUT__.dir, "project.config.json")
      await emitFile(
        projectOutfile,
        EXTENSIONS.JSON,
        JSON.stringify(projConfig, null, 2)
      )
    }
  }

  if (fs.existsSync(sitemapPath)) {
    const sitemapConfig = await extractConfigFromFile(sitemapPath, DEFINE.SITEMAP_CONFIG)
    if (Boolean(sitemapConfig)) {
      const sitemapOutfile = path.join(__OUT__.dir, "sitemap.json")
      await emitFile(
        sitemapOutfile,
        EXTENSIONS.JSON,
        JSON.stringify(sitemapConfig, null, 2)
      )
    }
  }
}