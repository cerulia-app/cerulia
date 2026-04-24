declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			ceruliaViewerAuth:
				| {
						did: string;
						scopes: string[];
				  }
				| null;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
