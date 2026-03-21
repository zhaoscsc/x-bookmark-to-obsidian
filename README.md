# X Bookmark to Obsidian

A Chrome extension + bundled macOS installer for saving X bookmarks into Obsidian.

你在 `x.com` 点击收藏后，插件会自动抓取帖子内容，并把它保存成 Markdown 笔记写入 Obsidian。

## 3 分钟安装完成

如果你只想先装起来，不想先看完整说明，按这 4 步就够了：

1. 从 Release 下载 `x-bookmark-to-obsidian-extension.zip` 和 `x-bookmark-to-obsidian-installer.zip`
2. 解压 `extension.zip`，去 `chrome://extensions` 开启开发者模式，然后“加载已解压的扩展程序”
3. 解压 `installer.zip`，运行 `install.command`
4. 重启 Chrome，打开扩展弹窗，选择你的 Obsidian 保存目录

如果 macOS 拦截 `install.command`：

- 先不要点“移到废纸篓”
- 去 `系统设置 -> 隐私与安全性` 放行
- 或在 Finder 里右键 `install.command`，选择“打开”

如果你想让 `Claude Code` 或 `Codex` 帮你装，可以直接看后面的“让 AI 帮你安装”一节。

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
- 将单帖抓取能力内置进发行包
- 增加抓取失败时的占位笔记降级
- 增加按 `url:` 去重
- 增加自定义 Obsidian 绝对路径设置

感谢原项目提供了一个可继续演化的基础版本，也感谢原作者把早期的扩展结构、设置页和 Native Host 方案铺出来，让这次改造可以把精力集中在“X 收藏 -> Obsidian”这条链路本身。

如果你想区分哪些能力来自原项目、哪些能力是这次新增的，可以结合 Git 历史查看本轮新增提交。

## 功能概览

- 监听 `x.com` 上的收藏动作，只在确认收藏成功后触发保存
- 使用发行包内置的抓取脚本获取帖子正文
- 抓取失败时自动降级为占位笔记，避免收藏动作丢失
- 支持图片和视频封面链接写入 Markdown
- 支持为图片和视频封面设置统一显示宽度
- 通过 `url:` 字段去重，避免重复创建同一条帖子笔记
- 支持在插件弹窗中自定义保存到任意 Obsidian 绝对路径

## 工作流

1. 你在 X 上点击收藏。
2. `content.js` 检测按钮状态已经变成“已收藏”。
3. `background.js` 提取帖子 URL 和最小页面信息，并转发给 Native Host。
4. Native Host 调用发行包内置抓取脚本获取完整内容。
5. 成功时生成完整 Markdown；失败时生成包含原帖链接的降级笔记。
6. 写入你配置好的 Obsidian 目录，并根据 `url:` 做去重。

## 系统要求

- macOS
- Chrome 浏览器
- 本机已安装 Python 3
- 已有一个 Obsidian vault，并且你知道要保存到哪个绝对路径

## 安装

最简单的使用方式是从 GitHub Release 下载：

- `x-bookmark-to-obsidian-extension.zip`

这个压缩包里已经包含：

- 浏览器扩展目录
- `install.command`
- `native-host` 运行时文件

如果你只想单独分发安装器，也可以额外使用：

- `x-bookmark-to-obsidian-installer.zip`

## 让 AI 帮你安装

如果你使用的是 `Claude Code`、`Codex` 这类可以在你本机执行命令的 AI 代理，也可以把这个仓库链接直接发给它，让它帮你完成大部分安装流程。

建议直接把下面这段话发给 AI：

```text
请帮我在这台 Mac 上安装这个 Chrome 扩展：
https://github.com/zhaoscsc/x-bookmark-to-obsidian

请按这个顺序执行：
1. 克隆或下载仓库
2. 运行 install.command
3. 检查 Native Host 是否安装成功
4. 告诉我在 Chrome 里如何加载已解压扩展
5. 引导我在扩展弹窗里设置 Obsidian 保存路径
6. 最后验证扩展是否已经可用

如果某一步需要我手动点击，请明确告诉我该点哪里。
不要修改我的其他目录或系统设置。
```

