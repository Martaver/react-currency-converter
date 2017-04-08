// check if today record exist or fetch new
import { cachedResponse } from './fixtures';
export const cacheStorage = new Map([
  ['latest', cachedResponse],
]);
