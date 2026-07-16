import NodeCache from "node-cache";

const cache = new NodeCache({ stdTTL: 20, checkperiod: 30 });

export function cached<T>(key: string, ttl: number, loader: () => Promise<T>): Promise<T> {
  const hit = cache.get<T>(key);
  if (hit !== undefined) return Promise.resolve(hit);
  return loader().then((value) => {
    cache.set(key, value, ttl);
    return value;
  });
}
