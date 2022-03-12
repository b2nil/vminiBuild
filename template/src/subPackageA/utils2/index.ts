import { stringifyQuery } from "@/utils/index"
export function stringifyQuery2 (query: { [s: string]: any } | ArrayLike<any>) {
  return stringifyQuery(query)
}
