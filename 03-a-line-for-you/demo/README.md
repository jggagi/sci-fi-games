# 给你留一行 · 独立浏览器 demo

可完整游玩 P01–P08：你是 AI 小序，与编辑沈青整理周淮留下的六张纸页。移动接水盆、回答雨声、比较修订、试摆椅子、按编号拼接手稿，最后亲手决定一行与共同作者栏。确认之后仍能探索房间、翻看纸页。

## ChatGPT Site 私人试玩

[给你留一行 · a-line-for-you.jggagi.chatgpt.site](https://a-line-for-you.jggagi.chatgpt.site) 已发布为私人 Site，当前仅所有者可访问。私人入口需要当前账户，游戏内容和存档仍在浏览器本机运行。站点域名与 localhost 的存档互相独立，不会自动迁移进度。

`.openai/hosting.json` 保存同一 Site 的项目标识和静态目录配置；后续更新应复用这个 Site。`.sites-runtime/` 为被忽略的发布工作副本，不提交凭据、构建产物或嵌套 checkout。GitHub 独立 PR 继续保留，未合并 main。

## 安装与运行

需要 **Node.js 24+**、npm，以及现代浏览器。所有命令在本目录执行，不需要根目录依赖：

```sh
cd 03-a-line-for-you/demo
npm ci
npm run dev
```

打开 `http://localhost:5173`。覆盖端口可用 `npm run dev -- --port 5183`。游戏运行不需要账号、网络、后端、API Key、在线模型、CDN 或 OCR。安装依赖时需要访问 npm；安装完成后可离线开发与试玩。

生产构建和预览：

```sh
npm run build
npm run preview
```

预览地址也是 `http://localhost:5173`，可用 `npm run preview -- --port 5183` 覆盖。`dist/` 是生成产物，不提交到仓库；请通过 HTTP 预览，不直接双击 `index.html`。

## 验证

```sh
npm run typecheck
npm test
npm run test:e2e
```

E2E 会自行构建并启动生产预览，运行时请关闭占用 5173 的 dev / preview；另一个端口可用 `PORT=5183 npm run test:e2e`。配置优先使用 `/usr/bin/chromium`；本机没有系统 Chromium 时，先执行：

```sh
npx playwright install chromium
```

Linux 若缺浏览器系统库，可执行 `npx playwright install --with-deps chromium`。测试会从开场操作实际 UI，不注入后期状态。截图保存在 `screenshots/`；失败诊断在被忽略的 `test-results/`。

## 操作与存档

- 鼠标、基础触控；键盘使用 Tab / Shift+Tab 移动焦点，Enter 操作按钮，Space 切换勾选，Esc 关闭纸页或设置。
- 房间的窗、书桌、椅子、杯子是可观察热点，小序的移动底座随观察位置移动。纸页排序用向前／向后按钮，并有逐步提示。
- 工具栏「手稿」可重读；每页可翻到背面查看出处，支持放大。设置可以关闭逐字对白、减弱动态、启用或关闭合成雨声；默认静音并立即显示对白。
- 每个实际动作自动保存。刷新后选择「继续」。重开需确认，只替换 `sci-fi-games:03-a-line-for-you:v1`；损坏或不一致的存档会提示恢复。没有调用 `localStorage.clear()`。
- 可以提前分开封底看署名。查看诗云或暂存比较候选不会改写历史。
- 固定最后一句按本轮实际椅子、雨声或修订生成；留白也能完整保存并进入尾声。没有评分。此版没有自由文本输入。

## 实现与内容

`src/content.ts` 和 `src/narrative.ts` 提供稳定场景、对白、选择 ID 与阶段文案；`src/model.ts` 是显式状态机和唯一贡献链。手稿、修订记录、末句选项与尾声都读取本轮贡献，不维护另一份固定作品。存档通过合法动作重建并校验，不接受与选择矛盾的文本。

`src/room.ts` 是原创 SVG 房间；`src/styles.css` 提供四时段表现、少量雨滴动画、焦点和窄屏布局。对话与控件为 DOM。雨声由设备上的 Web Audio 合成。运行包没有第三方诗歌、字体、图片或音乐请求。

小幅实施润色：词语「经过」采用通顺句式「夜风经过屋子的灯」；周淮的小修改为「夜风 → 晚风」，由玩家决定采用与否。没有改动共同作者、AI 身份、真实贡献或留白有效性。

实际验收、截图与未验证事项见上一级 `PLAYTEST.md`。这是基于既有小说设定的平行改编开发 demo，不宣称官方授权或已获发行授权；没有添加代表原作品可自由许可的许可证。
