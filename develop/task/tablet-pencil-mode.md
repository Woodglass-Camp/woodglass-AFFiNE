# Tablet Pencil 模式 & 右键平移改造

## 背景

- 目标 1：在 Edgeless 模式下支持“平板手写笔（pencil）/手指（palm）分流”，实现防手掌误触。
- 目标 2：可配置“画布平移”触发按键（默认中键，可切换为右键）。

## 功能设计

- 平板 Pencil 模式（Edgeless 专用）

  - 手指（pointerType=touch）：仅允许画布平移；禁止元素选中/点击。
  - 手写笔（pointerType=pen）：强制切换到画笔工具（BrushTool），只用于绘制；禁止笔进行其他点击操作。
  - 通过设置开关启用/关闭，默认关闭。

- 画布平移按键（可选：中键/右键）
  - 默认行为：按住中键临时切换为 Pan 工具，释放还原；
  - 新增配置：可切换为“右键按住平移”。已修复右键切换的时序竞态，并屏蔽原生 contextmenu。

## 主要改动

- 设置 Schema

  - blocksuite/affine/shared/src/services/editor-setting-service.ts
    - 新增 `edgelessTabletPencilMode: boolean`（默认 false）
    - 新增 `edgelessPanActivation: 'middle' | 'right'`（默认 'middle'）
  - packages/frontend/core/src/modules/editor-setting/schema.ts 同步字段。

- 设置 UI

  - Woodglass 功能面板：packages/frontend/core/src/desktop/dialogs/setting/general-setting/woodglass/index.tsx
    - “平板 Pencil 模式”开关（Switch）。
    - “画布平移按键”选择（中键/右键）。

- 平板 Pencil 模式实现

  - 新增 Widget 包：blocksuite/affine/widgets/tablet-pencil-mode
    - package.json（exports: "." 与 "./view"）
    - src/index.ts：注册 `affine-tablet-pencil-mode-widget`，不渲染 UI，仅挂事件：
      - touch/pointerDown → 记录坐标触发单指画布平移，并阻止默认；
      - touch/pointerMove → 单指执行自定义平移，双指记录手势起始距离/缩放并持续以指尖中心计算缩放；
      - touch/click → 阻止默认（避免选中）；
      - pen 指针保留用户当前工具，隔离手指触摸行为，不再强制切换画笔。
    - src/view.ts + src/effects.ts：Edgeless 视图注册。
  - 在内置扩展中加载：blocksuite/affine/all/src/extensions/view.ts 引入 `TabletPencilModeViewExtension`。
  - 依赖登记：blocksuite/affine/all/package.json 增加 `@blocksuite/affine-widget-tablet-pencil-mode`。

- 右键平移改造
  - Pan 工具：blocksuite/affine/gfx/pointer/src/tools/pan-tool.ts
    - 读取设置 `edgelessPanActivation`：'middle' | 'right'；
    - 右键路径改为“同步切换 PanTool”，避免 dragStart 前切换竞态；
    - 拖拽期间屏蔽原生右键菜单，pointerup 释放后恢复；
    - 中键行为保留不变。

## 使用说明

1. 设置 > Woodglass 功能：
   - 开启“平板 Pencil 模式”：Edgeless 下，手指仅平移、手写笔按当前工具操作。
   - “画布平移按键”：中键/右键二选一（默认中键）。
2. Edgeless 中验证：
   - 手指单指拖动 → 画布平移；
   - 手写笔按下/拖动 → 按当前工具正常操作（橡皮/画笔等都可用）；
   - 双指缩放 → Widget 内自定义手势，以触点中心缩放并保持停留位置；
   - 右键模式下按住右键拖动 → 平移；释放 → 恢复前工具。

## 开发/调试要点

- HMR/端口：默认 dev 端口为 8080；
- 剪贴板：建议 https 或 localhost 访问以启用 `navigator.clipboard`；
  - 非安全上下文会导致剪贴板事件不挂载。

## 后续规划（可选）

- “手写笔对应工具”可配置（画笔/高亮/橡皮）。
- 安卓部分机型笔上报 touch：增加压力值兜底（pressure > 0 视为 pen）。
- Edgeless 工具栏显示“Pencil 模式”状态与快捷开关。
