/** 
 * @desc 类型检测
 * @author tankm
 * @since 2022-07-21 02:23:51
 */

 const { toString } = Object.prototype;
 const hasOwn = Object.prototype.hasOwnProperty;
 
 export function getTag(val: any) {
   return toString.call(val);
 }
 
 export function isFunction(fn: any) {
   return toString.call(fn) === '[object Function]';
 }
 
 export function isLength(val: any) {
   return (
     typeof val === 'number' &&
     val > -1 &&
     val % 1 === 0 &&
     val <= Number.MAX_SAFE_INTEGER
   );
 }
 
 export function isArray(arr: any) {
   return Array.isArray
     ? Array.isArray(arr)
     : toString.call(arr) === '[object Array]';
 }
 
 export function isArrayLike(obj: any) {
   return obj != null && isLength(obj.length) && !isFunction(obj);
 }
 
 export function isBoolean(bool: any) {
   return toString.call(bool) === '[object Boolean]';
 }
 
 export function isDate(date: any) {
   return toString.call(date) === '[object Date]';
 }
 
 export function isNull(val: any) {
   return val === null;
 }
 
 export function isUndefined(val: any) {
   return val === undefined;
 }
 
 export function isNumber(val: any) {
   return toString.call(val) === '[object Number]' && !isNaN(val);
 }
 
 export function isObject(obj: any) {
   const type = typeof obj;
   return (obj && (type === 'object' || type === 'function')) || false;
 }
 
 export function isObjectLike(obj: any) {
   return obj != null && typeof obj === 'object';
 }
 
 export function isPlainObject(obj: any): boolean {
   if (!isObject(obj) || obj.nodeType || obj === obj.window) {
     return false;
   }
 
   if (
     obj.constructor &&
     !hasOwn.call(obj, 'constructor') &&
     !hasOwn.call(obj.constructor.prototype, 'isPrototypeOf')
   ) {
     return false;
   }
 
   let key: string | undefined;
   for (key in obj) {
     //
   }
   return key === undefined || hasOwn.call(obj, key);
 }
 
 export function isRegExp(reg: any) {
   return toString.call(reg) === '[object RegExp]';
 }
 
 export function isString(str: any) {
   return toString.call(str) === '[object String]';
 }
 
 /**
  * 检测一个对象是否是空对象
  * 1.对象为null
  * 2.数组是空数组
  * 3.字面量对象是空对象
  * @param  {Null|Array|Object}  value     检测对象
  * @return {Boolean}      返回是否是空对象
  */
 export function isEmpty(value: any) {
   if (value === null) {
     return true;
   }
 
   if (isArray(value)) {
     return !value.length;
   }
 
   if (isPlainObject(value)) {
     return !Object.keys(value).length;
   }
 
   return false;
 }
 
 export function isMap(map: any) {
   return toString.call(map) === '[object Map]';
 }
 
 export function isSet(set: any) {
   return toString.call(set) === '[object Set]';
 }
 
 export function isSymbol(symbol: any) {
   return toString.call(symbol) === '[object Symbol]';
 }
 