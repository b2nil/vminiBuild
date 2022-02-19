import {
  createSimpleExpression
} from '@vue/compiler-core'

import type {
  NodeTypes,
  DirectiveNode,
  ExpressionNode,
  SimpleExpressionNode,
} from '@vue/compiler-core'

export function genSimpleExpr (
  prop: DirectiveNode,
  content: string,
  isStatic: boolean,
  constType: number,
  source?: string
): SimpleExpressionNode {

  const loc = source === undefined
    ? prop.loc
    : { ...prop.loc, source }

  return createSimpleExpression(content, isStatic, loc, constType)
}

export function genDirNode (
  currentProp: DirectiveNode,
  name: string,
  exp: ExpressionNode | undefined,
  arg: ExpressionNode | undefined,
  modifiers: string[],
  source?: string
): DirectiveNode {
  return {
    type: 7 as NodeTypes.DIRECTIVE,
    name,
    exp,
    arg,
    modifiers,
    loc: !source
      ? currentProp.loc
      : { ...currentProp.loc, source }
  }
}

export const isStatic = (exp: ExpressionNode) => {
  if (exp.type === 4) return exp.isStatic
  return false
}