import fs from 'fs'
import path from 'path'
import type { AppConfig, PageConfig } from 'types'
import { appConfigREG, replaceRules } from '.'
import { normalizePath, styleExts } from './utils'

const getJSExt = (nativePath: string, filename: string) => {
  const postfixes = [".ts", ".js", "/index.ts", "/index.js"]
  const fullPath = path.resolve(path.dirname(filename), nativePath)

  for (const ext of postfixes) {
    if (fs.existsSync(`${fullPath}${ext}`)) {
      return ext
    }
  }

  console.warn("[x] native component not found: ", fullPath)
  return ""
}

const getJsonOrWxml = (nativePath: string, filename: string, ext: string, isDir: boolean) => {
  const possiblePath = isDir ? `${nativePath}/index.${ext}` : `${nativePath}.${ext}`
  const possibleFullPath = path.resolve(path.dirname(filename), possiblePath)

  let code = ``
  if (fs.existsSync(possibleFullPath)) {
    code += `import "${possiblePath}?native&type=${ext}";\n`
  }

  return code
}

export function getPagePath (page: string, subRoot?: string) {
  const exts = [".vue", ".js", ".ts"]
  for (const ext of exts) {
    let temp = subRoot !== undefined
      ? path.join("src", subRoot, page + ext)
      : path.join("src", page + ext)
    temp = normalizePath(path.join(process.cwd(), temp))
    if (fs.existsSync(temp)) return temp
  }

  console.log(`[x] page entry ${page} not found!`)
  return
}

export async function getPagesEntryImportsHelperCode (pages: string[], filename: string) {
  let contents = ``
  for (const page of pages) {
    if (page.endsWith(".vue")) {
      contents += `import "${page}";\n`
    } else {
      const ext = path.extname(page)
      const p = page.replace(ext, "")
      contents += `import "${page}?native&type=js";\n`
      contents += getJsonOrWxml(p, filename, "json", false)
      contents += getJsonOrWxml(p, filename, "wxml", false)
      contents += getStyleImportHelperCode(p, filename, false)
    }
  }
  return contents
}

function getStyleImportHelperCode (nativePath: string, filename: string, isDir: boolean) {
  const exts = ["wxss", ...styleExts]
  let code = ``
  for (const ext of exts) {
    const wxssPath = isDir ? `${nativePath}/index.${ext}` : `${nativePath}.${ext}`
    const fullWxssPath = path.resolve(path.dirname(filename), wxssPath)
    if (fs.existsSync(fullWxssPath)) {
      code += `import "${wxssPath}?native&type=wxss";\n`
      break
    }
  }
  return code
}

export async function getNativeImportsHelperCode (config: PageConfig | AppConfig, filename: string): Promise<string> {
  if (!config?.usingComponents) return ``
  if (!Object.keys(config.usingComponents).length) return ``

  let code = ``

  for (const [compName, nativePath] of Object.entries(config.usingComponents)) {
    let deAliased = replaceRules(nativePath)

    if (deAliased !== nativePath) {
      if (appConfigREG.test(filename)) {
        filename = path.relative(process.cwd(), filename)
      }

      deAliased = path.relative(path.dirname(filename), deAliased)
      deAliased = deAliased.replace(/\\/g, "/")
    }

    // trim ".vue" extension in config
    // and avoid changing third party libs
    config.usingComponents[compName] = /node_modules/.test(deAliased)
      ? deAliased.split("node_modules/")[1]
      : deAliased.replace(/\.vue$/, "")

    if (deAliased.endsWith(".vue")) {
      code += `import "${deAliased}";\n`
    } else {
      // check js|wxml|json|wxss=wxss,cssREG
      const jsExt = getJSExt(deAliased, filename)
      if (Boolean(jsExt)) {
        code += `import "${deAliased}${jsExt}?native&type=js";\n`

        const isDir = /index/.test(jsExt)
        code += getJsonOrWxml(deAliased, filename, "json", isDir)
        code += getJsonOrWxml(deAliased, filename, "wxml", isDir)
        code += getStyleImportHelperCode(deAliased, filename, isDir)
      }
    }
  }

  return code
}

export const wxsSrcREG = /(?<=\<wxs.+src=("|'))(.+?)(?=("|'))/g
export const reqREG = /(?<=require\(("|'))(.+?)(?=("|'))/g
export const importREG = /(?<=@?import ("|'))(.+?)(?=("|'))/g

export function getRegExpMatchedCode (source: string, regExp: RegExp) {
  const matches = source.match(regExp)
  let code = ``
  if (matches) {
    for (const match of matches) {
      // pass wxs imports to wxsPlugin 
      code += `import "${match}";\n`
    }
  }
  return code
}