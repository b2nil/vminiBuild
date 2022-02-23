const platformDirMap: Record<string, string> = {
  weapp: "wx",
  swan: "s",
  alipay: "a",
  tt: "tt",
  jd: "jd",
}

export const __DIR = platformDirMap[process.env.__PLATFORM__!]

export const eventMap: Record<string, string> = {
  click: "tap"
}

export const directivesMap: Record<string, string> = {
  if: `${__DIR}:if`,
  "else-if": `${__DIR}:elif`,
  else: `${__DIR}:else`,
  show: "hidden"
}

export const eventModifiers: Record<string, string> = {
  stop: "catch", // .stop => catch
  catch: "catch", // .catch => catch
  mut: "mut-bind",  // .mut => mut-bind
  capture: "capture-bind", // .capture => capture-bind
}

export function getEventModifier (modifiers: string[]) {
  for (const m of modifiers) {
    if (!eventModifiers[m]) {
      console.warn(`Modifier .${m} not supported yet.`)
      console.warn(`Currently supporting: .stop/.catch, .mut, .capture, .capture.catch`)
    }
  }

  if (modifiers.length === 1 &&
    eventModifiers[modifiers[0]]
  ) {
    return eventModifiers[modifiers[0]]
  }

  // .capture.stop or .capture.catch => capture-catch
  if (modifiers.includes("capture") &&
    (modifiers.includes("stop") || modifiers.includes("catch"))
  ) {
    return "capture-catch"
  }

  return "bind"
}


