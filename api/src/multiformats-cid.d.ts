declare module 'multiformats/cid' {
  export class CID<Data = unknown, Code = number, Alg = number, Version = 0 | 1> {
    toString(base?: unknown): string
  }
}