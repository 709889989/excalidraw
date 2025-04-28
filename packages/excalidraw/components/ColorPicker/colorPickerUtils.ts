import type { ExcalidrawElement } from "../../element/types";
import { atom } from "jotai";
import type { ColorPickerColor, ColorPaletteCustom } from "../../colors";
import { MAX_CUSTOM_COLORS_USED_IN_CANVAS } from "../../colors";

/**
 * 根据颜色值获取颜色名称和色阶
 * @param palette - 颜色调色板
 * @param color - 要查找的颜色值
 * @returns 包含颜色名称和色阶的对象，如果未找到则返回null
 */
export const getColorNameAndShadeFromColor = ({
  palette,
  color,
}: {
  palette: ColorPaletteCustom;
  color: string;
}): {
  colorName: ColorPickerColor;
  shade: number | null;
} | null => {
  for (const [colorName, colorVal] of Object.entries(palette)) {
    if (Array.isArray(colorVal)) {
      const shade = colorVal.indexOf(color);
      if (shade > -1) {
        return { colorName: colorName as ColorPickerColor, shade };
      }
    } else if (colorVal === color) {
      return { colorName: colorName as ColorPickerColor, shade: null };
    }
  }
  return null;
};

/**
 * 颜色选择器的快捷键绑定
 * 布局为3行5列的键盘矩阵
 */
export const colorPickerHotkeyBindings = [
  ["q", "w", "e", "r", "t"],
  ["a", "s", "d", "f", "g"],
  ["z", "x", "c", "v", "b"],
].flat();

/**
 * 判断颜色是否为自定义颜色
 * @param color - 要判断的颜色值
 * @param palette - 颜色调色板
 * @returns 如果是自定义颜色返回true，否则返回false
 */
export const isCustomColor = ({
  color,
  palette,
}: {
  color: string;
  palette: ColorPaletteCustom;
}) => {
  const paletteValues = Object.values(palette).flat();
  return !paletteValues.includes(color);
};

/**
 * 获取画布中最常用的自定义颜色
 * @param elements - 画布中的所有元素
 * @param type - 颜色类型：elementBackground 或 elementStroke
 * @param palette - 颜色调色板
 * @returns 按使用频率排序的自定义颜色数组，最多返回MAX_CUSTOM_COLORS_USED_IN_CANVAS个
 */
export const getMostUsedCustomColors = (
  elements: readonly ExcalidrawElement[],
  type: "elementBackground" | "elementStroke",
  palette: ColorPaletteCustom,
) => {
  const elementColorTypeMap = {
    elementBackground: "backgroundColor",
    elementStroke: "strokeColor",
  };

  const colors = elements.filter((element) => {
    if (element.isDeleted) {
      return false;
    }

    const color =
      element[elementColorTypeMap[type] as "backgroundColor" | "strokeColor"];

    return isCustomColor({ color, palette });
  });

  const colorCountMap = new Map<string, number>();
  colors.forEach((element) => {
    const color =
      element[elementColorTypeMap[type] as "backgroundColor" | "strokeColor"];
    if (colorCountMap.has(color)) {
      colorCountMap.set(color, colorCountMap.get(color)! + 1);
    } else {
      colorCountMap.set(color, 1);
    }
  });

  return [...colorCountMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map((c) => c[0])
    .slice(0, MAX_CUSTOM_COLORS_USED_IN_CANVAS);
};

/**
 * 颜色选择器当前激活的section类型
 * - custom: 自定义颜色
 * - baseColors: 基础颜色
 * - shades: 色阶
 * - hex: HEX颜色选择器
 * - null: 无激活section
 */
export type ActiveColorPickerSectionAtomType =
  | "custom"
  | "baseColors"
  | "shades"
  | "hex"
  | null;
export const activeColorPickerSectionAtom =
  atom<ActiveColorPickerSectionAtomType>(null);

/**
 * 根据RGB值计算对比度颜色
 * @param r - 红色分量 (0-255)
 * @param g - 绿色分量 (0-255)
 * @param b - 蓝色分量 (0-255)
 * @returns 返回黑色或白色，取决于哪个对比度更高
 */
const calculateContrast = (r: number, g: number, b: number) => {
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 160 ? "black" : "white";
};

// inspiration from https://stackoverflow.com/a/11868398
/**
 * 根据背景色计算最佳对比度文本颜色
 * @param bgHex - 背景色HEX值
 * @param isCustomColor - 是否为自定义颜色
 * @returns 返回黑色或白色，取决于哪个对比度更高
 */
export const getContrastYIQ = (bgHex: string, isCustomColor: boolean) => {
  if (isCustomColor) {
    const style = new Option().style;
    style.color = bgHex;

    if (style.color) {
      const rgb = style.color
        .replace(/^(rgb|rgba)\(/, "")
        .replace(/\)$/, "")
        .replace(/\s/g, "")
        .split(",");
      const r = parseInt(rgb[0]);
      const g = parseInt(rgb[1]);
      const b = parseInt(rgb[2]);

      return calculateContrast(r, g, b);
    }
  }

  // TODO: ? is this wanted?
  if (bgHex === "transparent") {
    return "black";
  }

  const r = parseInt(bgHex.substring(1, 3), 16);
  const g = parseInt(bgHex.substring(3, 5), 16);
  const b = parseInt(bgHex.substring(5, 7), 16);

  return calculateContrast(r, g, b);
};

/**
 * 颜色选择器类型
 * - canvasBackground: 画布背景色
 * - elementBackground: 元素背景色
 * - elementStroke: 元素描边色
 */
export type ColorPickerType =
  | "canvasBackground"
  | "elementBackground"
  | "elementStroke";
