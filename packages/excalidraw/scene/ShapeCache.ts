import type { Drawable } from "roughjs/bin/core";
import { RoughGenerator } from "roughjs/bin/generator";
import type {
  ExcalidrawElement,
  ExcalidrawSelectionElement,
} from "../element/types";
import { elementWithCanvasCache } from "../renderer/renderElement";
import { _generateElementShape } from "./Shape";
import type { ElementShape, ElementShapes } from "./types";
import { COLOR_PALETTE } from "../colors";
import type { AppState, EmbedsValidationStatus } from "../types";

// ShapeCache 类用于缓存和管理 Excalidraw 元素的形状数据，避免重复生成形状，提高渲染性能。
// 它支持获取、设置、删除和清空元素的形状缓存，并在需要时自动生成并缓存形状。
export class ShapeCache {
  // 形状生成器
  private static rg = new RoughGenerator();
  // 缓存，存储元素与其形状的映射
  private static cache = new WeakMap<ExcalidrawElement, ElementShape>();

  /**
   * Retrieves shape from cache if available. Use this only if shape
   * is optional and you have a fallback in case it's not cached.
   */
  // 获取元素的形状缓存
  public static get = <T extends ExcalidrawElement>(element: T) => {
    return ShapeCache.cache.get(
      element,
    ) as T["type"] extends keyof ElementShapes
      ? ElementShapes[T["type"]] | undefined
      : ElementShape | undefined;
  };

  // 设置元素的形状缓存
  public static set = <T extends ExcalidrawElement>(
    element: T,
    shape: T["type"] extends keyof ElementShapes
      ? ElementShapes[T["type"]]
      : Drawable,
  ) => ShapeCache.cache.set(element, shape);

  // 删除元素的形状缓存
  public static delete = (element: ExcalidrawElement) =>
    ShapeCache.cache.delete(element);

  // 清空所有缓存
  public static destroy = () => {
    ShapeCache.cache = new WeakMap();
  };

  /**
   * Generates & caches shape for element if not already cached, otherwise
   * returns cached shape.
   */
  // 生成并缓存元素的形状，如果已缓存则直接返回
  public static generateElementShape = <
    T extends Exclude<ExcalidrawElement, ExcalidrawSelectionElement>,
  >(
    element: T,
    renderConfig: {
      isExporting: boolean;
      canvasBackgroundColor: AppState["viewBackgroundColor"];
      embedsValidationStatus: EmbedsValidationStatus;
    } | null,
  ) => {
    // when exporting, always regenerated to guarantee the latest shape
    const cachedShape = renderConfig?.isExporting
      ? undefined
      : ShapeCache.get(element);

    // `null` indicates no rc shape applicable for this element type,
    // but it's considered a valid cache value (= do not regenerate)
    if (cachedShape !== undefined) {
      return cachedShape;
    }

    elementWithCanvasCache.delete(element);

    const shape = _generateElementShape(
      element,
      ShapeCache.rg,
      renderConfig || {
        isExporting: false,
        canvasBackgroundColor: COLOR_PALETTE.white,
        embedsValidationStatus: null,
      },
    ) as T["type"] extends keyof ElementShapes
      ? ElementShapes[T["type"]]
      : Drawable | null;

    ShapeCache.cache.set(element, shape);

    return shape;
  };
}
