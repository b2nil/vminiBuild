//@ts-ignore
import PromisePolyfill from 'promise-polyfill'
import 'regenerator-runtime'
import { createApp } from '@vue-mini/wechat'

Promise = PromisePolyfill

createApp(() => {
  console.log('App Launched!')
})
