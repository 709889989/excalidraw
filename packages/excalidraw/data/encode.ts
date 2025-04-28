import { deflate, inflate } from "pako";
import { encryptData, decryptData } from "./encryption";

// -----------------------------------------------------------------------------
// byte (binary) strings
// -----------------------------------------------------------------------------

// fast, Buffer-compatible implem
/**
 * 将数据转换为字节字符串
 * @param data - 输入数据，可以是字符串、Uint8Array或ArrayBuffer
 * @returns Promise<string> - 返回字节字符串
 */
export const toByteString = (
  data: string | Uint8Array | ArrayBuffer,
): Promise<string> => {
  return new Promise((resolve, reject) => {
    const blob =
      typeof data === "string"
        ? new Blob([new TextEncoder().encode(data)])
        : new Blob([data instanceof Uint8Array ? data : new Uint8Array(data)]);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (!event.target || typeof event.target.result !== "string") {
        return reject(new Error("couldn't convert to byte string"));
      }
      resolve(event.target.result);
    };
    reader.readAsBinaryString(blob);
  });
};

/**
 * 将字节字符串转换为ArrayBuffer
 * @param byteString - 输入的字节字符串
 * @returns ArrayBuffer - 返回转换后的ArrayBuffer
 */
const byteStringToArrayBuffer = (byteString: string) => {
  const buffer = new ArrayBuffer(byteString.length);
  const bufferView = new Uint8Array(buffer);
  for (let i = 0, len = byteString.length; i < len; i++) {
    bufferView[i] = byteString.charCodeAt(i);
  }
  return buffer;
};

/**
 * 将字节字符串转换为普通字符串
 * @param byteString - 输入的字节字符串
 * @returns string - 返回转换后的字符串
 */
const byteStringToString = (byteString: string) => {
  return new TextDecoder("utf-8").decode(byteStringToArrayBuffer(byteString));
};

// -----------------------------------------------------------------------------
// base64
// -----------------------------------------------------------------------------

/**
 * @param isByteString set to true if already byte string to prevent bloat
 *  due to reencoding
 */
/**
 * 将字符串转换为Base64编码
 * @param str - 输入字符串
 * @param isByteString - 是否为字节字符串，默认false
 * @returns Promise<string> - 返回Base64编码字符串
 */
export const stringToBase64 = async (str: string, isByteString = false) => {
  return isByteString ? window.btoa(str) : window.btoa(await toByteString(str));
};

// async to align with stringToBase64
/**
 * 将Base64编码转换为字符串
 * @param base64 - Base64编码字符串
 * @param isByteString - 是否为字节字符串，默认false
 * @returns Promise<string> - 返回解码后的字符串
 */
export const base64ToString = async (base64: string, isByteString = false) => {
  return isByteString
    ? window.atob(base64)
    : byteStringToString(window.atob(base64));
};

// -----------------------------------------------------------------------------
// text encoding
// -----------------------------------------------------------------------------

type EncodedData = {
  encoded: string;
  encoding: "bstring";
  /** whether text is compressed (zlib) */
  compressed: boolean;
  /** version for potential migration purposes */
  version?: string;
};

/**
 * Encodes (and potentially compresses via zlib) text to byte string
 */
/**
 * 编码文本，可选择压缩
 * @param text - 输入文本
 * @param compress - 是否压缩，默认true
 * @returns Promise<EncodedData> - 返回编码后的数据
 */
export const encode = async ({
  text,
  compress,
}: {
  text: string;
  /** defaults to `true`. If compression fails, falls back to bstring alone. */
  compress?: boolean;
}): Promise<EncodedData> => {
  let deflated!: string;
  if (compress !== false) {
    try {
      deflated = await toByteString(deflate(text));
    } catch (error: any) {
      console.error("encode: cannot deflate", error);
    }
  }
  return {
    version: "1",
    encoding: "bstring",
    compressed: !!deflated,
    encoded: deflated || (await toByteString(text)),
  };
};

/**
 * 解码数据
 * @param data - 编码后的数据
 * @returns Promise<string> - 返回解码后的字符串
 */
export const decode = async (data: EncodedData): Promise<string> => {
  let decoded: string;

  switch (data.encoding) {
    case "bstring":
      // if compressed, do not double decode the bstring
      decoded = data.compressed
        ? data.encoded
        : await byteStringToString(data.encoded);
      break;
    default:
      throw new Error(`decode: unknown encoding "${data.encoding}"`);
  }

  if (data.compressed) {
    return inflate(new Uint8Array(byteStringToArrayBuffer(decoded)), {
      to: "string",
    });
  }

  return decoded;
};

// -----------------------------------------------------------------------------
// binary encoding
// -----------------------------------------------------------------------------

type FileEncodingInfo = {
  /* version 2 is the version we're shipping the initial image support with.
    version 1 was a PR version that a lot of people were using anyway.
    Thus, if there are issues we can check whether they're not using the
    unoffic version */
  version: 1 | 2;
  compression: "pako@1" | null;
  encryption: "AES-GCM" | null;
};

