import type Scene from "../scene/Scene";
import type { ValueOf } from "../utility-types";
import type {
  ExcalidrawElement,
  ExcalidrawTextElement,
  FontFamilyValues,
} from "../element/types";
import { ShapeCache } from "../scene/ShapeCache";
import { isTextElement } from "../element";
import { getFontString } from "../utils";
import { FONT_FAMILY } from "../constants";
import {
  LOCAL_FONT_PROTOCOL,
  FONT_METADATA,
  RANGES,
  type FontMetadata,
} from "./metadata";
import { ExcalidrawFont, type Font } from "./ExcalidrawFont";
import { getContainerElement } from "../element/textElement";

import Virgil from "./assets/Virgil-Regular.woff2"; // 本地 Virgil 字体文件
import Excalifont from "./assets/Excalifont-Regular.woff2"; // 本地 Excalifont 字体文件
import Cascadia from "./assets/CascadiaCode-Regular.woff2"; // 本地 Cascadia 字体文件
import ComicShanns from "./assets/ComicShanns-Regular.woff2"; // 本地 ComicShanns 字体文件
import LiberationSans from "./assets/LiberationSans-Regular.woff2"; // 本地 LiberationSans 字体文件

import LilitaLatin from "https://fonts.gstatic.com/s/lilitaone/v15/i7dPIFZ9Zz-WBtRtedDbYEF8RXi4EwQ.woff2"; // Lilita One 拉丁子集远程字体
import LilitaLatinExt from "https://fonts.gstatic.com/s/lilitaone/v15/i7dPIFZ9Zz-WBtRtedDbYE98RXi4EwSsbg.woff2"; // Lilita One 拉丁扩展子集远程字体

import NunitoLatin from "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTQ3j6zbXWjgeg.woff2"; // Nunito 拉丁子集远程字体
import NunitoLatinExt from "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTo3j6zbXWjgevT5.woff2"; // Nunito 拉丁扩展子集远程字体
import NunitoCyrilic from "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTA3j6zbXWjgevT5.woff2"; // Nunito 西里尔子集远程字体
import NunitoCyrilicExt from "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTk3j6zbXWjgevT5.woff2"; // Nunito 西里尔扩展子集远程字体
import NunitoVietnamese from "https://fonts.gstatic.com/s/nunito/v26/XRXI3I6Li01BKofiOc5wtlZ2di8HDIkhdTs3j6zbXWjgevT5.woff2"; // Nunito 越南语子集远程字体

export class Fonts {
  // 静态缓存，记录已加载过的字体，避免重复加载
  public static readonly loadedFontsCache = new Set<string>();

  private static _registered:
    | Map<
        number,
        {
          metadata: FontMetadata;
          fonts: Font[];
        }
      >
    | undefined;

  private static _initialized: boolean = false;

  public static get registered() {
    // 懒加载字体注册表
    if (!Fonts._registered) {
      Fonts._registered = Fonts.init();
    } else if (!Fonts._initialized) {
      // 如果主机应用在懒加载之前注册了字体，不覆盖之前注册的内容
      Fonts._registered = new Map([
        ...Fonts.init().entries(),
        ...Fonts._registered.entries(),
      ]);
    }

    return Fonts._registered;
  }

  public get registered() {
    return Fonts.registered;
  }

  private readonly scene: Scene;

  constructor({ scene }: { scene: Scene }) {
    this.scene = scene;
  }

  /**
   * 如果加载了新的字体，可能文本元素已经使用了回退字体渲染。
   * 因此需要使这些文本元素的形状失效并重新渲染。
   * 使文本元素失效并重新渲染场景，前提是至少有一个提供的 fontFaces 尚未被处理。
   */
  public onLoaded = (fontFaces: readonly FontFace[]) => {
    if (
      // 如果所有字体都已处理，则跳过。这里只检查了字体属性的子集，因此可能会出现误判。
      fontFaces.every((fontFace) => {
        const sig = `${fontFace.family}-${fontFace.style}-${fontFace.weight}-${fontFace.unicodeRange}`;
        if (Fonts.loadedFontsCache.has(sig)) {
          return true;
        }
        Fonts.loadedFontsCache.add(sig);
        return false;
      })
    ) {
      return false;
    }

    let didUpdate = false;

    const elementsMap = this.scene.getNonDeletedElementsMap();

    for (const element of this.scene.getNonDeletedElements()) {
      if (isTextElement(element)) {
        didUpdate = true;
        ShapeCache.delete(element);
        const container = getContainerElement(element, elementsMap);
        if (container) {
          ShapeCache.delete(container);
        }
      }
    }

    if (didUpdate) {
      this.scene.triggerUpdate();
    }
  };

