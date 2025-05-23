import rough from "roughjs/bin/rough";
import type {
  ExcalidrawElement,
  ExcalidrawFrameLikeElement,
  ExcalidrawTextElement,
  NonDeletedExcalidrawElement,
  NonDeletedSceneElementsMap,
} from "../element/types";
import type { Bounds } from "../element/bounds";
import { getCommonBounds, getElementAbsoluteCoords } from "../element/bounds";
import { renderSceneToSvg } from "../renderer/staticSvgScene";
import { arrayToMap, distance, getFontString, toBrandedType } from "../utils";
import type { AppState, BinaryFiles } from "../types";
import {
  DEFAULT_EXPORT_PADDING,
  FRAME_STYLE,
  FONT_FAMILY,
  SVG_NS,
  THEME,
  THEME_FILTER,
} from "../constants";
import { getDefaultAppState } from "../appState";
import { serializeAsJSON } from "../data/json";
import {
  getInitializedImageElements,
  updateImageCache,
} from "../element/image";
import {
  getElementsOverlappingFrame,
  getFrameLikeElements,
  getFrameLikeTitle,
  getRootElements,
} from "../frame";
import { newTextElement } from "../element";
import { type Mutable } from "../utility-types";
import { newElementWith } from "../element/mutateElement";
import { isFrameLikeElement, isTextElement } from "../element/typeChecks";
import type { RenderableElementsMap } from "./types";
import { syncInvalidIndices } from "../fractionalIndex";
import { renderStaticScene } from "../renderer/staticScene";
import { Fonts } from "../fonts";

const SVG_EXPORT_TAG = `<!-- svg-source:excalidraw -->`;

/**
 * 截断文本元素的内容以适应最大宽度。
 * @param element 文本元素
 * @param maxWidth 最大宽度
 * @returns 截断后的文本元素
 */
const truncateText = (element: ExcalidrawTextElement, maxWidth: number) => {
  if (element.width <= maxWidth) {
    return element;
  }
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  ctx.font = getFontString({
    fontFamily: element.fontFamily,
    fontSize: element.fontSize,
  });

  let text = element.text;

  const metrics = ctx.measureText(text);

  if (metrics.width > maxWidth) {
    // we iterate from the right, removing characters one by one instead
    // of bulding the string up. This assumes that it's more likely
    // your frame names will overflow by not that many characters
    // (if ever), so it sohuld be faster this way.
    for (let i = text.length; i > 0; i--) {
      const newText = `${text.slice(0, i)}...`;
      if (ctx.measureText(newText).width <= maxWidth) {
        text = newText;
        break;
      }
    }
  }
  return newElementWith(element, { text, width: maxWidth });
};

/**
 * When exporting frames, we need to render frame labels which are currently
 * being rendered in DOM when editing. Adding the labels as regular text
 * elements seems like a simple hack. In the future we'll want to move to
 * proper canvas rendering, even within editor (instead of DOM).
 * 在导出帧时，将帧标签作为文本元素添加。
 * @param elements 元素数组
 * @param opts 导出选项
 * @returns 添加标签后的元素数组
 */
const addFrameLabelsAsTextElements = (
  elements: readonly NonDeletedExcalidrawElement[],
  opts: Pick<AppState, "exportWithDarkMode">,
) => {
  const nextElements: NonDeletedExcalidrawElement[] = [];
  for (const element of elements) {
    if (isFrameLikeElement(element)) {
      let textElement: Mutable<ExcalidrawTextElement> = newTextElement({
        x: element.x,
        y: element.y - FRAME_STYLE.nameOffsetY,
        fontFamily: FONT_FAMILY.Helvetica,
        fontSize: FRAME_STYLE.nameFontSize,
        lineHeight:
          FRAME_STYLE.nameLineHeight as ExcalidrawTextElement["lineHeight"],
        strokeColor: opts.exportWithDarkMode
          ? FRAME_STYLE.nameColorDarkTheme
          : FRAME_STYLE.nameColorLightTheme,
        text: getFrameLikeTitle(element),
      });
      textElement.y -= textElement.height;

      textElement = truncateText(textElement, element.width);

      nextElements.push(textElement);
    }
    nextElements.push(element);
  }

  return nextElements;
};

