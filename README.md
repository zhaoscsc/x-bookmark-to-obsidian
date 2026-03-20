# X 收藏到 Obsidian

一个 Chrome 扩展：你在 `x.com` 点击收藏后，扩展会自动把帖子保存到 Obsidian。

默认保存目录：

`/Users/zhaoyue/Documents/mywl/1-输入/01-待整理`

现在也支持在插件弹窗里自定义保存到任意 Obsidian 绝对路径。

## 工作流

1. 你在 X 上点击收藏。
2. `content.js` 确认这次操作已经变成“已收藏”状态。
3. `background.js` 把帖子 URL 和页面里提取到的最小信息转发给 Native Host。
4. Native Host 调用本机已有的 `x-fetcher` 抓正文。
5. 成功时生成完整 Markdown；失败时生成占位笔记，保证链接不丢。
6. 若目标目录里已存在相同 `url:` 的笔记，则直接去重，不重复落盘。

## 自定义保存路径

打开插件弹窗后，可以在“保存路径”区域：

- 手动输入 Obsidian 绝对路径
- 或点击“选择文件夹”
- 保存设置后，后续收藏都写入这个目录

示例：

```text
/Users/yourname/Documents/YourVault/1-输入/01-待整理
```

要求：

- 必须是绝对路径
- 建议指向你的收件箱或待整理目录

## 输出格式

新笔记会尽量贴合你当前 Obsidian 里的 X 笔记习惯：

```yaml
---
aliases: []
tags: []
up:
url: https://x.com/user/status/123
author: [作者名 @handle]
published: 2026-03-20
source: X (Twitter)
fetch_method: x_bookmark_helper
创建时间: 2026-03-20
修改时间: 2026-03-20
---
```

正文里会包含：

- 标题
- 原文
- 互动信息 callout
- 媒体链接
- 抓取失败时的降级说明

## 安装

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 选择“加载已解压的扩展程序”
4. 选择本目录 `/Users/zhaoyue/bookmark-is-learned`
5. 复制扩展 ID
6. 运行：

```bash
bash /Users/zhaoyue/bookmark-is-learned/native-host/install-macos.sh <扩展ID>
```

7. 重启 Chrome

## 调试

- 弹窗会显示 Native Host 状态和最近一次保存结果
- Native Host 日志在：

`~/Library/Logs/x-bookmark-to-obsidian/native-host.log`

- 如果 X 页面结构变化，优先用 Chrome DevTools MCP 检查：
  - 收藏按钮是否仍然使用 `data-testid="bookmark"` / `removeBookmark"`
  - 帖子链接是否仍可从时间戳链接提取
  - 收藏成功后按钮状态是否按预期切换

## 说明

- 不依赖 X 官方 API
- 不依赖 Obsidian CLI
- 保留 `Web Clipper` 作为失败时的手动补救方案
- 当前不处理“取消收藏后删除笔记”
