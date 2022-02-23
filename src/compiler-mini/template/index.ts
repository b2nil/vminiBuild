import { stringifyNodes } from './stringify'
import { transformSyntax, transformAssetUrls, transformStyleWithCssVars, transformCssModuleClasses } from './transforms'
import { baseParse, CompilerError, transform } from "@vue/compiler-core"

import type { VueOptions } from 'types'
import type { ElementNode } from '@vue/compiler-core'
import type {
  SFCTemplateCompileOptions,
  SFCTemplateCompileResults
} from '@vue/compiler-sfc'

interface PreProcessor {
  render (
    source: string,
    options: any,
    cb: (err: Error | null, res: string) => void
  ): void
}

function preprocess (
  preprocessor: PreProcessor,
  {
    source,
    filename,
    preprocessOptions
  }: Pick<SFCTemplateCompileOptions,
    "source" | "filename" | "preprocessOptions">
): string {
  let res: string = ''
  let err: Error | null = null

  preprocessor.render(
    source,
    { filename, ...preprocessOptions },
    (_err, _res) => {
      if (_err) err = _err
      res = _res
    }
  )

  if (err) throw err
  return res
}

export { getPlatformDirective } from "./utils"
export { normalizeAssetsURLOptions } from "./transforms"

export async function compileTemplate (
  template: string,
  options: VueOptions["template"] & {
    filename: string,
    id: string,
    cssVars: string[],
    isComponent?: boolean,
    cssModules: Record<string, Record<string, string>>,
    platformDir: string
  }
): Promise<SFCTemplateCompileResults> {
  const errors: CompilerError[] = []
  const warnings: CompilerError[] = []
  const preprocessLang = options?.preprocessLang

  if (preprocessLang && preprocessLang === "pug") {
    try {
      const pug = options.preprocessCustomRequire!("pug")
      template = preprocess(pug, {
        source: template,
        filename: options.filename,
        preprocessOptions: options.preprocessOptions
      })
      // Fix #default="#default" and v-else="v-else"
      template = template.replace(/(\B#.*?|\bv-.*?)="\1"/g, "$1")
    } catch (e: any) {
      return {
        code: `export default function render() {}`,
        source: template,
        tips: [],
        errors: [e]
      }
    }
  }

  const assetOptions = options.transformAssetUrls
    ? typeof options.transformAssetUrls === "boolean"
      ? {}
      : options.transformAssetUrls
    : {}

  const longId = `data-v-${options.id}`

  const ast = baseParse(template, options?.compilerOptions || {})
  transform(ast, {
    ...(options?.compilerOptions || {}),
    scopeId: options.scoped ? longId : undefined,
    nodeTransforms: [
      ...(options?.compilerOptions?.nodeTransforms || []),
      transformCssModuleClasses(options.cssModules),
      transformSyntax(options.platformDir),
      transformAssetUrls(assetOptions),
      transformStyleWithCssVars(options.id, options.cssVars, options.isComponent),
    ]
  })

  const code = stringifyNodes(ast.children, ast as unknown as ElementNode, options.platformDir)

  return {
    code,
    ast,
    source: template,
    tips: [],
    errors
  }
}