// -----------------------------------------------------------------------------
const CONCAT_BUFFERS_VERSION = 1;
/** how many bytes we use to encode how many bytes the next chunk has.
 * Corresponds to DataView setter methods (setUint32, setUint16, etc).
 *
 * NOTE ! values must not be changed, which would be backwards incompatible !
 */
const VERSION_DATAVIEW_BYTES = 4;
const NEXT_CHUNK_SIZE_DATAVIEW_BYTES = 4;
// -----------------------------------------------------------------------------

const DATA_VIEW_BITS_MAP = { 1: 8, 2: 16, 4: 32 } as const;

// getter
/**
 * DataView的抽象封装，用于处理ArrayBuffer中的数字
 * @param buffer - 目标Uint8Array缓冲区
 * @param bytes - 字节大小（1、2或4）
 * @param offset - 偏移量
 * @param value - 可选，要设置的值
 * @returns Uint8Array | number - 返回设置后的缓冲区或获取的值
 */
function dataView(buffer: Uint8Array, bytes: 1 | 2 | 4, offset: number): number;
// setter
/**
 * DataView的抽象封装，用于处理ArrayBuffer中的数字
 * @param buffer - 目标Uint8Array缓冲区
 * @param bytes - 字节大小（1、2或4）
 * @param offset - 偏移量
 * @param value - 可选，要设置的值
 * @returns Uint8Array | number - 返回设置后的缓冲区或获取的值
 */
function dataView(
  buffer: Uint8Array,
  bytes: 1 | 2 | 4,
  offset: number,
  value: number,
): Uint8Array;
/**
 * abstraction over DataView that serves as a typed getter/setter in case
 * you're using constants for the byte size and want to ensure there's no
 * discrepenancy in the encoding across refactors.
 *
 * DataView serves for an endian-agnostic handling of numbers in ArrayBuffers.
 */
/**
 * DataView的抽象封装，用于处理ArrayBuffer中的数字
 * @param buffer - 目标Uint8Array缓冲区
 * @param bytes - 字节大小（1、2或4）
 * @param offset - 偏移量
 * @param value - 可选，要设置的值
 * @returns Uint8Array | number - 返回设置后的缓冲区或获取的值
 */
