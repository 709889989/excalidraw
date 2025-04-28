import { ENCRYPTION_KEY_BITS } from "../constants";
import { blobToArrayBuffer } from "./blob";

/**
 * 初始化向量(IV)的字节长度，用于AES-GCM加密算法
 */
export const IV_LENGTH_BYTES = 12;

/**
 * 创建初始化向量(IV)
 * @returns {Uint8Array} 返回一个随机生成的初始化向量
 */
export const createIV = () => {
  const arr = new Uint8Array(IV_LENGTH_BYTES);
  return window.crypto.getRandomValues(arr);
};

/**
 * 生成加密密钥
 * @template T - 返回类型，可以是'string'或'cryptoKey'
 * @param {T} [returnAs] - 指定返回类型，默认为'string'
 * @returns {Promise<T extends 'cryptoKey' ? CryptoKey : string>} 返回生成的加密密钥
 */
export const generateEncryptionKey = async <
  T extends "string" | "cryptoKey" = "string",
>(
  returnAs?: T,
): Promise<T extends "cryptoKey" ? CryptoKey : string> => {
  const key = await window.crypto.subtle.generateKey(
    {
      name: "AES-GCM",
      length: ENCRYPTION_KEY_BITS,
    },
    true, // extractable
    ["encrypt", "decrypt"],
  );
  return (
    returnAs === "cryptoKey"
      ? key
      : (await window.crypto.subtle.exportKey("jwk", key)).k
  ) as T extends "cryptoKey" ? CryptoKey : string;
};

/**
 * 将字符串形式的密钥转换为CryptoKey对象
 * @param {string} key - 字符串形式的密钥
 * @param {KeyUsage} usage - 密钥用途，如'encrypt'或'decrypt'
 * @returns {Promise<CryptoKey>} 返回CryptoKey对象
 */
export const getCryptoKey = (key: string, usage: KeyUsage) =>
  window.crypto.subtle.importKey(
    "jwk",
    {
      alg: "A128GCM",
      ext: true,
      k: key,
      key_ops: ["encrypt", "decrypt"],
      kty: "oct",
    },
    {
      name: "AES-GCM",
      length: ENCRYPTION_KEY_BITS,
    },
    false, // extractable
    [usage],
  );

/**
 * 加密数据
 * @param {string | CryptoKey} key - 加密密钥，可以是字符串或CryptoKey对象
 * @param {Uint8Array | ArrayBuffer | Blob | File | string} data - 要加密的数据
 * @returns {Promise<{encryptedBuffer: ArrayBuffer; iv: Uint8Array}>} 返回加密后的数据和初始化向量
 */
export const encryptData = async (
  key: string | CryptoKey,
  data: Uint8Array | ArrayBuffer | Blob | File | string,
): Promise<{ encryptedBuffer: ArrayBuffer; iv: Uint8Array }> => {
  const importedKey =
    typeof key === "string" ? await getCryptoKey(key, "encrypt") : key;
  const iv = createIV();
  const buffer: ArrayBuffer | Uint8Array =
    typeof data === "string"
      ? new TextEncoder().encode(data)
      : data instanceof Uint8Array
      ? data
      : data instanceof Blob
      ? await blobToArrayBuffer(data)
      : data;

  // We use symmetric encryption. AES-GCM is the recommended algorithm and
  // includes checks that the ciphertext has not been modified by an attacker.
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: "AES-GCM",
      iv,
    },
    importedKey,
    buffer as ArrayBuffer | Uint8Array,
  );

  return { encryptedBuffer, iv };
};

/**
 * 解密数据
 * @param {Uint8Array} iv - 初始化向量
 * @param {Uint8Array | ArrayBuffer} encrypted - 加密后的数据
 * @param {string} privateKey - 解密密钥
 * @returns {Promise<ArrayBuffer>} 返回解密后的数据
 */
export const decryptData = async (
  iv: Uint8Array,
  encrypted: Uint8Array | ArrayBuffer,
  privateKey: string,
): Promise<ArrayBuffer> => {
  const key = await getCryptoKey(privateKey, "decrypt");
  return window.crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv,
    },
    key,
    encrypted,
  );
};
