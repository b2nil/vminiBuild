import path from 'path'
import { hyphenate } from '@vue/shared'
import {
  externals,
  replaceRules,
  checkFileExists,
  moduleImportsCache,
} from "../../utils"

import type { TransformResult } from 'types'
import type {
  Statement,
  Identifier,
  Expression,
  ObjectMethod,
  SpreadElement,
  ObjectProperty,
  CallExpression,
  ObjectExpression,
  ImportDeclaration,
  FunctionDeclaration,
  ExpressionStatement,
  ExportDefaultDeclaration,
} from '@babel/types'

export function addMod (imports: Set<string>, mod: string, dirname: string) {
  if (externals.includes(mod)) {
    if (!moduleImportsCache.has(mod)) {
      moduleImportsCache.add(mod)
    }
  } else {
    // check alias
    const deAliased = replaceRules(mod)
    if (mod != deAliased) {
      mod = path.relative(dirname, deAliased)
    }

    let normalizedPath = path.join(process.cwd(), dirname, mod)
    // check if file exists
    normalizedPath = checkFileExists(normalizedPath)
    if (!imports.has(normalizedPath))
      imports.add(normalizedPath)
  }

  return mod.replace(/\\/g, "/")
}

// converts ast nodes to js object
export function exprToObject (node: any): any {
  const types = ['BooleanLiteral', 'StringLiteral', 'NumericLiteral']
  if (types.includes(node.type)) {
    return node.value
  }
  if (node.name === 'undefined' && !node.value) {
    return undefined
  }
  if (node.type === 'NullLiteral') {
    return null
  }
  if (node.type === 'ObjectExpression') {
    return genProps(node.properties)
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.reduce((acc: any, el: any) => [
      ...acc,
      ...(
        el!.type === 'SpreadElement'
          ? exprToObject(el.argument)
          : [exprToObject(el)]
      )
    ], [])
  }
}

// converts ObjectExpressions to js object
function genProps (props: any[]) {
  return props.reduce((acc, prop) => {
    if (prop.type === 'SpreadElement') {
      return {
        ...acc,
        ...exprToObject(prop.argument)
      }
    } else if (prop.type !== 'ObjectMethod') {
      const v = exprToObject(prop.value)
      if (v !== undefined) {
        return {
          ...acc,
          [prop.key.name || prop.key.value]: v
        }
      }
    }
    return acc
  }, {})
}

export function isExprStatementOf (
  item: Statement,
  reg: RegExp,
  itemType: "ExpressionStatement" | "ExportDefaultDeclaration" = "ExpressionStatement"
) {
  return item.type === itemType &&
    isCallExprOf(
      itemType === "ExportDefaultDeclaration"
        ? (item as any).declaration
        : (item as any).expression,
      reg
    )
}

export function extractConfigFromAST (stmt: ExpressionStatement) {
  const dpcCall = stmt.expression as CallExpression
  return exprToObject(dpcCall.arguments[0])
}

export function isCallExprOf (
  expr: Expression | FunctionDeclaration,
  reg: RegExp
): boolean {
  return expr.type === "CallExpression" &&
    expr.callee.type === "Identifier" &&
    reg.test(expr.callee.name)
}

function isKeyWanted (
  prop: ObjectMethod | ObjectProperty | SpreadElement,
  reg: RegExp
) {
  return prop.type === "ObjectProperty" &&
    prop.key.type === "Identifier" &&
    reg.test(prop.key.name)
}

export function findKeyPositions (stmt: ExportDefaultDeclaration) {
  const defineCall = stmt.declaration as CallExpression
  const options = defineCall.arguments[0] as ObjectExpression
  const loc: Record<string, { start: number, end: number }> = {}

  for (const prop of options.properties) {
    if (isKeyWanted(prop, /^props$/)) {
      const key = (prop as ObjectProperty).key as Identifier
      loc["props"] = { start: key.start!, end: key.end! }
    }

    if (isKeyWanted(prop, /^components$/)) {
      loc["components"] = { start: prop.start!, end: prop.end! }
    }

    if (loc.props && loc.components) break
  }

  return loc
}

export function extractImports (
  decl: ImportDeclaration,
  filename: string,
  ret: TransformResult
) {
  if (!ret.imports) ret.imports = new Set<string>([])
  if (!ret.components) ret.components = {}

  const mod = decl.source.value
  const dirname = path.dirname(filename)
  const deAliased = addMod(ret.imports, mod, dirname)
  if (deAliased !== mod && !deAliased.endsWith(".vue")) {
    const { start, end } = decl.source
    ret.s!.overwrite(start!, end!, `"${deAliased}"`)
  }

  if (deAliased.endsWith(".vue")) {
    let compName = decl.specifiers[0].local.name

    if (!ret.vueComp) ret.vueComp = new Set<string>([])
    if (!ret.vueComp.has(compName)) ret.vueComp?.add(compName)

    compName = hyphenate(compName)
    // leave ".vue" to be trimmed when generating import helper codes
    ret.components[compName] = deAliased
    ret.s!.remove(decl.start!, decl.end!)
  }
}