# 个人IP打造军师团 · 公开展示版

独立的GitHub Pages静态展示：保留创作者工作台的界面和本地交互，不包含真实AI/PDF后台。

## 在线浏览

https://shequsongwennuanle09-a11y.github.io/ip-council-showcase/?v=3#start

## 能力

八军师视角切换、手动IP档案、选题记录、作品设计与拍摄卡、作品级复盘、浏览器本地保存及项目JSON导出。真实AI和服务器PDF明确未启用，不模拟真实回复。

所有入口是同一个页面中的hash路由；刷新不会依赖服务器路由重写。可以点击右上角菜单找到完整工作台。

## 本地预览

无需安装Node依赖；在仓库目录执行：

```sh
python3 -m http.server 8080 --bind 127.0.0.1
```

然后打开 `http://127.0.0.1:8080/#start`。不需要API Key。

## GitHub Pages

Settings → Pages → Build and deployment：选择 `Deploy from a branch`，分支 `main`，目录 `/ (root)`。根目录的 `.nojekyll` 保留静态文件路径。

## 安全与资料范围

只包含通用前端及公开使用说明。未包含原直播课、私人账号画布、个性化手册、模型提示与密钥、测试日志、机器路径、原Git历史或本机浏览器档案。页面不请求 `/api/*`，不向模型发送输入。

本仓库与原本机AI项目分开维护；不是完整版后台的公开部署。

## 第三方组件

`vendor/marked.js` 与 `vendor/purify.min.js` 用于安全呈现Markdown；原许可证保留在对应文件旁。本项目不冒充小米官方产品，不使用小米商标或商品图。
