<template>
  <view :class="$style.btn">{{ data }}</view>
  <button :class="test.btn" @click="method">click me</button>
</template>

<wxs module="m" src="./test.wxs"/>

<script setup>
import { ref, onPageScroll } from "@vue-mini/wechat"
import ComOne from "./components/comp.vue"
import ComTwo from "./components/comp2.vue"

definePageConfig({
  a: { c: "d" },
  b: "a"
})

defineProps({
  hi: Number
})

const data = ref(0)
const method = () => { console.log() }

onPageScroll(({ scrollTop }) => {
  console.log('scrollTop:', scrollTop)
})

defineExpose({
  data,
  method
})

defineHookConfig({
  listenPageScroll: true
})
</script>

<style module>
.btn {
  color: red;
}
</style>

<style module="test">
.btn {
  color: blue;
}
</style>