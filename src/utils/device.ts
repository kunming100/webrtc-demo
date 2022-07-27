/**
 * @desc 检测设备类型
 * @author tankm
 * @since 2022-07-19 16:49:38
 */

/**
 * 是否是PC设备
 */
export function isPC() {
  const userAgentInfo = navigator.userAgent;
  const Agents = [
    "Android",
    "iPhone",
    "SymbianOS",
    "Windows Phone",
    "iPad",
    "iPod",
  ];
  let flag = true;

  for (let v = 0; v < Agents.length; v++) {
    if (userAgentInfo.indexOf(Agents[v]) > 0) {
      flag = false;
      break;
    }
  }

  return flag;
}

/**
 * 检测是否是安卓设备
 */
export function isAndroid() {
  const u = navigator.userAgent;
  const isAndroid = u.indexOf("Android") > -1 || u.indexOf("Linux") > -1;
  const isIOS = !!u.match(/\(i[^;]+;( U;)? CPU.+Mac OS X/); //ios终端

  if (isAndroid) {
    //这个是安卓操作系统
    return true;
  }

  if (isIOS) {
    return false;
  }
}
