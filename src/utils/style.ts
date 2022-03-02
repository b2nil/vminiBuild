import fs from "fs"
import path from "path"
import { extend } from "@vue/shared"
import { replaceRules } from './paths'
import { isDataUrl, isExternalUrl, parseUrl } from './urls'

import type { VueOptions } from 'types'

export function genPreprocessOptions (
  filename: string,
  preprocessOptions?: Record<string, any>
) {

  if (!preprocessOptions) {
    preprocessOptions = {}
  }

  return extend({
    includePaths: [
      path.dirname(filename),
      "src/styles",
      "node_modules"
    ],
    importer: [
      (url: string) => {
        const file = replaceRules(url)
        const modulePath = path.join(process.cwd(), "node_modules", file)

        if (fs.existsSync(modulePath)) {
          return { file: modulePath }
        }

        return { file }
      }
    ]
  }, preprocessOptions)
}

export function genPostcssUrlOptions (options: VueOptions) {
  return (asset: Record<string, any>) => {
    if (isExternalUrl(asset.url) || isDataUrl(asset.url)) {
      return asset.url
    }

    const url = parseUrl(asset.url)
    const assetOptions = options.template?.transformAssetUrls as any

    if (assetOptions?.base) {
      const base = parseUrl((assetOptions as any).base)
      const protocol = base.protocol || ''
      const host = base.host ? protocol + '//' + base.host : ''
      const basePath = base.path || '/'
      const href = host +
        (path.posix || path)
          .join(basePath, url.path + (url.hash || ''))
      return href
    }

    return asset.url
  }
}