/**
 * 获取帧渲染配置。
 * @param exportingFrame 当前导出的帧
 * @param frameRendering 当前帧渲染配置
 * @returns 新的帧渲染配置
 */
const getFrameRenderingConfig = (
  exportingFrame: ExcalidrawFrameLikeElement | null,
  frameRendering: AppState["frameRendering"] | null,
): AppState["frameRendering"] => {
  frameRendering = frameRendering || getDefaultAppState().frameRendering;
  return {
    enabled: exportingFrame ? true : frameRendering.enabled,
    outline: exportingFrame ? false : frameRendering.outline,
    name: exportingFrame ? false : frameRendering.name,
    clip: exportingFrame ? true : frameRendering.clip,
  };
};

/**
 * 为渲染准备元素。
 * @param params 元素、帧、渲染配置等
 * @returns 处理后的元素数组
 */
const prepareElementsForRender = ({
  elements,
  exportingFrame,
  frameRendering,
  exportWithDarkMode,
}: {
  elements: readonly ExcalidrawElement[];
  exportingFrame: ExcalidrawFrameLikeElement | null | undefined;
  frameRendering: AppState["frameRendering"];
  exportWithDarkMode: AppState["exportWithDarkMode"];
}) => {
  let nextElements: readonly ExcalidrawElement[];

  if (exportingFrame) {
    nextElements = getElementsOverlappingFrame(elements, exportingFrame);
  } else if (frameRendering.enabled && frameRendering.name) {
    nextElements = addFrameLabelsAsTextElements(elements, {
      exportWithDarkMode,
    });
  } else {
    nextElements = elements;
  }

  return nextElements;
};

/**
 * 导出为 Canvas。
 * @param elements 元素数组
 * @param appState 应用状态
 * @param files 二进制文件
 * @param options 导出选项
 * @param createCanvas 创建 Canvas 的函数
 * @param loadFonts 加载字体的函数
 * @returns Promise<HTMLCanvasElement>
 */
export const exportToCanvas = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: AppState,
  files: BinaryFiles,
  {
    exportBackground,
    exportPadding = DEFAULT_EXPORT_PADDING,
    viewBackgroundColor,
    exportingFrame,
  }: {
    exportBackground: boolean;
    exportPadding?: number;
    viewBackgroundColor: string;
    exportingFrame?: ExcalidrawFrameLikeElement | null;
  },
  createCanvas: (
    width: number,
    height: number,
  ) => { canvas: HTMLCanvasElement; scale: number } = (width, height) => {
    const canvas = document.createElement("canvas");
    canvas.width = width * appState.exportScale;
    canvas.height = height * appState.exportScale;
    return { canvas, scale: appState.exportScale };
  },
  loadFonts: () => Promise<void> = async () => {
    await Fonts.loadFontsForElements(elements);
  },
) => {
  // load font faces before continuing, by default leverages browsers' [FontFace API](https://developer.mozilla.org/en-US/docs/Web/API/FontFace)
  await loadFonts();

  const frameRendering = getFrameRenderingConfig(
    exportingFrame ?? null,
    appState.frameRendering ?? null,
  );

  const elementsForRender = prepareElementsForRender({
    elements,
    exportingFrame,
    exportWithDarkMode: appState.exportWithDarkMode,
    frameRendering,
  });

  if (exportingFrame) {
    exportPadding = 0;
  }

  const [minX, minY, width, height] = getCanvasSize(
    exportingFrame ? [exportingFrame] : getRootElements(elementsForRender),
    exportPadding,
  );

  const { canvas, scale = 1 } = createCanvas(width, height);

  const defaultAppState = getDefaultAppState();

  const { imageCache } = await updateImageCache({
    imageCache: new Map(),
    fileIds: getInitializedImageElements(elementsForRender).map(
      (element) => element.fileId,
    ),
    files,
  });

  renderStaticScene({
    canvas,
    rc: rough.canvas(canvas),
    elementsMap: toBrandedType<RenderableElementsMap>(
      arrayToMap(elementsForRender),
    ),
    allElementsMap: toBrandedType<NonDeletedSceneElementsMap>(
      arrayToMap(syncInvalidIndices(elements)),
    ),
    visibleElements: elementsForRender,
    scale,
    appState: {
      ...appState,
      frameRendering,
      viewBackgroundColor: exportBackground ? viewBackgroundColor : null,
      scrollX: -minX + exportPadding,
      scrollY: -minY + exportPadding,
      zoom: defaultAppState.zoom,
      shouldCacheIgnoreZoom: false,
      theme: appState.exportWithDarkMode ? THEME.DARK : THEME.LIGHT,
    },
    renderConfig: {
      canvasBackgroundColor: viewBackgroundColor,
      imageCache,
      renderGrid: false,
      isExporting: true,
      // empty disables embeddable rendering
      embedsValidationStatus: new Map(),
      elementsPendingErasure: new Set(),
    },
  });

  return canvas;
};

