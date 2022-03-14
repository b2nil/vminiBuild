<template>
  <view :class="styles.mine">
    <image :class="styles.logo" />
    <view :class="styles.greeting">{{ greeting }}</view>
    <custom-comp />
  </view>
</template>

<script setup lang="ts">
import { onReady, ref } from '@vue-mini/wechat'
import CustomComp from "@/components/CustomComp.vue"

definePageConfig({
  navigationBarTitleText: "Mine"
})

const greeting = ref("Have fun with Vue-Mini")

onReady(() => {
  console.log("script setup")
})

defineExpose({
  greeting
})

</script>

<style lang="scss" module>
.mine {
  text-align: center;
}

.logo {
  width: 400px;
  height: 400px;
  margin: 120px auto 0;
  background-image: url("../../images/vue-mini.png");
  background-size: 100% 100%;
}

.greeting {
  color: #2c3e50;
  font-size: 64px;
  font-weight: bold;
}
</style>