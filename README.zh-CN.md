# Codex Quota Rail

**周剩余额度与重置时间，就在头像上方。**

[English](README.md) · [安全说明](SECURITY.md) · [MIT 许可证](LICENSE)

独立实现的 macOS / Windows 非官方扩展，在 Codex 头像上方显示彩色周额度圆环。悬浮查看详情，点击固定；再次点击、点击外部或按 Escape 关闭。

> **预览版。** 已完成自动化 DOM / 协议测试及本机客户端嵌入检查；跨客户端版本兼容性仍待验证。不是 OpenAI 官方插件。

## 特点

- 圆环随剩余额度减少，从绿色逐渐变为橙色、红色。
- 周额度与可选的 5 小时额度各自展示剩余条、重置时间、倒计时及周期已过去的进度条。
- 只读展示可用重置卡次数和最近到期时间；没有卡显示 0 次，读取失败或过期显示暂不可用。
- 额外点数余额仅显示整数（舍去小数），不推断币种或赠送来源。
- 中英文切换并保存偏好；所有时间使用电脑本地时区。
- 每分钟自动同步，可手动刷新。
- 支持原图标启动：新启动时可能正常退出并重开一次以启用连接；不打断已运行会话，不强制结束客户端，不修改安装包。
- 运行时不依赖 npm 第三方包。

## 安装

支持 macOS 和 Windows 10/11（实验支持，待真实客户端视觉验收）。macOS 需要安装在 `/Applications` 的 ChatGPT.app / Codex.app、已有 Codex 登录及 **Node.js 22+**。

下载 Release ZIP 并解压，或克隆仓库。macOS 双击 **Install.command**，Windows 双击 **Install.cmd**，也可以运行：

```sh
node src/cli.mjs install
```

日常运行无需 `npm install`。macOS 安装会复制运行文件至 `~/Library/Application Support/CodexQuotaRail` 并注册用户登录自启服务。后台服务不会在登录时主动打开 Codex；会监测新启动，并可能正常退出后重开一次以启用连接。

## 启动

安装后保存工作，完全退出客户端一次，再点击**原来的 Codex 图标**。macOS 使用 NSWorkspace 应用通知，Windows 使用 CIM 进程事件；不再每 5 秒扫描进程，也不需要退出后刻意等待 5 秒。

仅在刚启动、已完成初始化、处于前台且启动后没有新输入时，才可能正常退出并重开一次补上连接参数。你一旦开始操作，就跳过自动重开。助手启动前已有的会话不会被重启；尝试会先持久记录，间隔至少 1 分钟，不强制结束客户端。只在启动或退出的短暂过渡期间进行有界检查。连接健康仍会定时探测本地端口，额度仍每分钟刷新。

如果系统策略禁止事件订阅、客户端拒绝正常退出，或助手比客户端启动得晚，可完全退出后使用 **Start Codex.command / Start Codex.cmd** 作为备用入口。Status 中的 `startup` 显示 `listening` 或 `unavailable`。

ZIP 包含 macOS 14+ 通用架构原生助手及 Swift 源码，使用者无需安装 Xcode。开发者可用 Xcode 命令行工具运行 `scripts/build-native.sh` 重新构建。助手采用临时签名，未经 Apple 公证。Windows 的 PowerShell 执行策略仅作用于助手进程，不修改系统策略。

安装本身不会重启当前客户端。事件监听与保护测试不能替代真实登录后的重开验收；Windows 仍属于实验支持。

## Mac 应用安装位置

安装器依次检查 `/Applications/Codex.app`、`/Applications/ChatGPT.app`，以及 `~/Applications` 下的同名应用。候选应用必须包含 Info.plist 和可执行的内置 Codex CLI，不会退回使用电脑上另一份全局 CLI。

如果应用改过名字或安装在自定义目录，在解压后的项目目录执行：

```sh
CODEX_QUOTA_APP="/应用的绝对路径/My Codex.app" node src/cli.mjs install
```

