[English](README.md) | [简体中文](README_zh-CN.md)

# RLM 轨迹可视化工具

[面向 ARC-AGI-3 的长程 LLM Agent 后训练](https://github.com/yuran986/arc-agi-3-agent-post-training)的配套分析工具。Viewer 从 RLM 执行日志和 ARC-AGI-3 frame stream 中重建长程 Agent 行为，将 reasoning、代码执行、动作、视觉状态和耗时对齐，用于 trajectory-level 诊断。

## 概述

Aggregate reward curve 无法区分真实任务学习和利用 shaping signal 的重复动作。本工具使二者可以被直接检查。它同时支持实时环境监控和离线分析，并保留从运行元数据、completion、iteration、code block、action event 到动作后 frame 的完整层级。

<p align="center">
  <img src="docs/images/viewer-demo.gif" alt="RLM 轨迹可视化演示，展示 ARC-AGI-3 离线回放和动作级轨迹检查" width="100%">
</p>

<p align="center"><em>加载配套日志、拖动 slider 查看环境状态、切换到关联的 RLM 轨迹，再展开 iteration 检查其中实际执行的动作。</em></p>

## 支持的分析

| 分析问题 | Viewer 提供的证据 |
|---|---|
| Reward 是否对应真实任务进展？ | 环境状态、`levels_completed`、动作序列与 frame transition |
| Policy 真正执行了动作，还是只进行了推理？ | 每轮实际动作数和 completion step |
| 某个 action 改变了什么？ | Action 名称/坐标与动作后 frame 对齐 |
| 模型是否正确使用 observation？ | 同一 iteration 中的模型回复、REPL 代码、stdout/stderr 与画面变化 |
| 长 rollout 在哪里失败？ | 按 completion 分组的 timeline、耗时、final answer 与终局状态 |
| 问题是否来自某一条日志流？ | 根据时间戳配对 RLM 和环境 frame JSONL |

## 界面

<details>
<summary><strong>实时与离线 frame 回放</strong></summary>

<p align="center">
  <img src="docs/images/offline-playback.png" alt="ARC-AGI-3 实时监控和带时间轴 slider 的离线 frame 回放" width="100%">
</p>

实时 frame 与录制 frame 使用相同的渲染尺寸。Offline slider 可以查看任意记录 step 对应的状态、动作、坐标和关卡进度。

</details>

<details>
<summary><strong>Iteration 与动作级检查</strong></summary>

<p align="center">
  <img src="docs/images/action-level-inspection.png" alt="展开的 RLM iteration，展示动作数、Action Frames 和 renderer 输出" width="100%">
</p>

所有 iteration 默认折叠，并汇总 completion step、实际动作数、depth、状态与耗时。展开后可查看模型回复、REPL 代码、各个 Action Frame、输出/错误流、递归调用和 final answer。

</details>

## 安装

```bash
git clone https://github.com/yuran986/Trajectoryvisualizationwebpage.git
cd Trajectoryvisualizationwebpage
npm install
npm run dev
```

打开 Vite 输出的本地地址。验证 production build：

```bash
npm run build
```

## 输入数据

Viewer 读取 newline-delimited JSON，每行包含一个对象。它识别两条互补的数据流：

| 数据流 | Record 类型 | 必需或常用字段 |
|---|---|---|
| RLM 执行日志 | `metadata`、`iteration` | 模型/后端设置、prompt、response、`code_blocks`、执行结果、completion/iteration ID |
| ARC 环境日志 | `arg_agi_frame` | `timestamp`、`step`、`state`、`levels_completed`、`action`、`action_xy`、`frame` |

Frame payload 应包含数字颜色索引网格，常见形状为 `[1, height, width]`。解析器兼容多种历史 action-result 布局，以支持早期实验日志。

### 加载方式

- **Upload Files：** 完全在浏览器中解析一个或多个本地 `.jsonl`；应用不会将其上传到后端。
- **Load Project JSONLs：** 通过 Vite `import.meta.glob` 读取 `jsonl/` 中的开发样例。这些文件会成为构建产物，不应在公开部署中放入私有或大型实验日志。
- **Live Monitor：** 在本地开发环境中每秒轮询一次最新 frame JSON 快照。

## 轨迹对齐

选中 RLM 日志后，Viewer 会选择运行时间戳最接近的 frame 日志。在每个 code block 内，动作后画面按以下顺序恢复：

1. 当前 logger 输出的结构化 `action_events`；
2. renderer 输出中的 step ID，并与配套 frame 日志匹配；
3. REPL locals 中保留的 action-result 对象；
4. 最后从 stdout/code 中解析旧版 `make_action(...)` payload。

该优先级在兼容旧日志的同时避免重复计数。每轮 action 摘要也优先使用结构化事件，必要时回退至 renderer step 和静态调用。

## Live Monitor 集成

Live mode 目前是本地研究集成，而非可移植的服务端 API。如果要在其他工作区使用，需要修改：

- `src/app/App.tsx` 中的 `LIVE_FEED_URL`，使其指向生成的快照；
- 如果快照位于仓库之外，修改 `vite.config.ts` 中的 `server.fs.allow`。

快照可以直接是一条 `arg_agi_frame` record，也可以在 `record` 字段中包含该记录。离线上传无需文件系统配置，是更可移植的使用路径。

## 仓库结构

```text
.
├── docs/images/                    # README demo 与界面图片
├── jsonl/                          # 本地样例；Git 忽略
├── src/app/App.tsx                 # 文件配对与实时监控编排
├── src/app/components/
│   ├── ArgAgiFrameViewer.tsx       # 网格渲染与 frame 回放
│   ├── FileUpload.tsx              # JSONL 读取与运行选择
│   ├── MetadataView.tsx            # 运行级元数据
│   └── TrajectoryTimeline.tsx      # Iteration、动作与 REPL 轨迹
└── vite.config.ts                  # 构建与本地文件访问配置
```

## 局限性

- Schema adapter 具有一定容错能力，但仍主要面向配套 RLM/ARC 集成。
- 大型完整 frame 历史会占用较多构建空间和浏览器内存。
- Live feed 依赖本地配置路径和 Vite 开发服务器。
- 本工具用于轨迹审计，不负责编辑日志、汇总 benchmark 指标，也不能替代可复现的 evaluation harness。

## 来源与致谢

本 Viewer 是 ARC-AGI-3 Agent 后训练研究的轨迹分析组件。初始界面使用 [Figma Make](https://www.figma.com/design/cYp0fr79jqgMOx5XeJgYkk/Trajectory-Visualization-Web-Page) 制作原型。第三方声明见 [ATTRIBUTIONS.md](ATTRIBUTIONS.md)。
