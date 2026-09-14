# Atlas 场景绘图 · SillyTavern 第三方扩展

专用于 Atlas Cloud 的场景插图扩展，默认模型 `z-image/turbo`。不依赖原生生图扩展、Extras 或服务端插件。适配 SillyTavern 1.14+ 的消息媒体附件接口；建议使用当前稳定版及新版 Chrome / Edge。

## 1.0.1 修复

- 修复部分手机浏览器缺少 AbortSignal.timeout、AbortSignal.any、throwIfAborted 导致余额与绘图失败的问题。
- 移除图片文件名对 HTTPS 环境下 crypto.randomUUID 的依赖。
- 修复手机端按钮宽度被酒馆样式压缩、文字竖排的问题。
- 增加旧版浏览器 API 环境回归测试，共 14 项测试通过。手机实际显示仍需设备验证。

## 安装

### 从 GitHub 安装（推荐）

在 SillyTavern 的扩展管理中点击“安装扩展”，粘贴以下仓库地址并安装，然后刷新页面：

https://github.com/Entropy2077-axe/SillyTavern-Atlas-Scene

仓库根目录直接包含 `manifest.json`、`index.js`、`atlas.js`、`style.css`，无需构建或安装 npm 依赖。

### 本地安装

1. 解压压缩包，将整个 `atlas-scene` 文件夹复制到 SillyTavern 的 `data/<你的用户目录>/extensions/` 中。默认用户通常是 `default-user`。
2. 确认路径是 `data/default-user/extensions/atlas-scene/manifest.json`，不要多套一层目录。也可安装到 `public/scripts/extensions/third-party/atlas-scene/` 供所有用户使用。
3. 刷新酒馆页面，在扩展设置中展开 **Atlas 场景绘图**。
4. 填入自己的 Atlas Key，点击“查询余额”验证，然后启用“自动绘图”。Key 仅保存在当前页面内存，刷新后需要重新填写；发布包不包含测试 Key。

酒馆“从 URL 安装”请使用上面的 Git 仓库地址，不能直接填本机 ZIP 路径。

## 使用

- **角色回复完成后**：每条新角色回复完成后，根据最近 6 条消息生成场景图，保存为该回复的图片附件。默认使用当前聊天模型额外提炼一次英文提示词；可以关闭。群聊按每条角色回复生图。
- **发送消息后立即绘图**：发送后立即根据当前上下文绘图，附在用户消息下。此模式直接使用场景文本，不额外调用聊天模型，以免与正常回复竞争。
- **生成当前场景**：对最后一条消息手动生图，也可用于失败重试或生成另一个版本。
- **停止 / 清空队列**：停止本地请求和队列；Atlas 已接收的任务可能仍执行并计费。
- 可配置模型、尺寸、上下文消息数、固定角色外观与风格。其他模型必须接受同样的 Atlas 文生图参数；仅 z-image/turbo 已实测。
- 重新生成的不同回复可以产生新图。自动绘图跳过开场白和扩展生成的消息。切换聊天、编辑或删除目标消息后，不会把旧任务结果写入新聊天。

图片通过酒馆 `/api/images/upload` 保存为本地文件，随聊天记录显示；Atlas 生成任务为串行队列，事件监听不会等待远程生图，因此不会阻塞聊天事件流程。图片提示词存于附件标题和 `extra.atlas_scene`，可随聊天导出。

## 数据与计费

场景文本或提炼后的提示词会发给 Atlas；启用提示词提炼时，当前酒馆聊天模型也会收到场景材料并产生一次额外文本请求。固定外观与风格是全局设置，可按角色手动调整。不要在准备发送的场景材料中放入密钥。

Key 使用标准 Bearer 认证，仅发往固定域名 `api.atlascloud.ai`，不写入设置、聊天、源码或日志。余额按官方接口的 `available.value` 与 `available.currency` 展示。

## 排错

- 401：检查 Key；402：检查余额；429：等待后手动重试。
- 网络错误：确认浏览器能访问 Atlas，检查代理、广告拦截器及浏览器控制台。已验证 Atlas 允许 localhost 来源的 CORS 预检；实际部署环境仍取决于浏览器与网络配置。
- 提炼失败：先确认聊天 API 可正常回复，或关闭提示词提炼。
- 超时：本地轮询最多 180 秒，不自动再次提交付费任务；手动重试可能产生新的费用。
- 停止时正在进行的酒馆提示词提炼不会被全局打断，但返回后不会继续提交绘图。

## 验证记录（2026-09-14）

- Atlas 余额查询成功，绘图 CORS 预检成功。
- 用 z-image/turbo 完成一次真实异步绘图，1024×1024，已取得并检查测试图片。
- 实测余额从 22.161575 USD 变为 22.156575 USD，本次差额 0.005 USD；这不是未来价格承诺。
- 自动化测试覆盖提交与轮询、失败、鉴权错误、取消、超时、上下文截断、重复事件、聊天切换、目标消息编辑、开场白过滤与用户触发模式。
- 执行 `npm test` 可运行测试，无需安装依赖。
- 当前工作区没有实际运行的 SillyTavern 实例，因此尚未完成真实酒馆浏览器内端到端验收；事件和附件流程已对照稳定分支源码并以模拟上下文验证。

## 接口与参考

- [Atlas z-image/turbo 官方模型页](https://www.atlascloud.ai/models/z-image/turbo)：POST `/api/v1/model/generateImage`、GET `/api/v1/model/prediction/{id}`。
- [Atlas 余额接口](https://api.atlascloud.ai/public/v1/balance)：GET，Bearer 认证。
- [SillyTavern 扩展开发文档](https://docs.sillytavern.app/for-contributors/writing-extensions/)。
- [SillyTavern 原生生图源码](https://github.com/SillyTavern/SillyTavern/blob/release/public/scripts/extensions/stable-diffusion/index.js)：参考消息媒体附件集成方式；本扩展独立实现 Atlas 调用。
