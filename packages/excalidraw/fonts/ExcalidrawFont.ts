import { stringToBase64, toByteString } from "../data/encode";
import { LOCAL_FONT_PROTOCOL } from "./metadata";

export interface Font {
  urls: URL[];
  fontFace: FontFace;
  getContent(): Promise<string>;
}
// UNPKG 生产环境的字体资源地址
export const UNPKG_PROD_URL = `https://unpkg.com/${
  import.meta.env.VITE_PKG_NAME
    ? `${import.meta.env.VITE_PKG_NAME}@${import.meta.env.PKG_VERSION}` // should be provided by vite during package build
    : "@excalidraw/excalidraw" // fallback to latest package version (i.e. for app)
}/dist/prod/`;

export class ExcalidrawFont implements Font {
  public readonly urls: URL[];
  public readonly fontFace: FontFace;

  constructor(family: string, uri: string, descriptors?: FontFaceDescriptors) {
    // 生成字体资源的 URL 列表
    this.urls = ExcalidrawFont.createUrls(uri);

    // 构建 font-face 的 sources 字符串
    const sources = this.urls
      .map((url) => `url(${url}) ${ExcalidrawFont.getFormat(url)}`)
      .join(", ");

    // 创建 FontFace 实例
    this.fontFace = new FontFace(family, sources, {
      display: "swap",
      style: "normal",
      weight: "400",
      ...descriptors,
    });
  }

  /**
   * Tries to fetch woff2 content, based on the registered urls.
   * Returns last defined url in case of errors.
   *
   * Note: uses browser APIs for base64 encoding - use dataurl outside the browser environment.
   */
  public async getContent(): Promise<string> {
    let i = 0;
    const errorMessages = [];

    while (i < this.urls.length) {
      const url = this.urls[i];

      if (url.protocol === "data:") {
        // 如果是 dataurl，字体已内联为 base64，无需再请求
        return url.toString();
      }

      try {
        // 请求字体资源
        const response = await fetch(url, {
          headers: {
            Accept: "font/woff2",
          },
        });

        if (response.ok) {
          // 获取字体的 mime 类型
          const mimeType = await response.headers.get("Content-Type");
          // 获取字体的二进制内容
          const buffer = await response.arrayBuffer();

          // 转为 base64 并返回 dataurl
          return `data:${mimeType};base64,${await stringToBase64(
            await toByteString(buffer),
            true,
          )}`;
        }

        // response not ok, try to continue
        errorMessages.push(
          `"${url.toString()}" returned status "${response.status}"`,
        );
      } catch (e) {
        // 捕获请求异常
        errorMessages.push(`"${url.toString()}" returned error "${e}"`);
      }

      i++;
    }

    // 打印所有错误信息
    console.error(
      `Failed to fetch font "${
        this.fontFace.family
      }" from urls "${this.urls.toString()}`,
      JSON.stringify(errorMessages, undefined, 2),
    );

    // in case of issues, at least return the last url as a content
    // defaults to unpkg for bundled fonts (so that we don't have to host them forever) and http url for others
    return this.urls.length ? this.urls[this.urls.length - 1].toString() : "";
  }

  private static createUrls(uri: string): URL[] {
    if (uri.startsWith(LOCAL_FONT_PROTOCOL)) {
      // 本地字体协议，不生成 url
      return [];
    }

    if (uri.startsWith("http") || uri.startsWith("data")) {
      // http 导入或 data url，直接生成一个 url
      return [new URL(uri)];
    }

    // 绝对路径资源，去掉开头的斜杠
    const assetUrl: string = uri.replace(/^\/+/, "");
    const urls: URL[] = [];

    if (typeof window.EXCALIDRAW_ASSET_PATH === "string") {
      // 处理单个资源路径
      const normalizedBaseUrl = this.normalizeBaseUrl(
        window.EXCALIDRAW_ASSET_PATH,
      );

      urls.push(new URL(assetUrl, normalizedBaseUrl));
    } else if (Array.isArray(window.EXCALIDRAW_ASSET_PATH)) {
      // 处理多个资源路径
      window.EXCALIDRAW_ASSET_PATH.forEach((path) => {
        const normalizedBaseUrl = this.normalizeBaseUrl(path);
        urls.push(new URL(assetUrl, normalizedBaseUrl));
      });
    }

    // fallback url for bundled fonts
    urls.push(new URL(assetUrl, UNPKG_PROD_URL));

    return urls;
  }

  private static getFormat(url: URL) {
    try {
      // 获取文件扩展名
      const pathname = new URL(url).pathname;
      const parts = pathname.split(".");

      if (parts.length === 1) {
        return "";
      }

      return `format('${parts.pop()}')`;
    } catch (error) {
      return "";
    }
  }

  private static normalizeBaseUrl(baseUrl: string) {
    let result = baseUrl;

    // 如果是根路径或相对路径，拼接 location.origin
    if (/^\.?\//.test(result)) {
      result = new URL(
        result.replace(/^\.?\/+/, ""),
        window?.location?.origin,
      ).toString();
    }

    // 保证结尾有斜杠
    result = `${result.replace(/\/+$/, "")}/`;

    return result;
  }
}