/**
 * 导出为 SVG。
 * @param elements 元素数组
 * @param appState 应用状态
 * @param files 二进制文件
 * @param opts 其他选项
 * @returns Promise<SVGSVGElement>
 */
export const exportToSvg = async (
  elements: readonly NonDeletedExcalidrawElement[],
  appState: {
    exportBackground: boolean;
    exportPadding?: number;
    exportScale?: number;
    viewBackgroundColor: string;
    exportWithDarkMode?: boolean;
    exportEmbedScene?: boolean;
    frameRendering?: AppState["frameRendering"];
  },
  files: BinaryFiles | null,
  opts?: {
    /**
     * if true, all embeddables passed in will be rendered when possible.
     */
    renderEmbeddables?: boolean;
    exportingFrame?: ExcalidrawFrameLikeElement | null;
    skipInliningFonts?: true;
  },
): Promise<SVGSVGElement> => {
  const frameRendering = getFrameRenderingConfig(
    opts?.exportingFrame ?? null,
    appState.frameRendering ?? null,
  );

  let {
    exportPadding = DEFAULT_EXPORT_PADDING,
    exportWithDarkMode = false,
    viewBackgroundColor,
    exportScale = 1,
    exportEmbedScene,
  } = appState;

  const { exportingFrame = null } = opts || {};

  const elementsForRender = prepareElementsForRender({
    elements,
    exportingFrame,
    exportWithDarkMode,
    frameRendering,
  });

  if (exportingFrame) {
    exportPadding = 0;
  }

  let metadata = "";

  // we need to serialize the "original" elements before we put them through
  // the tempScene hack which duplicates and regenerates ids
  if (exportEmbedScene) {
    try {
      metadata = await (
        await import("../data/image")
      ).encodeSvgMetadata({
        // when embedding scene, we want to embed the origionally supplied
        // elements which don't contain the temp frame labels.
        // But it also requires that the exportToSvg is being supplied with
        // only the elements that we're exporting, and no extra.
        text: serializeAsJSON(elements, appState, files || {}, "local"),
      });
    } catch (error: any) {
      console.error(error);
    }
  }

  const [minX, minY, width, height] = getCanvasSize(
    exportingFrame ? [exportingFrame] : getRootElements(elementsForRender),
    exportPadding,
  );

  // initialize SVG root
  const svgRoot = document.createElementNS(SVG_NS, "svg");
  svgRoot.setAttribute("version", "1.1");
  svgRoot.setAttribute("xmlns", SVG_NS);
  svgRoot.setAttribute("viewBox", `0 0 ${width} ${height}`);
  svgRoot.setAttribute("width", `${width * exportScale}`);
  svgRoot.setAttribute("height", `${height * exportScale}`);
  if (exportWithDarkMode) {
    svgRoot.setAttribute("filter", THEME_FILTER);
  }

  const offsetX = -minX + exportPadding;
  const offsetY = -minY + exportPadding;

  const frameElements = getFrameLikeElements(elements);

  let exportingFrameClipPath = "";
  const elementsMap = arrayToMap(elements);
  for (const frame of frameElements) {
    const [x1, y1, x2, y2] = getElementAbsoluteCoords(frame, elementsMap);
    const cx = (x2 - x1) / 2 - (frame.x - x1);
    const cy = (y2 - y1) / 2 - (frame.y - y1);

    exportingFrameClipPath += `<clipPath id=${frame.id}>
            <rect transform="translate(${frame.x + offsetX} ${
      frame.y + offsetY
    }) rotate(${frame.angle} ${cx} ${cy})"
          width="${frame.width}"
          height="${frame.height}"
          >
          </rect>
        </clipPath>`;
  }

  const fontFamilies = elements.reduce((acc, element) => {
    if (isTextElement(element)) {
      acc.add(element.fontFamily);
    }

    return acc;
  }, new Set<number>());

  const fontFaces = opts?.skipInliningFonts
    ? []
    : await Promise.all(
        Array.from(fontFamilies).map(async (x) => {
          const { fonts, metadata } = Fonts.registered.get(x) ?? {};

          if (!Array.isArray(fonts)) {
            console.error(
              `Couldn't find registered fonts for font-family "${x}"`,
              Fonts.registered,
            );
            return;
          }

          if (metadata?.local) {
            // don't inline local fonts
            return;
          }

          return Promise.all(
            fonts.map(
              async (font) => `@font-face {
        font-family: ${font.fontFace.family};
        src: url(${await font.getContent()});
          }`,
            ),
          );
        }),
      );

  svgRoot.innerHTML = `
  ${SVG_EXPORT_TAG}
  ${metadata}
  <defs>
    <style class="style-fonts">
      ${fontFaces.flat().filter(Boolean).join("\n")}
    </style>
    ${exportingFrameClipPath}
  </defs>
  `;

  // render background rect
  if (appState.exportBackground && viewBackgroundColor) {
    const rect = svgRoot.ownerDocument!.createElementNS(SVG_NS, "rect");
    rect.setAttribute("x", "0");
    rect.setAttribute("y", "0");
    rect.setAttribute("width", `${width}`);
    rect.setAttribute("height", `${height}`);
    rect.setAttribute("fill", viewBackgroundColor);
    svgRoot.appendChild(rect);
  }

  const rsvg = rough.svg(svgRoot);

  const renderEmbeddables = opts?.renderEmbeddables ?? false;

  renderSceneToSvg(
    elementsForRender,
    toBrandedType<RenderableElementsMap>(arrayToMap(elementsForRender)),
    rsvg,
    svgRoot,
    files || {},
    {
      offsetX,
      offsetY,
      isExporting: true,
      exportWithDarkMode,
      renderEmbeddables,
      frameRendering,
      canvasBackgroundColor: viewBackgroundColor,
      embedsValidationStatus: renderEmbeddables
        ? new Map(
            elementsForRender
              .filter((element) => isFrameLikeElement(element))
              .map((element) => [element.id, true]),
          )
        : new Map(),
    },
  );

  return svgRoot;
};

/**
 * 计算适合内容的最小区域。
 * @param elements 元素数组
 * @param exportPadding 导出填充
 * @returns [minX, minY, width, height]
 */
const getCanvasSize = (
  elements: readonly NonDeletedExcalidrawElement[],
  exportPadding: number,
): Bounds => {
  const [minX, minY, maxX, maxY] = getCommonBounds(elements);
  const width = distance(minX, maxX) + exportPadding * 2;
  const height = distance(minY, maxY) + exportPadding * 2;

  return [minX, minY, width, height];
};

/**
 * 获取导出尺寸。
 * @param elements 元素数组
 * @param exportPadding 导出填充
 * @param scale 缩放比例
 * @returns [width, height]
 */
export const getExportSize = (
  elements: readonly NonDeletedExcalidrawElement[],
  exportPadding: number,
  scale: number,
): [number, number] => {
  const [, , width, height] = getCanvasSize(elements, exportPadding).map(
    (dimension) => Math.trunc(dimension * scale),
  );

  return [width, height];
};
