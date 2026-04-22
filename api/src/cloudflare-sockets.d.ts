declare module "cloudflare:sockets" {
	export interface SocketInfo {
		remoteAddress: string | null;
		localAddress?: string | null;
	}

	export interface Socket {
		readable: ReadableStream<Uint8Array>;
		writable: WritableStream<Uint8Array>;
		opened: Promise<SocketInfo>;
		closed: Promise<void>;
		close(): Promise<void>;
		startTls(): Socket;
	}

	export function connect(
		address: {
			hostname: string;
			port: number;
		},
		options?: {
			secureTransport?: "off" | "on" | "starttls";
			allowHalfOpen?: boolean;
		},
	): Socket;
}