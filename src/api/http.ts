import axios from "axios";

const baseURL = process.env.NODE_ENV === "production" ? "" : "/api";

const request = axios.create({
  baseURL,
  timeout: 10000,
});

export function get<T>(url: string, params: Record<string, any>): Promise<T> {
  return new Promise((resolve, reject) => {
    request
      .get(url, { params })
      .then((res) => {
        resolve(res.data);
      })
      .catch((error: any) => {
        reject(error);
      });
  });
}
