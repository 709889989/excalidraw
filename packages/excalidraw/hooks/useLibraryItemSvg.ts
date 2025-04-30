import { atom, useAtom } from "jotai";
import { useEffect, useState } from "react";
import { COLOR_PALETTE } from "../colors";
import { jotaiScope } from "../jotai";
import { exportToSvg } from "../../utils/export";
import type { LibraryItem } from "../types";

// SvgCache 类型，key 为 LibraryItem 的 id，value 为 SVGSVGElement
export type SvgCache = Map<LibraryItem["id"], SVGSVGElement>;

// 创建一个全局的 svg 缓存 atom
export const libraryItemSvgsCache = atom<SvgCache>(new Map());

// 导出库元素为 SVG 的异步函数
const exportLibraryItemToSvg = async (elements: LibraryItem["elements"]) => {
  return await exportToSvg({
    elements,
    appState: {
      exportBackground: false, // 不导出背景
      viewBackgroundColor: COLOR_PALETTE.white, // 背景色为白色
    },
    files: null,
    renderEmbeddables: false, // 不渲染嵌入对象
  });
};

// 自定义 hook，用于获取库元素的 SVG
export const useLibraryItemSvg = (
  id: LibraryItem["id"] | null,
  elements: LibraryItem["elements"] | undefined,
  svgCache: SvgCache,
): SVGSVGElement | undefined => {
  const [svg, setSvg] = useState<SVGSVGElement>();

  useEffect(() => {
    if (elements) {
      if (id) {
        // 尝试从缓存获取 svg
        const cachedSvg = svgCache.get(id);

        if (cachedSvg) {
          setSvg(cachedSvg);
        } else {
          // 如果缓存没有，则导出 svg 并保存到缓存
          (async () => {
            const exportedSvg = await exportLibraryItemToSvg(elements);
            exportedSvg.querySelector(".style-fonts")?.remove(); // 移除字体样式节点

            if (exportedSvg) {
              svgCache.set(id, exportedSvg);
              setSvg(exportedSvg);
            }
          })();
        }
      } else {
        // 没有 id（通常为画布选中项），直接导出 svg
        (async () => {
          const exportedSvg = await exportLibraryItemToSvg(elements);
          setSvg(exportedSvg);
        })();
      }
    }
  }, [id, elements, svgCache, setSvg]);

  return svg;
};

// 自定义 hook，用于操作 svg 缓存
export const useLibraryCache = () => {
  const [svgCache] = useAtom(libraryItemSvgsCache, jotaiScope);

  // 清空缓存
  const clearLibraryCache = () => svgCache.clear();

  // 从缓存中删除指定 id 的项
  const deleteItemsFromLibraryCache = (items: LibraryItem["id"][]) => {
    items.forEach((item) => svgCache.delete(item));
  };

  return {
    clearLibraryCache,
    deleteItemsFromLibraryCache,
    svgCache,
  };
};
