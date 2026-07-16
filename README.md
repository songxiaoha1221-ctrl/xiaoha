# GitHub Pages 上传说明

请把这个文件夹里的全部内容上传到 GitHub 仓库根目录，不要只上传外层文件夹。

页面包含五幕太空旅程、拍照/相册打卡、三款 IP 合影姿态、纪念海报合成、右下角跳过入口，以及拍照后的“开启下一个旅程”按钮。

## 开启 GitHub Pages

1. 打开仓库的 Settings → Pages。
2. Source 选择 Deploy from a branch。
3. Branch 选择 `main`，目录选择 `/ (root)`。
4. 保存后等待 GitHub 生成公网地址。

## 开启云端照片存储

GitHub Pages 本身不能保存照片，需要连接 Supabase Storage：

1. 创建 Supabase 项目。
2. 打开 Supabase 的 SQL Editor，运行本目录的 `supabase-setup.sql`。
3. 在 Project Settings → API 复制 Project URL 和 anon / publishable key。
4. 打开本目录的 `config.js`，把 `provider` 改成 `supabase`，并填写 `supabaseUrl`、`supabaseAnonKey`。
5. 把修改后的 `config.js` 再上传到 GitHub。

不要把 `service_role` 或 secret key 填进网页。照片桶是私有的，员工只能上传；管理员在 Supabase 的 Storage → `anniversary-checkins` 中查看照片。

`config.js` 示例：

```js
window.WALNUT_H5_CONFIG = {
  photoStorage: {
    provider: "supabase",
    apiUrl: "",
    supabaseUrl: "https://你的项目编号.supabase.co",
    supabaseAnonKey: "你的 anon 或 publishable key",
    bucket: "anniversary-checkins"
  }
};
```
