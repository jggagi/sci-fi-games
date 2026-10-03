# 星期六出发 · 独立浏览器 demo

一段关于轨道站退休交接、旧画与成年选择的有限叙事探索。实现 S01–S08、童年纸箱灯，以及长程观测、近程试航、本次暂不加入三个完整可玩尾声。此处是平行改编 demo，不宣称官方授权。

## ChatGPT Sites 试玩

[星期六出发 · ChatGPT Site](https://saturday-departure-jggagi.jggagi.chatgpt.site) 已以私密模式发布，仅站点所有者可访问。游戏本身没有新账号或后端。

Site 版使用新网址下的独立本地存档；原 localhost 存档保留，但不会自动迁移。原有三个尾声、设置与交互保持一致。

## 安装与运行

需要 Node.js **22.12+**（本次环境为 24.19.0）和 npm。首次安装开发依赖需要网络；游戏内容、图形和环境声全部在本地，不调用外部 API、字体 CDN 或素材站。

从仓库根目录执行：

```sh
cd 05-saturday-departure/demo
npm ci
npm run dev
```

浏览器打开 `http://localhost:5175`。覆盖端口或在本机局域网提供预览：

```sh
npm run dev -- --port 5185
npm run dev -- --host 0.0.0.0
```

生产构建与本地生产预览：

```sh
npm run build
npm run preview -- --host 127.0.0.1
```

预览默认端口同为 5175，也可以追加 `--port 5185`。构建使用相对资源路径，可单独提供 `dist/`；请通过 HTTP 静态服务运行，不直接双击 `index.html`。`dist/` 和 `node_modules/` 不提交。未部署公共网站。

## 操作

- 点击、触控轻点，或用 Tab 切换焦点、Enter / 空格操作按钮。原生单选组可用方向键选择；下拉框可用方向键。Esc 关闭资料或设置窗口。
- 「继续对话」按句推进。默认一次显示完整句子；可在「阅读与声音」开启逐字显示，再点一次可显示当前完整句子。
- 每页同时提供场景与明确的操作提示。读完对白并完成当页条件后，「继续」才可用；没有反应时间限制。
- 检修时核对 mrad / °C、选择 P2 接点，并实际开灯。固定点的第三项核对在 S06 交付时完成。工具交接是父子之间的关系动作。
- 旧画沿三道折痕逐步摊平，使用按钮即可。资料窗口提供清晰原图及普通文本转录；可以提前说出自己的推断。
- 童年先放小手电、开灯，再选雨星球或三个月亮。成年表格没有默认选项或代填姓名，需重新选安排、填写当前目的地 / 安排并确认。本人填写是对该次安排的记录，核准航段以旁边的具体项目条件为准。
- 三种尾声都要亲手保留旧画、检查该分支的物件、开舱内灯并确认当前航段。S08 可以继续开关灯、看窗外、查看旧画、新计划与验收单，自由停留。
- 所有通话都有字幕。默认静音，打开声音后播放本地合成环境声；音频没有额外线索。可减弱动态，关闭漂移与灯光动画。

## 存档

唯一 localStorage 键是 `sci-fi-games:05-saturday-departure:v1`。实际动作与填表草稿即时保存，刷新后在标题页选「继续上次的故事」。确认后的姓名、成年计划和目的地冻结，重复点击不会改写。

重开需要确认，只替换本故事的键。损坏或版本不兼容时明确显示恢复提示，并保留原记录，直到确认恢复为新游戏。不使用 `localStorage.clear()`。浏览器存储被禁用或写满时仍能游玩，界面会提示刷新可能丢失进度。不同端口属于不同浏览器来源，因此有各自存档。

## 验证命令

```sh
npm run typecheck
npm test
npm run build
npm run test:e2e
```

`npm test` 运行 16 项 Node 状态测试，覆盖两种童年目的地 × 三种成年计划、进度门槛、确认冻结、保存恢复与损坏隔离。使用 `node --import tsx` 直接运行，避免本次 Node 24 环境对 TS `--test` 仅输出文件级计数的情况。

E2E 包含 5 项真实浏览器测试，默认启动实际 **生产预览**，运行前必须 `npm run build`。测试会断言加载的是构建后的 `/assets/` 模块，避免把 dev 服务器算成生产测试。请停止其他占用 5175 的服务。

本机已有 `/usr/bin/chromium` 时自动使用它；也可指定现有浏览器：

```sh
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/path/to/chromium npm run test:e2e
```

没有系统 Chromium 时，安装 Playwright 浏览器再测试：

```sh
npx playwright install chromium
npm run test:e2e
```

Linux 缺系统库时可使用 `npx playwright install --with-deps chromium`，按系统权限要求执行。开发模式回放：

```sh
E2E_DEV=1 npm run test:e2e
```

测试只从真实「开始故事」走通三条路线；正常通关中只读取存档进行断言，不注入后期场景或预设结局。损坏恢复用例单独写入畸形 JSON。截图写入 `screenshots/`，失败临时 trace 写入被忽略的 `test-results/`。

## 文件与实现

| 文件 | 职责 |
| --- | --- |
| `src/content.ts` | 稳定 ID 的场景、对白、资料、航段条件与报告真源 |
| `src/state.ts` | 不可变 reducer、动作、进度条件、独立童年与成年字段、存档结构校验 |
| `src/storage.ts` | 独立命名空间，损坏与不可用状态处理 |
| `src/art.ts` | 原创 SVG 场景及同一张逐折展开的旧画 |
| `src/main.ts` / `style.css` | DOM 字幕、控件、对话窗口、响应布局与焦点 |
| `src/audio.ts` | 明确用户手势后才启动的原创 Web Audio 合成声 |
| `tests/` | 状态与真实浏览器测试 |

Vite + TypeScript，无运行时框架依赖，不接共享引擎。没有开放星图、战斗、经济或飞行模拟。具体实测结果、验收映射、截图与未验证项目见 [../PLAYTEST.md](../PLAYTEST.md)。
