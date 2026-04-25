declare module "multiformats/cid" {
	export class CID<
		Data = unknown,
		Code = number,
		Alg = number,
		Version = 0 | 1,
	> {
		static createV1(code: number, digest: unknown): CID;
		toString(base?: unknown): string;
	}
}
