# 与核桃相伴三周年 H5

这是可直接用于 GitHub Pages 的静态 H5 页面。

## 上传方式

把本文件夹里的所有内容上传到 GitHub 仓库根目录：

- `index.html`
- `styles.css`
- `app.js`
- `.nojekyll`
- `assets/`

不要只上传外层文件夹本身，要上传文件夹里面的内容。

## 开启公网访问

进入 GitHub 仓库后：

1. 打开 `Settings`
2. 进入 `Pages`
3. `Build and deployment` 选择 `Deploy from a branch`
4. Branch 选择 `main`
5. Folder 选择 `/ (root)`
6. 点击 `Save`

等待 GitHub Pages 发布完成后，公网地址通常是：

`https://你的用户名.github.io/仓库名/`

如果仓库名是 `用户名.github.io`，地址通常是：

`https://你的用户名.github.io/`

## 二维码替换

二维码预留区在 `index.html` 里的 `.qr-orb`。后续可以把二维码图片放到 `assets/` 里，再替换该区域内容。
