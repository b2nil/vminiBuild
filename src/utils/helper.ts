import fs from 'fs'
import path from 'path'
import type { AppConfig, PageConfig } from 'types'
import { appConfigREG, replaceRules } from '.'
import { styleExts } from './utils'

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
    config.usingComponents[compName] = deAliased.replace(/\.vue$/, "")

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

        const exts = ["wxss", ...styleExts]
        for (const ext of exts) {
          const wxssPath = isDir ? `${deAliased}/index.${ext}` : `${deAliased}.${ext}`
          const fullWxssPath = path.resolve(path.dirname(filename), wxssPath)
          if (fs.existsSync(fullWxssPath)) {
            code += `import "${wxssPath}?native&type=wxss";\n`
            break
          }
        }
      }
    }
  }

  return code
}

export const wxsSrcREG = /(?<=\<wxs.+src=("|'))(.+?)(?=("|'))/g
export const reqREG = /(?<=require\(("|'))(.+?)(?=("|'))/g

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