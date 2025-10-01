# Edgeless 右键平移功能

## 背景

- 需求：在 Edgeless 画布中，支持“按住鼠标右键进行平移”，释放后恢复之前的工具。
- 目标：与现有“中键临时平移”兼容，并提供设置项在中键/右键之间切换。

## 交互说明

- 中键模式（默认）：按住中键开始平移，松开恢复原工具。
- 右键模式（可选）：按住右键开始平移；拖拽期间屏蔽原生右键菜单；松开恢复原工具。
- 设置位置：设置 > Woodglass 功能 > 画布平移按键（中键/右键）。

## 主要改动

- Pan 工具逻辑

  - 文件：blocksuite/affine/gfx/pointer/src/tools/pan-tool.ts
  - 变化：
    - 读取 `edgelessPanActivation`（'middle' | 'right'）。
    - 右键路径采用“同步切换 PanTool”，避免 dragStart 触发前的竞态问题。
    - 拖拽期间监听 `contextmenu` 并 `preventDefault()`，避免原生菜单打断。

- 设置 Schema

  - 新增字段 `edgelessPanActivation`：
    - blocksuite/affine/shared/src/services/editor-setting-service.ts
    - packages/frontend/core/src/modules/editor-setting/schema.ts

- 设置 UI
  - 位置：packages/frontend/core/src/desktop/dialogs/setting/general-setting/woodglass/index.tsx
  - 说明：新增“画布平移按键”菜单（中键/右键）。

## 验证步骤

1. 打开设置 > Woodglass 功能，将“画布平移按键”设为“鼠标右键”。
2. 在 Edgeless 画布：
   - 按住右键并拖动 → 画布平移。
   - 拖拽期间右键菜单不会弹出；松开右键 → 恢复之前工具。
3. 切回“鼠标中键”验证默认行为不变。

## 兼容性与注意事项

- 编辑态（光标在文本/输入框内）允许右键菜单；平移只在画布空白区有效。
- Linux 中键粘贴开关（enableMiddleClickPaste）不受影响。
- 若某些浏览器插件/系统层拦截右键，可能影响拖拽；确保在 Edgeless 空白处操作。

## 后续优化（可选）

- 为右键模式增加工具栏提示或状态徽标。
- 在 Edgeless 工具栏中提供快速切换按钮。
