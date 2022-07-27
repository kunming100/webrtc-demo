import CONFIG from '@/constants/config';

/**
 * 初始化rem的font-size计算
 */
 export function initRem() {
  updateRootFontSize();
  // 窗口变化时，重新计算根节点font-size
  window.addEventListener('resize', () => {
    setTimeout(() => {
      updateRootFontSize();
    }, 0);
  });
}

/**
 * 计算根节点font-size
 */
export function updateRootFontSize(baseWidth: number = CONFIG.BASE_WINDOW_WIDTH) {
  const $html = document.documentElement;
  const deviceWidth = document.body.clientWidth;
  const rem = (deviceWidth / baseWidth) * CONFIG.REM_SLICE;
  $html && ($html.style.fontSize = `${rem}px`);
}