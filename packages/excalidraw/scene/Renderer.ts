import { isElementInViewport } from "../element/sizeHelpers";
import { isImageElement } from "../element/typeChecks";
import type {
  NonDeletedElementsMap,
  NonDeletedExcalidrawElement,
} from "../element/types";
import { renderInteractiveSceneThrottled } from "../renderer/interactiveScene";
import { renderStaticSceneThrottled } from "../renderer/staticScene";

import type { AppState } from "../types";
import { memoize, toBrandedType } from "../utils";
import type Scene from "./Scene";
import type { RenderableElementsMap } from "./types";

// Renderer 渲染器类，负责根据场景和视图参数筛选可渲染元素
export class Renderer {
  private scene: Scene;

  constructor(scene: Scene) {
    this.scene = scene;
  }

  // 获取可渲染元素和可见元素的方法，带缓存
  public getRenderableElements = (() => {
    // 获取视口内的元素
    const getVisibleCanvasElements = ({
      elementsMap,
      zoom,
      offsetLeft,
      offsetTop,
      scrollX,
      scrollY,
      height,
      width,
    }: {
      elementsMap: NonDeletedElementsMap;
      zoom: AppState["zoom"];
      offsetLeft: AppState["offsetLeft"];
      offsetTop: AppState["offsetTop"];
      scrollX: AppState["scrollX"];
      scrollY: AppState["scrollY"];
      height: AppState["height"];
      width: AppState["width"];
    }): readonly NonDeletedExcalidrawElement[] => {
      const visibleElements: NonDeletedExcalidrawElement[] = [];
      for (const element of elementsMap.values()) {
        if (
          isElementInViewport(
            element,
            width,
            height,
            {
              zoom,
              offsetLeft,
              offsetTop,
              scrollX,
              scrollY,
            },
            elementsMap,
          )
        ) {
          visibleElements.push(element);
        }
      }
      return visibleElements;
    };

    // 获取可渲染元素（过滤掉正在编辑的文本和未放置的图片）
    const getRenderableElements = ({
      elements,
      editingElement,
      pendingImageElementId,
    }: {
      elements: readonly NonDeletedExcalidrawElement[];
      editingElement: AppState["editingElement"];
      pendingImageElementId: AppState["pendingImageElementId"];
    }) => {
      const elementsMap = toBrandedType<RenderableElementsMap>(new Map());

      for (const element of elements) {
        if (isImageElement(element)) {
          if (
            // => 还未放置到画布上的图片（但已在 elements 数组中）
            pendingImageElementId === element.id
          ) {
            continue;
          }
        }

        // 不渲染正在编辑的文本元素（只在远程渲染）
        if (
          !editingElement ||
          editingElement.type !== "text" ||
          element.id !== editingElement.id
        ) {
          elementsMap.set(element.id, element);
        }
      }
      return elementsMap;
    };

    // 使用 memoize 缓存结果，避免重复计算
    return memoize(
      ({
        zoom,
        offsetLeft,
        offsetTop,
        scrollX,
        scrollY,
        height,
        width,
        editingElement,
        pendingImageElementId,
        // cache-invalidation nonce
        sceneNonce: _sceneNonce,
      }: {
        zoom: AppState["zoom"];
        offsetLeft: AppState["offsetLeft"];
        offsetTop: AppState["offsetTop"];
        scrollX: AppState["scrollX"];
        scrollY: AppState["scrollY"];
        height: AppState["height"];
        width: AppState["width"];
        editingElement: AppState["editingElement"];
        pendingImageElementId: AppState["pendingImageElementId"];
        sceneNonce: ReturnType<InstanceType<typeof Scene>["getSceneNonce"]>;
      }) => {
        // 获取未被删除的元素
        const elements = this.scene.getNonDeletedElements();

        // 过滤得到可渲染元素
        const elementsMap = getRenderableElements({
          elements,
          editingElement,
          pendingImageElementId,
        });

        // 获取视口内可见元素
        const visibleElements = getVisibleCanvasElements({
          elementsMap,
          zoom,
          offsetLeft,
          offsetTop,
          scrollX,
          scrollY,
          height,
          width,
        });

        return { elementsMap, visibleElements };
      },
    );
  })();

  // NOTE 不会销毁所有内容（scene, rc 等），因为可能不安全
  public destroy() {
    renderInteractiveSceneThrottled.cancel();
    renderStaticSceneThrottled.cancel();
    this.getRenderableElements.clear();
  }
}
