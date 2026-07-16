window.WALNUT_H5_CONFIG = {
  photoStorage: {
    // GitHub Pages 使用 Supabase；整站部署到 Node 服务器时可保持 auto。
    provider: "auto",
    apiUrl: "",
    supabaseUrl: "",
    // 这里只能填写 anon / publishable key，不能填写 service_role secret。
    supabaseAnonKey: "",
    bucket: "anniversary-checkins"
  }
};
