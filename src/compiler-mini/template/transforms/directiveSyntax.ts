import {
  findDir,
  findProp,
  createSimpleExpression,
} from '@vue/compiler-core'
import { stringifyExpr } from '../stringify'
import { genDirNode, genSimpleExpr } from '../ast'
import { eventMap, getEventModifier } from '../utils'

import type {
  NodeTypes,
  ElementTypes,
  ElementNode,
  DirectiveNode,
  ExpressionNode,
  SimpleExpressionNode,
  NodeTransform,
  TransformContext,
} from '@vue/compiler-core'

// TODO: handle slot
// TODO: 小程序中 wx:else wx:elif 不支持与 wx:for 同时使用
//       if 需要补充一层 block
export function transformSyntax (platformDir: string): NodeTransform {

  return (node, context) => {
    if (node.type === 1 as NodeTypes.ELEMENT) {
      for (const prop of node.props) {
        if (prop.type === 7 as NodeTypes.DIRECTIVE) {
          switch (prop.name) {
            case "on":
              transformOn(prop)
              break
            case "if":
            case "else-if":
            case "else":
            case "show":
              transformConditionals(node, prop, context, platformDir)
              break
            case "for":
              transformFor(node, prop, platformDir)
              break
            case "model":
              transformModel(prop)
              break
            case "slot":
              // TODO: transform slot cases
              transformSlot(node, prop)
              break
          }
        }
      }
    }
  }
}

function transformOn (prop: DirectiveNode) {
  const { arg, modifiers, exp } = prop

  let evtName = (arg as SimpleExpressionNode).content
  evtName = eventMap[evtName] ? eventMap[evtName] : evtName;

  (arg as SimpleExpressionNode).content = `${getEventModifier(modifiers)}:${evtName}`

  if (exp?.type === 4 as NodeTypes.SIMPLE_EXPRESSION) {
    exp.isStatic = true
  }
}

function transformConditionals (
  node: ElementNode,
  prop: DirectiveNode,
  ctx: TransformContext,
  platformDir: string
) {
  const directivesMap: Record<string, string> = {
    if: `${platformDir}:if`,
    "else-if": `${platformDir}:elif`,
    else: `${platformDir}:else`,
    show: "hidden"
  }

  prop.arg = genSimpleExpr(
    prop,
    directivesMap[prop.name],
    true,
    3,
    directivesMap[prop.name],
  )

  if (prop.name === "show") {
    const exp = prop.exp as SimpleExpressionNode
    exp.content = `!(${exp.content})`
  }

  // wrap the node into a `block` with this conditional prop
  // if there is a v-for prop on the node
  const vFor = findDir(node, "for")
  if (vFor) {
    const p = node.props.splice(node.props.indexOf(prop), 1)
    ctx.replaceNode({
      type: 1 as NodeTypes.ELEMENT,
      ns: 0,
      tag: "block",
      tagType: 0 as ElementTypes.ELEMENT,
      props: [...p],
      isSelfClosing: false,
      children: [node],
      loc: {
        ...node.loc,
        source: `<block ${p[0].loc.source}>${node.loc.source.replace(` ${p[0].loc.source}`, "")}</block>`
      },
      codegenNode: undefined
    })
  }
}


function transformSlot (
  node: ElementNode,
  prop: DirectiveNode
) {
  // default slot using template: 
  // <comp><template v-slot:default>slot content</template></comp>
  // <comp><template #default>slot content</template></comp>
  const { arg, exp } = prop
  const named = arg ? (arg as SimpleExpressionNode).content : "default"
  if (exp) { // all named and scoped
    // scoped slot
    // scoped slot embedded with scoped slot
    // scoped slot with v-if
    // named slot with one el child
    // named slot with multi children
    // named slot
    // dynamic slot name
  } else { // non-scoped
    if (named === "default") {
      // gen element without slot prop
      node.props.splice(node.props.indexOf(prop), 1)
    } else {
      // swap arg to exp, and gen static slot arg
      prop.exp = arg
      prop.arg = genSlotArgExpr(arg!)
    }
  }

  // transform template tag to view
  if (node.tagType === 3 as ElementTypes.TEMPLATE) {
    node.tag = "view"
    node.tagType = 0
  }
}

const genSlotArgExpr = (arg: ExpressionNode) => {
  return createSimpleExpression(
    "slot",
    true,
    { ...arg.loc, source: "slot" },
    3
  )
}

function transformFor (node: ElementNode, prop: DirectiveNode, platfirmDir: string) {
  const args = stringifyExpr(prop.exp!).split(/ (in|of) /g)
  const [forItemIdx, _, forObj] = args;
  (prop.exp as SimpleExpressionNode).content = forObj

  prop.arg = genSimpleExpr(prop, `${platfirmDir}:for`, true, 3, `${platfirmDir}:for`)

  if (/\(.+\)/.test(forItemIdx)) {
    const [item, idx] = forItemIdx.replace(/\(|\)/g, "").split(/, ?/)
    node.props.push(genDirNode(
      prop,
      `${platfirmDir}:for-item`,
      genSimpleExpr(prop, item, true, 3, item),
      genSimpleExpr(prop, `${platfirmDir}:for-item`, true, 3, `${platfirmDir}:for-item`),
      [],
      `${platfirmDir}:for-item="${item}"`
    ))
    node.props.push(genDirNode(
      prop,
      `${platfirmDir}:for-index`,
      genSimpleExpr(prop, idx, true, 3, idx),
      genSimpleExpr(prop, `${platfirmDir}:for-index`, true, 3, `${platfirmDir}:for-index`),
      [],
      `${platfirmDir}:for-index="${idx}"`
    ))
  } else {
    node.props.push(genDirNode(
      prop,
      `${platfirmDir}:for-item`,
      genSimpleExpr(prop, forItemIdx, true, 3, forItemIdx),
      genSimpleExpr(prop, `${platfirmDir}:for-item`, true, 3, `${platfirmDir}:for-item`),
      [],
      `${platfirmDir}:for-item="${forItemIdx}"`
    ))
  }

  const p = findProp(node, "key", true)
  if (p && p.type === 7 as NodeTypes.DIRECTIVE) {
    (p.arg as SimpleExpressionNode).content = `${platfirmDir}:key`
  } else {
    node.props.push(genDirNode(
      prop,
      `${platfirmDir}:key`,
      genSimpleExpr(prop, "*this", true, 3, "*this"),
      genSimpleExpr(prop, `${platfirmDir}:key`, true, 3, `${platfirmDir}:key`),
      [],
      `${platfirmDir}:key="*this"`
    ))
  }
}

function transformModel (prop: DirectiveNode) {
  const { arg } = prop
  if (!arg) {
    prop.arg = genSimpleExpr(prop, "model:value", true, 3, "")
  } else {
    (prop.arg as SimpleExpressionNode).content = `model:${(arg as SimpleExpressionNode).content}`
  }
}