更适合 AI 执行的详细步骤说明见：

- [INSTALL_FOR_AI.md](./INSTALL_FOR_AI.md)

### 1. 加载 Chrome 扩展

1. 打开 `chrome://extensions`
2. 开启开发者模式
3. 点击“加载已解压的扩展程序”
4. 选择你解压后的扩展目录

### 2. 运行安装器

解压后，直接双击：

```bash
install.command
```

如果 macOS 弹出“无法打开”或“建议移到废纸篓”这类提示，不用慌，这通常是因为安装器还没有经过 Apple 签名和公证，不代表它一定有问题。

推荐按这个顺序处理：

1. 不要点“移到废纸篓”
2. 打开 `系统设置 -> 隐私与安全性`
3. 在页面下方找到刚刚被拦截的 `install.command`
4. 点击“仍要打开”或同类放行按钮
5. 再回到 Finder 重新打开一次

如果你更习惯 Finder 的右键菜单，也可以尝试：

1. 在 Finder 中找到 `install.command`
2. 右键点击它
3. 选择“打开”
4. 在弹窗里再次点击“打开”

这两种方式都比“移到废纸篓”更适合当前版本。

这一步会自动完成：

- 安装本机 Native Host
- 安装内置抓取运行时
- 写入 Chrome 所需的 host manifest

### 3. 重启 Chrome

重启后，扩展弹窗里应该能看到 Native Host 已连接。

### 4. 重新加载扩展时

这个项目使用固定扩展 ID，因此重新“加载已解压的扩展程序”后，不需要再去复制新的扩展 ID。

如果你怀疑本机安装状态失效，直接重新运行一次 `install.command` 即可。

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

## 配置图片显示宽度

打开插件弹窗，在“图片显示宽度（可选）”里：

- 留空：继续使用默认输出
- 填写正整数，例如 `400`：后续新保存的图片和视频封面会按这个宽度输出

示例：

- 留空时：

```md
![](https://pbs.twimg.com/media/example.jpg)
```

- 填 `400` 时：

```md
![400](https://pbs.twimg.com/media/example.jpg)
```

说明：

- 这是插件级全局设置
- 同时作用于普通图片和视频封面
- 只影响后续新保存的笔记，不会批量修改历史笔记
- 非法值会回退成默认输出

## 输出格式

生成的 Markdown 默认会保留这些信息：

- 原帖 URL
- 作者名和 handle
- 发布时间
- 正文内容
- 互动信息
- 图片链接或视频封面
- 可选的图片显示宽度
- 抓取失败时的说明信息

示例 frontmatter：

```yaml
---
url: https://x.com/user/status/123
author: [作者名 @handle]
published: 2026-03-20
---
```

说明：

- frontmatter 只保留有值字段
- 如果某条帖子缺少作者或发布时间，对应字段会直接省略

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
- 是否已经运行过 `install.command`
- Chrome 是否已重启
- 如果之前装过旧版本，尝试重新运行一次安装器

### 1.1 双击 `install.command` 时被 macOS 拦截

这是当前版本最常见的安装摩擦点。

你可以优先这样处理：

- 去 `系统设置 -> 隐私与安全性` 中放行刚刚被拦截的 `install.command`
- 或在 Finder 中右键 `install.command`，选择“打开”

如果你看到“移到废纸篓”，先不要这么做。当前更合适的做法是先放行，再重新打开。

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
- 当前仍需要本机安装器，不支持“只加载扩展 ZIP 就完整可用”

## 版本说明

`v2.2.0` 的核心能力：

- 点收藏即自动保存到 Obsidian
- 支持带图片的帖子
- 支持自定义保存绝对路径
- 支持抓取失败降级和 URL 去重
- 使用固定扩展 ID，免去手动复制扩展 ID
- 使用内置抓取脚本，不依赖外部 `~/.agents` 环境

## Acknowledgements

- 原始项目基础：[iamzifei/bookmark-is-learned](https://github.com/iamzifei/bookmark-is-learned)
- 感谢原作者提供了可继续改造的扩展基础，让这次工作可以更聚焦在 Obsidian 工作流集成上

## License

This project is licensed under the MIT License.
