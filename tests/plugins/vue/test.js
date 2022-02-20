import { ref } from "@vue-mini/wechat";
export default definePage({
  properties: { hi: Number },
  setup() {
    const data = ref(0);
    const method = () => {
      console.log();
    };
    return {
      data,
      method
    };
  }
});
