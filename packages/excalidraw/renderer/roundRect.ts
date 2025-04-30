/**
 * https://stackoverflow.com/a/3368118
 * Draws a rounded rectangle using the current state of the canvas.
 * @param {CanvasRenderingContext2D} context
 * @param {Number} x The top left x coordinate
 * @param {Number} y The top left y coordinate
 * @param {Number} width The width of the rectangle
 * @param {Number} height The height of the rectangle
 * @param {Number} radius The corner radius
 * @param {String} strokeColor Optional, the stroke color
 */
/**
 * 中文说明：
 * 使用当前 canvas 状态绘制圆角矩形。
 * @param context Canvas 渲染上下文
 * @param x 左上角 x 坐标
 * @param y 左上角 y 坐标
 * @param width 矩形宽度
 * @param height 矩形高度
 * @param radius 圆角半径
 * @param strokeColor 可选，描边颜色
 */
export const roundRect = (
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  strokeColor?: string,
) => {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
  context.fill();
  if (strokeColor) {
    context.strokeStyle = strokeColor;
  }
  context.stroke();
};