  /**
   * 加载当前场景用到的所有字体并触发场景更新。
   */
  public loadSceneFonts = async (): Promise<FontFace[]> => {
    const sceneFamilies = this.getSceneFontFamilies();
    const loaded = await Fonts.loadFontFaces(sceneFamilies);
    this.onLoaded(loaded);
    return loaded;
  };

  /**
   * 获取当前场景所有文本元素的字体家族。
   */
  public getSceneFontFamilies = () => {
    return Fonts.getFontFamilies(this.scene.getNonDeletedElements());
  };

  /**
   * 加载指定元素所需的字体（用于导出等场景）。
   */
  public static loadFontsForElements = async (
    elements: readonly ExcalidrawElement[],
  ): Promise<FontFace[]> => {
    const fontFamilies = Fonts.getFontFamilies(elements);
    return await Fonts.loadFontFaces(fontFamilies);
  };

  private static async loadFontFaces(
    fontFamilies: Array<ExcalidrawTextElement["fontFamily"]>,
  ) {
    // 将所有已注册的字体添加到 document.fonts（如果尚未添加）
    for (const { fonts, metadata } of Fonts.registered.values()) {
      // 跳过本地字体的注册（如 Helvetica）
      if (metadata.local) {
        continue;
      }

      for (const { fontFace } of fonts) {
        if (!window.document.fonts.has(fontFace)) {
          window.document.fonts.add(fontFace);
        }
      }
    }

    const loadedFontFaces = await Promise.all(
      fontFamilies.map(async (fontFamily) => {
        const fontString = getFontString({
          fontFamily,
          fontSize: 16,
        });

        // 警告：没有 "text" 参数并不意味着所有字体都已加载，可能只有一个被加载！
        if (!window.document.fonts.check(fontString)) {
          try {
            // 警告：浏览器优先加载文档中存在字符的字体子集，其他字体子集可能未加载
            return await window.document.fonts.load(fontString);
          } catch (e) {
            // 如果某个字体加载失败，不影响其他字体加载
            console.error(
              `Failed to load font "${fontString}" from urls "${Fonts.registered
                .get(fontFamily)
                ?.fonts.map((x) => x.urls)}"`,
              e,
            );
          }
        }

        return Promise.resolve();
      }),
    );

    return loadedFontFaces.flat().filter(Boolean) as FontFace[];
  }

