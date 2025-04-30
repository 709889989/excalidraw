// 判断是否有元素被选中
// isSomeElementSelected
// 获取选区内的所有元素
// getElementsWithinSelection
// 获取选中元素的共有属性
// getCommonAttributeOfSelectedElements
// 获取所有被选中的元素
// getSelectedElements
// 获取目标元素
// getTargetElements
export {
  isSomeElementSelected,
  getElementsWithinSelection,
  getCommonAttributeOfSelectedElements,
  getSelectedElements,
  getTargetElements,
} from "./selection";

// 计算滚动中心点
export { calculateScrollCenter } from "./scroll";

// 判断元素是否有背景
// hasBackground
// 判断元素是否有描边宽度
// hasStrokeWidth
// 判断元素是否有描边样式
// hasStrokeStyle
// 判断元素是否可以有箭头
// canHaveArrowheads
// 判断元素是否可以更改圆角
// canChangeRoundness
// 获取指定位置的元素
// getElementAtPosition
// 获取指定位置的所有元素
// getElementsAtPosition
export {
  hasBackground,
  hasStrokeWidth,
  hasStrokeStyle,
  canHaveArrowheads,
  canChangeRoundness,
  getElementAtPosition,
  getElementsAtPosition,
} from "./comparisons";

// 获取归一化的缩放比例
export { getNormalizedZoom } from "./zoom";
