// 删除所选元素
export { actionDeleteSelected } from "./actionDeleteSelected";
// 元素层级操作
// 元素向前、向后、置于最前、置于最后
export {
  actionBringForward,
  actionBringToFront,
  actionSendBackward,
  actionSendToBack,
} from "./actionZindex";
// 全选操作
export { actionSelectAll } from "./actionSelectAll";
// 复制选中元素
export { actionDuplicateSelection } from "./actionDuplicateSelection";
// 属性修改操作
// 修改元素笔触颜色、背景颜色、笔触宽度、填充样式、松散度、不透明度、
// 字体大小、更改字体、水平对齐方式、垂直对齐方式
export {
  actionChangeStrokeColor,
  actionChangeBackgroundColor,
  actionChangeStrokeWidth,
  actionChangeFillStyle,
  actionChangeSloppiness,
  actionChangeOpacity,
  actionChangeFontSize,
  actionChangeFontFamily,
  actionChangeTextAlign,
  actionChangeVerticalAlign,
} from "./actionProperties";
// 画布操作
// 背景颜色、清空画布、缩小、放大、重置、缩放适应、切换主题
export {
  actionChangeViewBackgroundColor,
  actionClearCanvas,
  actionZoomIn,
  actionZoomOut,
  actionResetZoom,
  actionZoomToFit,
  actionToggleTheme,
} from "./actionCanvas";
// 完成
export { actionFinalize } from "./actionFinalize";
// 导出操作
// 修改项目名称、导出背景设置、保存磁盘和加载场景
export {
  actionChangeProjectName,
  actionChangeExportBackground,
  actionSaveToActiveFile,
  actionSaveFileToDisk,
  actionLoadScene,
} from "./actionExport";
// 样式操作
// 复制和粘贴样式
export { actionCopyStyles, actionPasteStyles } from "./actionStyles";
// 菜单操作
// 切换画布菜单、编辑菜单和快捷键操作
export {
  actionToggleCanvasMenu,
  actionToggleEditMenu,
  actionShortcuts,
} from "./actionMenu";
// 分组操作
// 分组和取消分组
export { actionGroup, actionUngroup } from "./actionGroup";
// 导航操作
// 跳转到协作者位置。
export { actionGoToCollaborator } from "./actionNavigate";
// 库操作：将选中元素添加到库
export { actionAddToLibrary } from "./actionAddToLibrary";
// 对齐
// 顶部对齐、底部对齐、左对齐、右对齐、垂直居中对齐、水平居中对齐
export {
  actionAlignTop,
  actionAlignBottom,
  actionAlignLeft,
  actionAlignRight,
  actionAlignVerticallyCentered,
  actionAlignHorizontallyCentered,
} from "./actionAlign";
// 分布
// 水平分布、垂直分布
export {
  distributeHorizontally,
  distributeVertically,
} from "./actionDistribute";
// 翻转操作
// 水平和垂直翻转元素
export { actionFlipHorizontal, actionFlipVertical } from "./actionFlip";
// 剪贴板操作
// 复制、剪切、复制为 PNG 或 SVG
export {
  actionCopy,
  actionCut,
  actionCopyAsPng,
  actionCopyAsSvg,
  copyText,
} from "./actionClipboard";
// 模式切换操作
// 切换网格模式、禅模式、对象吸附模式
export { actionToggleGridMode } from "./actionToggleGridMode";
export { actionToggleZenMode } from "./actionToggleZenMode";
export { actionToggleObjectsSnapMode } from "./actionToggleObjectsSnapMode";

// 状态栏切换
export { actionToggleStats } from "./actionToggleStats";
// 文本绑定操作
// 绑定和解除文本绑定

export { actionUnbindText, actionBindText } from "./actionBoundText";
// 链接操作
export { actionLink } from "./actionLink";
// 元素锁定操作
// 实现元素锁定切换操作
export { actionToggleElementLock } from "./actionElementLock";
// 线性编辑器操作
// 实现线性编辑器切换操作。
export { actionToggleLinearEditor } from "./actionLinearEditor";
