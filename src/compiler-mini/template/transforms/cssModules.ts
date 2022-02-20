import { findProp } from '@vue/compiler-core'

import type {
  NodeTypes,
  NodeTransform,
  DirectiveNode,
  SimpleExpressionNode,
} from '@vue/compiler-core'

// inject hashed class names from css modules to elements
export function transformCssModuleClasses (
  cssModules: Record<string, Record<string, string>>
): NodeTransform {

  return (node, _ctx) => {
    if (!Object.keys(cssModules).length) return
    if (node.type === 1 as NodeTypes.ELEMENT) {
      const classProp = findProp(node, "class", true) as DirectiveNode
      if (!classProp) return
      const exp = classProp.exp! as SimpleExpressionNode
      const [k, v] = exp.content.split(".")
      if (cssModules[k] && cssModules[k][v]) {
        exp.content = cssModules[k][v]
        exp.isStatic = true
      }
    }
  }
}