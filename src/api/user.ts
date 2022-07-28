import { get } from "./http";

/**
 * 获取用户信息
 * @param userId
 */
export function getUserInfo<T>(userId: string): Promise<T> {
  return get<T>("/getUserInfo", { userId });
}