  /**
   * 警告：此方法应仅在初始化时调用一次，即使跨多个实例。
   */
  private static init() {
    // 初始化字体注册表
    const fonts = {
      registered: new Map<
        ValueOf<typeof FONT_FAMILY>,
        { metadata: FontMetadata; fonts: Font[] }
      >(),
    };

    // TODO: 根据自定义字体 API 的暴露方式调整此处逻辑
    const _register = register.bind(fonts);

    _register("Virgil", FONT_METADATA[FONT_FAMILY.Virgil], {
      uri: Virgil,
    });

    _register("Excalifont", FONT_METADATA[FONT_FAMILY.Excalifont], {
      uri: Excalifont,
    });

    // 为了向后兼容，使用系统字体（MacOS 上为 Helvetica，Win 上为 Arial）
    _register("Helvetica", FONT_METADATA[FONT_FAMILY.Helvetica], {
      uri: LOCAL_FONT_PROTOCOL,
    });

    // 用于服务器端 PDF 和 PNG 导出代替 Helvetica
    _register(
      "Liberation Sans",
      FONT_METADATA[FONT_FAMILY["Liberation Sans"]],
      {
        uri: LiberationSans,
      },
    );

    _register("Cascadia", FONT_METADATA[FONT_FAMILY.Cascadia], {
      uri: Cascadia,
    });

    _register("Comic Shanns", FONT_METADATA[FONT_FAMILY["Comic Shanns"]], {
      uri: ComicShanns,
    });

    _register(
      "Lilita One",
      FONT_METADATA[FONT_FAMILY["Lilita One"]],
      { uri: LilitaLatinExt, descriptors: { unicodeRange: RANGES.LATIN_EXT } },
      { uri: LilitaLatin, descriptors: { unicodeRange: RANGES.LATIN } },
    );

    _register(
      "Nunito",
      FONT_METADATA[FONT_FAMILY.Nunito],
      {
        uri: NunitoCyrilicExt,
        descriptors: { unicodeRange: RANGES.CYRILIC_EXT, weight: "500" },
      },
      {
        uri: NunitoCyrilic,
        descriptors: { unicodeRange: RANGES.CYRILIC, weight: "500" },
      },
      {
        uri: NunitoVietnamese,
        descriptors: { unicodeRange: RANGES.VIETNAMESE, weight: "500" },
      },
      {
        uri: NunitoLatinExt,
        descriptors: { unicodeRange: RANGES.LATIN_EXT, weight: "500" },
      },
      {
        uri: NunitoLatin,
        descriptors: { unicodeRange: RANGES.LATIN, weight: "500" },
      },
    );

    Fonts._initialized = true;

    return fonts.registered;
  }

  private static getFontFamilies(
    elements: ReadonlyArray<ExcalidrawElement>,
  ): Array<ExcalidrawTextElement["fontFamily"]> {
    // 提取所有文本元素的字体家族集合
    return Array.from(
      elements.reduce((families, element) => {
        if (isTextElement(element)) {
          families.add(element.fontFamily);
        }
        return families;
      }, new Set<number>()),
    );
  }
}

/**
 * 注册新字体。
 *
 * @param family 字体家族
 * @param metadata 字体元数据
 * @param params 字体参数数组 [uri: string, descriptors: FontFaceDescriptors?]
 */
function register(
  this:
    | Fonts
    | {
        registered: Map<
          ValueOf<typeof FONT_FAMILY>,
          { metadata: FontMetadata; fonts: Font[] }
        >;
      },
  family: string,
  metadata: FontMetadata,
  ...params: Array<{ uri: string; descriptors?: FontFaceDescriptors }>
) {
  // TODO: 为支持自定义字体可能需要放弃数字 "id"
  const familyId = FONT_FAMILY[family as keyof typeof FONT_FAMILY];
  const registeredFamily = this.registered.get(familyId);

  if (!registeredFamily) {
    this.registered.set(familyId, {
      metadata,
      fonts: params.map(
        ({ uri, descriptors }) => new ExcalidrawFont(family, uri, descriptors),
      ),
    });
  }

  return this.registered;
}

/**
 * 计算文本的垂直偏移量（基于字母基线）。
 */
export const getVerticalOffset = (
  fontFamily: ExcalidrawTextElement["fontFamily"],
  fontSize: ExcalidrawTextElement["fontSize"],
  lineHeightPx: number,
) => {
  const { unitsPerEm, ascender, descender } =
    Fonts.registered.get(fontFamily)?.metadata.metrics ||
    FONT_METADATA[FONT_FAMILY.Virgil].metrics;

  const fontSizeEm = fontSize / unitsPerEm;
  const lineGap =
    (lineHeightPx - fontSizeEm * ascender + fontSizeEm * descender) / 2;

  const verticalOffset = fontSizeEm * ascender + lineGap;
  return verticalOffset;
};

/**
 * 获取选定字体家族的行高。
 */
export const getLineHeight = (fontFamily: FontFamilyValues) => {
  const { lineHeight } =
    Fonts.registered.get(fontFamily)?.metadata.metrics ||
    FONT_METADATA[FONT_FAMILY.Excalifont].metrics;

  return lineHeight as ExcalidrawTextElement["lineHeight"];
};
