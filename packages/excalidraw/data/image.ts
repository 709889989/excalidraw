import decodePng from "png-chunks-extract";
import tEXt from "png-chunk-text";
import encodePng from "png-chunks-encode";
import { stringToBase64, encode, decode, base64ToString } from "./encode";
import { EXPORT_DATA_TYPES, MIME_TYPES } from "../constants";
import { blobToArrayBuffer } from "./blob";

// -----------------------------------------------------------------------------
// PNG
// -----------------------------------------------------------------------------

/**
 * 从PNG文件中提取tEXt元数据块
 * @param blob - PNG文件的Blob对象
 * @returns 包含关键字和文本的对象，如果未找到返回null
 */
export const getTEXtChunk = async (
  blob: Blob,
): Promise<{ keyword: string; text: string } | null> => {
  const chunks = decodePng(new Uint8Array(await blobToArrayBuffer(blob)));
  const metadataChunk = chunks.find((chunk) => chunk.name === "tEXt");
  if (metadataChunk) {
    return tEXt.decode(metadataChunk.data);
  }
  return null;
};

/**
 * 将元数据编码到PNG文件中
 * @param blob - 原始PNG文件的Blob对象
 * @param metadata - 要编码的元数据字符串
 * @returns 包含编码后元数据的新PNG Blob对象
 */
export const encodePngMetadata = async ({
  blob,
  metadata,
}: {
  blob: Blob;
  metadata: string;
}) => {
  const chunks = decodePng(new Uint8Array(await blobToArrayBuffer(blob)));

  const metadataChunk = tEXt.encode(
    MIME_TYPES.excalidraw,
    JSON.stringify(
      await encode({
        text: metadata,
        compress: true,
      }),
    ),
  );
  // insert metadata before last chunk (iEND)
  chunks.splice(-1, 0, metadataChunk);

  return new Blob([encodePng(chunks)], { type: MIME_TYPES.png });
};

/**
 * 从PNG文件中解码元数据
 * @param blob - 包含编码元数据的PNG文件Blob对象
 * @returns 解码后的元数据字符串
 * @throws 如果元数据无效或解码失败
 */
export const decodePngMetadata = async (blob: Blob) => {
  const metadata = await getTEXtChunk(blob);
  if (metadata?.keyword === MIME_TYPES.excalidraw) {
    try {
      const encodedData = JSON.parse(metadata.text);
      if (!("encoded" in encodedData)) {
        // legacy, un-encoded scene JSON
        if (
          "type" in encodedData &&
          encodedData.type === EXPORT_DATA_TYPES.excalidraw
        ) {
          return metadata.text;
        }
        throw new Error("FAILED");
      }
      return await decode(encodedData);
    } catch (error: any) {
      console.error(error);
      throw new Error("FAILED");
    }
  }
  throw new Error("INVALID");
};

// -----------------------------------------------------------------------------
// SVG
// -----------------------------------------------------------------------------

/**
 * 将元数据编码到SVG文件中
 * @param text - 要编码的元数据字符串
 * @returns 包含编码元数据的SVG注释字符串
 */
export const encodeSvgMetadata = async ({ text }: { text: string }) => {
  const base64 = await stringToBase64(
    JSON.stringify(await encode({ text })),
    true /* is already byte string */,
  );

  let metadata = "";
  metadata += `<!-- payload-type:${MIME_TYPES.excalidraw} -->`;
  metadata += `<!-- payload-version:2 -->`;
  metadata += "<!-- payload-start -->";
  metadata += base64;
  metadata += "<!-- payload-end -->";
  return metadata;
};

/**
 * 从SVG文件中解码元数据
 * @param svg - 包含编码元数据的SVG字符串
 * @returns 解码后的元数据字符串
 * @throws 如果元数据无效或解码失败
 */
export const decodeSvgMetadata = async ({ svg }: { svg: string }) => {
  if (svg.includes(`payload-type:${MIME_TYPES.excalidraw}`)) {
    const match = svg.match(
      /<!-- payload-start -->\s*(.+?)\s*<!-- payload-end -->/,
    );
    if (!match) {
      throw new Error("INVALID");
    }
    const versionMatch = svg.match(/<!-- payload-version:(\d+) -->/);
    const version = versionMatch?.[1] || "1";
    const isByteString = version !== "1";

    try {
      const json = await base64ToString(match[1], isByteString);
      const encodedData = JSON.parse(json);
      if (!("encoded" in encodedData)) {
        // legacy, un-encoded scene JSON
        if (
          "type" in encodedData &&
          encodedData.type === EXPORT_DATA_TYPES.excalidraw
        ) {
          return json;
        }
        throw new Error("FAILED");
      }
      return await decode(encodedData);
    } catch (error: any) {
      console.error(error);
      throw new Error("FAILED");
    }
  }
  throw new Error("INVALID");
};
