import type { StaticCanvasAppState, AppState } from "../types";

import type { StaticCanvasRenderConfig } from "../scene/types";

import { THEME, THEME_FILTER } from "../constants";

// 用于在画布上绘制一个填充的圆形
export const fillCircle = (
  context: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  stroke = true,
) => {
  context.beginPath();
  context.arc(cx, cy, radius, 0, Math.PI * 2);
  context.fill();
  if (stroke) {
    context.stroke();
  }
};

// 获取规范化后的画布宽高
export const getNormalizedCanvasDimensions = (
  canvas: HTMLCanvasElement,
  scale: number,
): [number, number] => {
  // 基于画布宽度进行计算时，应该使用规范化后的宽度
  return [canvas.width / scale, canvas.height / scale];
};

// 初始化画布并设置相关属性
export const bootstrapCanvas = ({
  canvas,
  scale,
  normalizedWidth,
  normalizedHeight,
  theme,
  isExporting,
  viewBackgroundColor,
}: {
  canvas: HTMLCanvasElement;
  scale: number;
  normalizedWidth: number;
  normalizedHeight: number;
  theme?: AppState["theme"];
  isExporting?: StaticCanvasRenderConfig["isExporting"];
  viewBackgroundColor?: StaticCanvasAppState["viewBackgroundColor"];
}): CanvasRenderingContext2D => {
  const context = canvas.getContext("2d")!;

  // 重置画布的变换矩阵
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(scale, scale);

  // 如果是导出模式且主题为暗色模式，设置滤镜
  if (isExporting && theme === THEME.DARK) {
    context.filter = THEME_FILTER;
  }

  // 绘制背景
  if (typeof viewBackgroundColor === "string") {
    const hasTransparence =
      viewBackgroundColor === "transparent" ||
      viewBackgroundColor.length === 5 || // #RGBA
      viewBackgroundColor.length === 9 || // #RRGGBBA
      /(hsla|rgba)\(/.test(viewBackgroundColor);
    if (hasTransparence) {
      context.clearRect(0, 0, normalizedWidth, normalizedHeight);
    }
    context.save();
    context.fillStyle = viewBackgroundColor;
    context.fillRect(0, 0, normalizedWidth, normalizedHeight);
    context.restore();
  } else {
    context.clearRect(0, 0, normalizedWidth, normalizedHeight);
  }

  return context;
};
