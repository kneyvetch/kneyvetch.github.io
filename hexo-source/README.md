# Kney Hexo 源码

此目录是从现有 GitHub Pages 静态站重建的 Hexo 源码工程。旧站根目录中的 `images/`、`js/` 和 `lib/` 是原始资源，构建前会自动复制到 Hexo 的 `source/`。

## 本地构建

需要 Node.js 18 或更新版本：

```bash
npm install
npm run build
npm run server
```

生成目录为 `public/`。主题固定为 NexT 7.8.0 / Gemini。文章正文从原站 HTML 恢复，尽量保留原始 HTML 与原有文章路径。

## 发布

仓库根目录的 GitHub Actions 工作流会在 Pull Request 和恢复分支上构建检查；只有变更进入 `main` 后才会尝试部署 GitHub Pages。原站根目录的静态文件和备份分支会保留，直到新构建经过验证。
