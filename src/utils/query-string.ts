/**
 * @desc 路径参数解析
 * @author tankm
 * @since 2022-07-21 02:22:35
 */
import { isString } from "./check-type";

export type ParsedQuery = { [key: string]: string };

/**
 * 解析query-string
 * 支持多个同名key的解析，解析为数组
 * 解析后的value是经过decode的
 * @param  {string} str       query字符串
 * @param  {string} [sep='&'] 参数组分隔符，默认是&
 * @param  {string} [eq='=']  key-value分隔符，默认是=
 * @return {Query} 返回解析后的query对象
 */
export function parse(
  str: string,
  sep: string = "&",
  eq: string = "="
): Record<string, any> {
  const obj: ParsedQuery = {};
  if (!str || !isString(str)) return obj;

  // 剥除url上的search之前部分
  str = str.replace(/.*?\?/, "");

  const groups = str.split(sep);

  for (const group of groups) {
    const eqIndex = group.indexOf(eq);

    // only key
    if (eqIndex === -1) {
      const key = decodeURIComponent(group);
      obj[key] = "";
      continue;
    }

    const key = decodeURIComponent(group.slice(0, eqIndex));
    const value = decodeURIComponent(group.slice(eqIndex + 1));

    // array
    if (obj[key] !== undefined) {
      const item = obj[key];
      if (!Array.isArray(item)) {
        obj[key] = [item, value] as any;
      } else {
        item.push(value);
      }
      continue;
    }

    obj[key] = value;
  }

  return obj;
}

/**
 * 替换链接中的参数值
 * @param url
 * @param key
 * @param value
 * @returns
 */
export function changeUrlArg(url: string, key: string, value: string) {
  var pattern = key + "=([^&]*)";
  var replaceText = key + "=" + value;
  return url.match(pattern)
    ? url.replace(eval("/(" + key + "=)([^&]*)/gi"), replaceText)
    : url.match("[?]")
    ? url + "&" + replaceText
    : url + "?" + replaceText;
}
