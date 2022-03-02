import path from 'path'
import {
  parseUrl,
  isDataUrl,
  isExternalUrl,
  isRelativeUrl,
  normalizeAssetsURLOptions,
} from '../../../utils'

import {
  NodeTypes,
  NodeTransform,
  createSimpleExpression,
} from '@vue/compiler-core'

import type {
  AssetURLOptions,
  AssetURLTagConfig
} from '@vue/compiler-sfc'


const defaultURLOptions: Required<AssetURLOptions> = {
  base: null,
  includeAbsolute: false,
  tags: {
    video: ['src', 'poster'],
    'live-player': ['src'],
    audio: ['src'],
    source: ['src'],
    image: ['src'],
    'cover-image': ['src']
  }
}

// revised version of @vue/compiler-sfc's transformAssetUrls
export function transformAssetUrls (
  options: AssetURLOptions | AssetURLTagConfig
): NodeTransform {
  const assetOptions = normalizeAssetsURLOptions(options, defaultURLOptions)

  return (node, ctx) => {
    if (node.type === 1 as NodeTypes.ELEMENT) {
      if (!node.props.length) return

      const tags = assetOptions.tags!
      const attrs = tags[node.tag]
      const wildCardAttrs = tags['*']
      if (!attrs && !wildCardAttrs) return

      const assetAttrs = (attrs || []).concat(wildCardAttrs || [])
      node.props.forEach((attr) => {
        if (
          attr.type !== 6 as NodeTypes.ATTRIBUTE ||
          !assetAttrs.includes(attr.name) ||
          !attr.value ||
          isExternalUrl(attr.value.content) ||
          isDataUrl(attr.value.content) ||
          attr.value.content[0] === '#' ||
          (!assetOptions.includeAbsolute && !isRelativeUrl(attr.value.content))
        ) {
          return
        }

        const url = parseUrl(attr.value.content)

        if (assetOptions.base && attr.value.content[0] === '.') {
          // explicit base - directly rewrite relative urls into absolute url
          // to avoid generating extra imports
          // Allow for full hostnames provided in options.base
          const base = parseUrl(assetOptions.base)
          const protocol = base.protocol || ''
          const host = base.host ? protocol + '//' + base.host : ''
          const basePath = base.path || '/'

          // when packaged in the browser
          // path will be using the posix-only version 
          // provided by rollup-plugin-node-builtins.
          attr.value.content =
            host +
            (path.posix || path)
              .join(basePath, url.path + (url.hash || ''))

          return
        }

        // otherwise, push the url into imports
        // so that esbuild's vue-plugin will handle the file imports
        if (url.path) {
          const existingIndex = ctx
            .imports
            .findIndex(i => i.path === url.path)

          if (existingIndex < 0) {
            const name = `_imports_${ctx.imports.length}`
            const exp = createSimpleExpression(
              name,
              false,
              attr.loc,
              3
            )
            ctx.imports.push({ exp, path: url.path })
          }
          return
        }
      })
    }
  }
}