import { isString, isSymbol } from "@vue/shared"

import type {
  TextNode,
  NodeTypes,
  ElementNode,
  DirectiveNode,
  AttributeNode,
  ExpressionNode,
  InterpolationNode,
  TemplateChildNode,
  SimpleExpressionNode,
} from '@vue/compiler-core'

let indentLevel = 0
const lineBreak = `\r\n`
const tab = ` `.repeat(2)
const indent = (level: number) => tab.repeat(level)
const containsEls = (node: ElementNode) => {
  for (const n of node.children) {
    if (n.type === 1) return true
  }
  return false
}

// Recursively stringify vue template ast
export function stringifyNodes (
  nodes: TemplateChildNode[],
  parent: ElementNode,
  platformDir: string
) {
  let res = ""
  const hasEls = containsEls(parent)
  if (hasEls) {
    indentLevel++
  }
  for (const node of nodes) {
    switch (node.type) {
      case 1 as NodeTypes.ELEMENT:
        res += indent(indentLevel - 1)
        res += stringifyElement(node, platformDir)
        break
      case 2 as NodeTypes.TEXT:
        if (hasEls)
          res += indent(indentLevel - 1)
        res += node.content
        if (hasEls) res += lineBreak
        break
      case 5 as NodeTypes.INTERPOLATION:
        if (hasEls)
          res += indent(indentLevel - 1)
        res += `{{ ${stringifyExpr(node.content)} }}`
        if (hasEls) res += lineBreak
        break
      case 8 as NodeTypes.COMPOUND_EXPRESSION:
        if (hasEls)
          res += indent(indentLevel - 1)
        res += `${stringifyExpr(node)}`
        if (hasEls) res += lineBreak
        break
      case 12 as NodeTypes.TEXT_CALL:
        if (hasEls)
          res += indent(indentLevel - 1)
        res += `{{ ${stringifyExpr(node.content)} }}`
        if (hasEls) res += lineBreak
        break
      default:
      // should not have if/if-branch and for
      // and ignore comments
    }
  }
  if (hasEls) {
    indentLevel--
  }
  return res
}

function stringifyElement (
  node: ElementNode,
  platformDir: string
): string {
  let res = ""
  let endBrkt = node.isSelfClosing ? `/>${lineBreak}` : `>`
  if (containsEls(node)) endBrkt += lineBreak

  res += `<${node.tag}`
  if (node.props.length) {
    res += ` ${stringifyProps(node.props, platformDir)}`
  }
  res += endBrkt
  res += stringifyNodes(node.children, node, platformDir)

  if (!node.isSelfClosing) {
    if (!containsEls(node)) {
      res += `</${node.tag}>`
    } else {
      res += indent(indentLevel - 1)
      res += `</${node.tag}>`
    }
    res += lineBreak
  }

  return res
}

function stringifyProps (props: (AttributeNode | DirectiveNode)[], platformDir: string) {
  return props
    .map(p => {
      switch (p.type) {
        case 6 as NodeTypes.ATTRIBUTE:
          return stringifyAttribute(p)
        case 7 as NodeTypes.DIRECTIVE:
          return stringifyDirective(p, platformDir)
      }
    })
    .join(" ")
}

function stringifyAttribute (p: AttributeNode): string {
  let res = p.name
  if (p.value) {
    res += `="${p.value.content}"`
  }
  return res
}

function stringifyDirective (dir: DirectiveNode, platformDir: string): string {
  const arg = stringifyExpr(dir.arg!)
  if (!dir.exp) {
    return arg
  }

  const exp = stringifyExpr(dir.exp)
  let isStatic = (dir.exp as SimpleExpressionNode).isStatic

  if (arg === `${platformDir}:key`) {
    isStatic = true
  }

  return isStatic
    ? `${arg}="${exp}"`
    : `${arg}="{{${exp}}}"`
}

export function stringifyExpr (
  exp: ExpressionNode | InterpolationNode | string | TextNode | symbol
): string {
  if (isString(exp)) return exp
  if (isSymbol(exp)) return ``

  if (exp.type === 2 as NodeTypes.TEXT ||
    exp.type === 4 as NodeTypes.SIMPLE_EXPRESSION
  ) {
    return exp.content
  } else if (exp.type === 5 as NodeTypes.INTERPOLATION) {
    return stringifyExpr(exp.content)
  } else {
    return (exp.children as (ExpressionNode | string)[])
      .map(stringifyExpr)
      .join('')
  }
}
