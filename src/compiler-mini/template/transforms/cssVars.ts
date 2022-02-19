import {
  locStub,
  findProp,
  createSimpleExpression,
} from '@vue/compiler-core'
import { stringifyExpr } from '../stringify'

import type {
  NodeTypes,
  ElementTypes,
  ElementNode,
  AttributeNode,
  NodeTransform,
  TemplateChildNode
} from '@vue/compiler-core'


// inject css vars to first element's style
export function transformStyleWithCssVars (
  id: string,
  cssVars: string[],
  isComponent?: boolean
): NodeTransform {

  const inlineCssVars = cssVars
    ? cssVars.map(v => `--${id}-${v}: {{${v}}}`).join("; ")
    : ""

  const getCSSVarContainer = (nodes: TemplateChildNode[], isComp?: boolean): null | ElementNode => {
    if (isComp) {
      return nodes.length === 1
        ? nodes[0] as ElementNode
        : null
    }

    // Assuming `page-meta` is the only node if used
    if (nodes[0].type === 1 as NodeTypes.ELEMENT && nodes[0].tag === "page-meta") {
      return nodes[0]
    }

    return null
  }

  const createAttrProp = (name: string, content: string): AttributeNode => {
    return {
      type: 6 as NodeTypes.ATTRIBUTE,
      name,
      loc: locStub,
      value: {
        type: 2 as NodeTypes.TEXT,
        content,
        loc: locStub
      }
    }
  }

  return (node, _ctx) => {
    if (node.type === 0 as NodeTypes.ROOT && inlineCssVars !== "") {
      const propName = isComponent ? `style` : `page-style`
      const container = getCSSVarContainer(node.children, isComponent)
      if (container) {
        const styleProp = findProp(container, propName)
        if (styleProp) {
          // append cssVars
          if (styleProp.type === 6 as NodeTypes.ATTRIBUTE) {
            styleProp.value
              ? styleProp.value.content += ` ${inlineCssVars}`
              : styleProp.value = {
                type: 2 as NodeTypes.TEXT,
                loc: locStub,
                content: inlineCssVars
              }
          } else {
            // TODO: handle dynamic style binding
            const { exp } = styleProp
            if (exp) {
              exp.type === 4 as NodeTypes.SIMPLE_EXPRESSION
                ? exp.content = exp.content + inlineCssVars
                : styleProp.exp = createSimpleExpression(
                  exp.children.map(stringifyExpr).join("") + inlineCssVars,
                  true
                )
            }
          }
        } else {
          // add style or page-style prop with cssVars
          container.props.push(createAttrProp(propName, inlineCssVars))
        }
        return
      }

      // wrapp template chilren with a `view` or `page-meta` element
      // use `view` for component and `page-meta` for page
      const containerEl: ElementNode = {
        type: 1 as NodeTypes.ELEMENT,
        tag: isComponent ? "view" : "page-meta",
        tagType: 0 as ElementTypes.ELEMENT,
        ns: 0,
        props: [createAttrProp(propName, inlineCssVars)],
        children: node.children,
        isSelfClosing: false,
        loc: locStub,
        codegenNode: undefined,
      }

      node.children = [containerEl]
      return
    }
  }
}