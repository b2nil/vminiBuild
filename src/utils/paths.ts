import fs from "fs"
import { extractConfig } from "./config"


type Rule = { regex: RegExp, replacement: string }

const rules: Rule[] = []

/**
 * @returns true if there are any rules to apply, false otherwise.
 */
export async function loadRules (opts: any): Promise<boolean> {
  if (opts.aliases === false) {
    return false
  }

  if (opts.aliases) {
    for (const path in opts.aliases) {
      const from = "^" + replaceWildcard(path, "(.*)") + "$"
      const to = replaceWildcard(opts.aliases[path], "$1")

      rules.push({
        regex: new RegExp(from),
        replacement: to
      })
    }
  } else {
    await loadFromTsconfig()
  }

  return rules.length > 0
}

async function loadFromTsconfig () {
  let configFilename = null
  if (fs.existsSync("tsconfig.json")) {
    configFilename = `tsconfig.json`
  } else if (fs.existsSync("jsconfig.json")) {
    configFilename = `jsconfig.json`
  }

  if (!configFilename) return

  const rawConfig = await fs.promises.readFile(configFilename, { encoding: "utf8" })
  const tjsconfig = extractConfig(`(${rawConfig.toString()})`, configFilename)

  if (!tjsconfig?.compilerOptions?.paths) {
    return
  }

  for (const path in tjsconfig.compilerOptions.paths) {
    const dests: string[] = tjsconfig.compilerOptions.paths[path]
    if (dests.length == 0) {
      continue
    }

    const from = "^" + replaceWildcard(path, "(.*)") + "$"
    const to = replaceWildcard(dests[0], "$1")

    rules.push({
      regex: new RegExp(from),
      replacement: to
    })
  }
}

function replaceWildcard (str: string, repl: string) {
  return str.replace(/\*/g, repl)
}

export function replaceRules (path: string): string {
  for (const rule of rules) {
    path = path.replace(rule.regex, rule.replacement)
  }

  return path
}