function dataView(
  buffer: Uint8Array,
  bytes: 1 | 2 | 4,
  offset: number,
  value?: number,
): Uint8Array | number {
  if (value != null) {
    if (value > Math.pow(2, DATA_VIEW_BITS_MAP[bytes]) - 1) {
      throw new Error(
        `attempting to set value higher than the allocated bytes (value: ${value}, bytes: ${bytes})`,
      );
    }
    const method = `setUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
    new DataView(buffer.buffer)[method](offset, value);
    return buffer;
  }
  const method = `getUint${DATA_VIEW_BITS_MAP[bytes]}` as const;
  return new DataView(buffer.buffer)[method](offset);
}

// -----------------------------------------------------------------------------

/**
 * Resulting concatenated buffer has this format:
 *
 * [
 *   VERSION chunk (4 bytes)
 *   LENGTH chunk 1 (4 bytes)
 *   DATA chunk 1 (up to 2^32 bits)
 *   LENGTH chunk 2 (4 bytes)
 *   DATA chunk 2 (up to 2^32 bits)
 *   ...
 * ]
 *
 * @param buffers each buffer (chunk) must be at most 2^32 bits large (~4GB)
 */
/**
 * 将多个Uint8Array缓冲区连接成一个
 * @param buffers - 要连接的Uint8Array数组
 * @returns Uint8Array - 返回连接后的缓冲区
 */
const concatBuffers = (...buffers: Uint8Array[]) => {
  const bufferView = new Uint8Array(
    VERSION_DATAVIEW_BYTES +
      NEXT_CHUNK_SIZE_DATAVIEW_BYTES * buffers.length +
      buffers.reduce((acc, buffer) => acc + buffer.byteLength, 0),
  );

  let cursor = 0;

  // as the first chunk we'll encode the version for backwards compatibility
  dataView(bufferView, VERSION_DATAVIEW_BYTES, cursor, CONCAT_BUFFERS_VERSION);
  cursor += VERSION_DATAVIEW_BYTES;

  for (const buffer of buffers) {
    dataView(
      bufferView,
      NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
      cursor,
      buffer.byteLength,
    );
    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;

    bufferView.set(buffer, cursor);
    cursor += buffer.byteLength;
  }

  return bufferView;
};

/** can only be used on buffers created via `concatBuffers()` */
/**
 * 将连接后的缓冲区拆分为原始缓冲区数组
 * @param concatenatedBuffer - 已连接的缓冲区
 * @returns Uint8Array[] - 返回拆分后的缓冲区数组
 */
const splitBuffers = (concatenatedBuffer: Uint8Array) => {
  const buffers = [];

  let cursor = 0;

  // first chunk is the version
  const version = dataView(
    concatenatedBuffer,
    NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
    cursor,
  );
  // If version is outside of the supported versions, throw an error.
  // This usually means the buffer wasn't encoded using this API, so we'd only
  // waste compute.
  if (version > CONCAT_BUFFERS_VERSION) {
    throw new Error(`invalid version ${version}`);
  }

  cursor += VERSION_DATAVIEW_BYTES;

  while (true) {
    const chunkSize = dataView(
      concatenatedBuffer,
      NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
      cursor,
    );
    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;

    buffers.push(concatenatedBuffer.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;
    if (cursor >= concatenatedBuffer.byteLength) {
      break;
    }
  }

  return buffers;
};

// helpers for (de)compressing data with JSON metadata including encryption
// -----------------------------------------------------------------------------

/** @private */
/**
 * 加密并压缩数据
 * @param data - 要处理的数据
 * @param encryptionKey - 加密密钥
 * @returns Promise<{iv: Uint8Array, buffer: Uint8Array}> - 返回包含初始化向量和加密缓冲区的对象
 */
const _encryptAndCompress = async (
  data: Uint8Array | string,
  encryptionKey: string,
) => {
  const { encryptedBuffer, iv } = await encryptData(
    encryptionKey,
    deflate(data),
  );

  return { iv, buffer: new Uint8Array(encryptedBuffer) };
};

/**
 * The returned buffer has following format:
 * `[]` refers to a buffers wrapper (see `concatBuffers`)
 *
 * [
 *   encodingMetadataBuffer,
 *   iv,
 *   [
 *      contentsMetadataBuffer
 *      contentsBuffer
 *   ]
 * ]
 */
/**
 * 压缩数据并添加元信息
 * @param dataBuffer - 要压缩的数据缓冲区
 * @param options - 包含加密密钥和元数据的选项
 * @returns Promise<Uint8Array> - 返回压缩后的缓冲区
 */
export const compressData = async <T extends Record<string, any> = never>(
  dataBuffer: Uint8Array,
  options: {
    encryptionKey: string;
  } & ([T] extends [never]
    ? {
        metadata?: T;
      }
    : {
        metadata: T;
      }),
): Promise<Uint8Array> => {
  const fileInfo: FileEncodingInfo = {
    version: 2,
    compression: "pako@1",
    encryption: "AES-GCM",
  };

  const encodingMetadataBuffer = new TextEncoder().encode(
    JSON.stringify(fileInfo),
  );

  const contentsMetadataBuffer = new TextEncoder().encode(
    JSON.stringify(options.metadata || null),
  );

  const { iv, buffer } = await _encryptAndCompress(
    concatBuffers(contentsMetadataBuffer, dataBuffer),
    options.encryptionKey,
  );

  return concatBuffers(encodingMetadataBuffer, iv, buffer);
};

/** @private */
/**
 * 解密并解压缩数据
 * @param iv - 初始化向量
 * @param decryptedBuffer - 解密后的缓冲区
 * @param decryptionKey - 解密密钥
 * @param isCompressed - 是否压缩
 * @returns Promise<Uint8Array> - 返回处理后的缓冲区
 */
const _decryptAndDecompress = async (
  iv: Uint8Array,
  decryptedBuffer: Uint8Array,
  decryptionKey: string,
  isCompressed: boolean,
) => {
  decryptedBuffer = new Uint8Array(
    await decryptData(iv, decryptedBuffer, decryptionKey),
  );

  if (isCompressed) {
    return inflate(decryptedBuffer);
  }

  return decryptedBuffer;
};

/**
 * 解压缩数据并提取元信息
 * @param bufferView - 压缩后的缓冲区
 * @param options - 包含解密密钥的选项
 * @returns Promise<{metadata: T, data: Uint8Array}> - 返回元数据和原始数据
 */
export const decompressData = async <T extends Record<string, any>>(
  bufferView: Uint8Array,
  options: { decryptionKey: string },
) => {
  // first chunk is encoding metadata (ignored for now)
  const [encodingMetadataBuffer, iv, buffer] = splitBuffers(bufferView);

  const encodingMetadata: FileEncodingInfo = JSON.parse(
    new TextDecoder().decode(encodingMetadataBuffer),
  );

  try {
    const [contentsMetadataBuffer, contentsBuffer] = splitBuffers(
      await _decryptAndDecompress(
        iv,
        buffer,
        options.decryptionKey,
        !!encodingMetadata.compression,
      ),
    );

    const metadata = JSON.parse(
      new TextDecoder().decode(contentsMetadataBuffer),
    ) as T;

    return {
      /** metadata source is always JSON so we can decode it here */
      metadata,
      /** data can be anything so the caller must decode it */
      data: contentsBuffer,
    };
  } catch (error: any) {
    console.error(
      `Error during decompressing and decrypting the file.`,
      encodingMetadata,
    );
    throw error;
  }
};

// -----------------------------------------------------------------------------
