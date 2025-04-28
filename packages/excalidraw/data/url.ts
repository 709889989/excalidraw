import { sanitizeUrl } from "@braintree/sanitize-url";

/**
 * 将HTML字符串中的双引号转换为HTML实体，用于安全地设置HTML属性值
 * @param html - 需要处理的HTML字符串
 * @returns 处理后的安全字符串
 */
export const sanitizeHTMLAttribute = (html: string) => {
  return html.replace(/"/g, "&quot;");
};

/**
 * 对链接进行规范化处理，包括去除前后空格和HTML属性转义
 * @param link - 需要处理的原始链接
 * @returns 处理后的安全链接
 */
export const normalizeLink = (link: string) => {
  link = link.trim();
  if (!link) {
    return link;
  }
  return sanitizeUrl(sanitizeHTMLAttribute(link));
};

/**
 * 判断链接是否为本地链接
 * @param link - 需要判断的链接
 * @returns 如果是本地链接返回true，否则返回false
 */
export const isLocalLink = (link: string | null) => {
  return !!(link?.includes(location.origin) || link?.startsWith("/"));
};

/**
 * Returns URL sanitized and safe for usage in places such as
 * iframe's src attribute or <a> href attributes.
 */
/**
 * 将链接转换为安全的URL格式，适用于iframe的src属性或<a>标签的href属性
 * @param link - 需要处理的原始链接
 * @returns 处理后的安全URL，如果链接无效则返回'about:blank'
 */
export const toValidURL = (link: string) => {
  link = normalizeLink(link);

  // make relative links into fully-qualified urls
  if (link.startsWith("/")) {
    return `${location.origin}${link}`;
  }

  try {
    new URL(link);
  } catch {
    // if link does not parse as URL, assume invalid and return blank page
    return "about:blank";
  }

  return link;
};
