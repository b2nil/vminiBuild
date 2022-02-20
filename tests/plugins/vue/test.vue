<template>
  <view :class="$style.btn"/>
  <view :class="test.btn"/>
</template>

<script>
import { ref } from "@vue-mini/wechat"
import ComOne from "../components/comp.vue"
import ComTwo from "../components/comp2.vue"
definePageConfig({
  a: {c: "d"},
  b: "a"
})
export default definePage({
  components: {
    ComOne,
    ComTwo
  },
  props: { hi: Number },
  setup(){
    const data = ref(0)
    const method = () => { console.log() }
    return { 
      data,
      method
    }
  }
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