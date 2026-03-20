# X 收藏到 Obsidian

一个 Chrome 扩展 + Native Host 组合方案。

你在 `x.com` 点击收藏后，插件会自动抓取帖子内容，并把它保存成 Markdown 笔记写入 Obsidian。

这个仓库适合想要实现下面这类工作流的人：

- 在 X 上看到值得留存的内容，顺手点收藏
- 不想再手动复制链接、贴进 Obsidian
- 希望收藏内容自动进入自己的收件箱或待整理目录
- 希望保留帖子正文、作者、发布时间、媒体链接和原帖 URL

## 项目来源说明

这个项目不是从零开始新写的。

它是基于已有仓库 [iamzifei/bookmark-is-learned](https://github.com/iamzifei/bookmark-is-learned) 继续改造出来的。

原项目更偏向“收藏内容的 AI 摘要和整理”，这次改造的重点则是把它收敛成一个更直接的工作流工具：

- 在 `x.com` 点击收藏
- 自动抓取帖子内容
- 自动保存到 Obsidian

这次新增和重构的重点主要包括：

- 把主流程改成“X 收藏即保存到 Obsidian”
- 引入基于 Native Host 的本地落盘链路
- 接入本机 `x-fetcher` 作为正文抓取能力
- 增加抓取失败时的占位笔记降级
- 增加按 `url:` 去重
- 增加自定义 Obsidian 绝对路径设置

感谢原项目提供了一个可继续演化的基础版本，也感谢原作者把早期的扩展结构、设置页和 Native Host 方案铺出来，让这次改造可以把精力集中在“X 收藏 -> Obsidian”这条链路本身。

如果你想区分哪些能力来自原项目、哪些能力是这次新增的，可以结合 Git 历史查看本轮新增提交。

## 功能概览

- 监听 `x.com` 上的收藏动作，只在确认收藏成功后触发保存
- 优先调用本机 `x-fetcher` 抓取帖子正文
- 抓取失败时自动降级为占位笔记，避免收藏动作丢失
- 支持图片和视频封面链接写入 Markdown
- 通过 `url:` 字段去重，避免重复创建同一条帖子笔记
- 支持在插件弹窗中自定义保存到任意 Obsidian 绝对路径

## 工作流

1. 你在 X 上点击收藏。
2. `content.js` 检测按钮状态已经变成“已收藏”。
3. `background.js` 提取帖子 URL 和最小页面信息，并转发给 Native Host。
4. Native Host 调用本机 `x-fetcher` 抓取完整内容。
5. 成功时生成完整 Markdown；失败时生成包含原帖链接的降级笔记。
6. 写入你配置好的 Obsidian 目录，并根据 `url:` 做去重。

## 系统要求

- macOS
- Chrome 浏览器
- 本机已安装 Python 3
- 能正常运行本地 `x-fetcher`
- 已有一个 Obsidian vault，并且你知道要保存到哪个绝对路径

## 安装

### 1. 加载 Chrome 扩展

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择这个仓库目录
5. 记下扩展 ID

### 2. 安装 Native Host

运行：

```bash
bash /Users/zhaoyue/bookmark-is-learned/native-host/install-macos.sh <扩展ID>
```

这一步会把 Native Messaging Host 注册到 Chrome，让扩展可以调用本机写文件脚本。

### 3. 重启 Chrome

重启后，扩展弹窗里应该能看到 Native Host 已连接。

## 配置保存路径

打开插件弹窗，在“保存路径”区域：

- 手动输入你的 Obsidian 绝对路径
- 或点击“选择文件夹”
- 点击保存

示例：

```text
/Users/yourname/Documents/YourVault/1-输入/01-待整理
```

要求：

- 必须是绝对路径
- 建议使用收件箱、待整理区或输入区
- 目录必须真实存在

## 输出格式

生成的 Markdown 默认会保留这些信息：

- 原帖 URL
- 作者名和 handle
- 发布时间
- 正文内容
- 互动信息
- 图片链接或视频封面
- 抓取失败时的说明信息

示例 frontmatter：

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

## 使用方式

1. 打开 `x.com`
2. 找到想保存的帖子
3. 点击收藏
4. 插件会提示“正在保存到 Obsidian...”
5. 成功后笔记会出现在你配置的目录里

## 常见问题

### 1. 显示 Native Host 未连接

检查：

- Chrome 扩展是否已重新加载
- `install-macos.sh` 是否用当前扩展 ID 运行过
- Chrome 是否已重启

### 2. 纯文字帖子能保存，图片帖子失败

这是早期版本出现过的问题，当前版本已经兼容了多种 `media` 结构。如果还出现异常，请查看日志。

### 3. 图片链接写进去了，但在 Obsidian 里消失了

这通常不是插件问题，而是你的 Markdown 清理规则误删了 `![](...)` 图片语法。请检查 Linter 或自定义正则。

### 4. 保存失败但又不想丢链接

插件会自动生成占位笔记，至少保留原帖 URL 和失败时间，方便后续补抓。

## 调试

- 扩展弹窗会显示 Native Host 状态和最近一次保存结果
- Native Host 日志路径：

```text
~/Library/Logs/x-bookmark-to-obsidian/native-host.log
```

- 如果 X 页面结构变化，优先检查：
  - 收藏按钮是否仍然使用 `data-testid="bookmark"` / `removeBookmark"`
  - 帖子链接是否仍能从时间戳链接提取
  - 收藏成功后按钮状态是否仍按预期切换

## 当前限制

- 不依赖 X 官方 API，但因此更依赖 X 页面结构稳定性
- 当前不处理“取消收藏后删除笔记”
- 目前主要针对 macOS + Chrome 工作流
- 不直接调用 Obsidian Web Clipper 内部接口

## 版本说明

`v1.0.0` 的核心能力：

- 点收藏即自动保存到 Obsidian
- 支持带图片的帖子
- 支持自定义保存绝对路径
- 支持抓取失败降级和 URL 去重

## License

如果你准备公开分发，建议补充许可证文件。