确认后的真实路径会保存到本机配置，后台自启不依赖这次临时环境变量。之后若移动应用，使用新路径重新安装即可。指定或已保存的路径失效时，不会悄悄切换到另一份应用。Status 会显示选中的应用路径。

## Windows 使用方法

安装 Node.js 22+ 并加入 PATH，解压 ZIP 后使用 Install.cmd、Start Codex.cmd、Status.cmd、Uninstall.cmd，一般不需要管理员权限。

运行文件位于 `%LOCALAPPDATA%\CodexQuotaRail`。安装会在当前用户的“启动”文件夹放置 `CodexQuotaRail.vbs`，登录时隐藏启动后台助手，不主动打开 Codex；需要系统启用 Windows Script Host，不注册系统服务或计划任务。

会检查常见用户目录、Program Files 和 Microsoft Store 安装位置。若无法识别，可设置持久的用户环境变量 `CODEX_QUOTA_APP`（桌面客户端 exe 绝对路径）和可选的 `CODEX_QUOTA_CLI`（codex.exe 绝对路径），然后重新打开安装入口。部分 Store 管理的客户端可能限制直接启动或忽略调试参数，不能保证兼容。使用 Status.cmd 检查连接；客户端还须具备兼容侧栏和 app-server 协议。

Windows CI 检查 PowerShell、监听进程校验及隔离的助手启停；不包含已登录的 Codex 桌面。Windows 真实客户端界面仍待实机验收，不能用 macOS 截图代替。

## 设置与诊断

详情面板中的 **English / 简体中文** 可以切换语言并保存偏好。

```sh
node src/cli.mjs language auto  # 也可指定 zh 或 en
node src/cli.mjs status
```

诊断只输出安装状态、连接状态、已附着窗口数量和同步时间，不输出账户或凭据原始数据。`waiting-for-client` 通常表示尚未通过专用启动入口打开客户端；若已经连接但窗口数量一直为零，可能是侧栏结构不兼容，请反馈客户端版本，不要附带聊天截图或账户信息。

## 卸载

macOS 双击 **Uninstall.command**，Windows 双击 **Uninstall.cmd**，或运行：

```sh
node src/cli.mjs uninstall
```

会尽力移除已连接窗口中的卡片，停止后台服务并删除本组件安装目录。**然后请完全退出客户端，再从原应用图标打开，以关闭本次运行的调试端口。** 下载的代码目录可自行删除。不会删除 Codex、登录信息和聊天记录。

## 实现与安全边界

本机 `codex app-server` 提供只读额度 RPC；后台服务按窗口时长识别周/5 小时额度，再通过本机 CDP 连接把卡片加入导航栏。卡片用 Shadow DOM 隔离样式，监听导航变化重新定位；找不到头像锚点时隐藏，不猜测位置。项目不扫描工程、不读取会话数据库。

本地调试接口为 `127.0.0.1:39333`，其能力超过额度显示。**只监听 localhost 不等于认证。** 项目校验监听进程与 WebSocket 地址，但不能阻止其他本地软件访问调试接口。请勿转发端口，详见 [SECURITY.md](SECURITY.md)。

## 开发

```sh
npm ci
npm test
```

测试覆盖额度窗口识别、异常与过期数据、中英文切换、卡片定位和移除、导航结构替换，以及 CDP 请求生命周期。GitHub Actions 在 macOS 和 Windows 上测试 Node 22 / 24。

欢迎提交兼容性反馈与小范围改进，保留仅处理新启动和防重复重启保护。项目以 MIT 许可证发布。

## AI 辅助首次安装与回归

仓库提供 [codex-quota-setup Skill](skills/codex-quota-setup/SKILL.md)，覆盖环境识别、首次启动、实际显示验收和故障定位。可在仓库目录运行：

```sh
npx skills add . --skill codex-quota-setup -g -a codex
```

或直接让 AI 读取该 SKILL.md：“请按 codex-quota-setup 安装 Mac 版并完成原图标启动回归，不中断正在运行的会话。”仅下载仓库不会保证所有 AI 自动加载 Skill；安装后的后台运行不依赖 AI。
