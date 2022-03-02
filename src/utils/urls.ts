import { isString } from '@vue/shared'
import { UrlWithStringQuery, parse as uriParse } from 'url'

import type {
  AssetURLOptions,
  AssetURLTagConfig
} from '@vue/compiler-sfc'

// The following util functions are copied
// from @vue/compiler-sfc's templateUtils.ts
// since they are exposed to external users
const dataUrlRE = /^\s*data:/i
const externalRE = /^(https?:)?\/\//
export const isDataUrl = (url: string) => dataUrlRE.test(url)
export const isExternalUrl = (url: string) => externalRE.test(url)

export const isRelativeUrl = (url: string): boolean => {
  const firstChar = url.charAt(0)
  return firstChar === '.' || firstChar === '~' || firstChar === '@'
}

export function normalizeAssetsURLOptions (
  options: AssetURLOptions | AssetURLTagConfig,
  defaultOptions: Required<AssetURLOptions>
): Required<AssetURLOptions> {
  if (Object.keys(options).some(key => Array.isArray((options as any)[key]))) {
    // legacy option format which directly passes in tags config
    return {
      ...defaultOptions,
      tags: options as any
    }
  }
  return {
    ...defaultOptions,
    ...options
  }
}

/**
 * Parses string url into URL object.
 */
export function parseUrl (url: string): UrlWithStringQuery {
  const firstChar = url.charAt(0)
  if (firstChar === '~') {
    const secondChar = url.charAt(1)
    url = url.slice(secondChar === '/' ? 2 : 1)
  }
  return parseUriParts(url)
}

/**
 * vuejs/component-compiler-utils#22 Support uri fragment in transformed require
 * @param urlString an url as a string
 */
export function parseUriParts (urlString: string): UrlWithStringQuery {
  // A TypeError is thrown if urlString is not a string
  // @see https://nodejs.org/api/url.html#url_url_parse_urlstring_parsequerystring_slashesdenotehost
  return uriParse(isString(urlString) ? urlString : '', false, true)
}
