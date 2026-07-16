window.WALNUT_H5_CONFIG = {
  photoStorage: {
    // GitHub Pages 使用 Supabase；整站部署到 Node 服务器时可保持 auto。
    provider: "auto",
    apiUrl: "",
    supabaseUrl: "",
    // 这里只能填写 anon / publishable key，不能填写 service_role secret。
    supabaseAnonKey: "",
    bucket: "anniversary-checkins"
  },
  // 最后一幕「确认领取」对接的飞书多维表格收集表单。
  // 把表单的「分享链接」粘贴到 url 即可；留空时点击只展示成功页、不登记。
  claimForm: {
    url: "https://wrpnn3mat2.feishu.cn/share/base/form/shrcnIRGjXumIN8Rg65TMIq4i9f"
  }
};
