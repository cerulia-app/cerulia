import { ValidationError } from "@atproto/lexicon";

export type ProjectionErrorCode =
	| "InvalidRequest"
	| "Unauthorized"
	| "Forbidden"
	| "NotFound"
	| "InternalError";

export class ProjectionError extends Error {
	constructor(
		public readonly code: ProjectionErrorCode,
		message: string,
		public readonly status: number,
	) {
		super(message);
		this.name = "ProjectionError";
	}
}

function isValidationErrorLike(error: unknown): error is Error {
	if (error instanceof ValidationError) {
		return true;
	}

	if (!(error instanceof Error)) {
		return false;
	}

	return (
		error.name === "ValidationError" ||
		error.constructor?.name === "ValidationError" ||
		Object.getPrototypeOf(error)?.constructor?.name === "ValidationError"
	);
}

export function toErrorResponse(error: unknown): Response {
	if (isValidationErrorLike(error)) {
		return Response.json(
			{
				error: "InvalidRequest",
				message: error.message,
			},
			{
				status: 400,
			},
		);
	}

	if (error instanceof ProjectionError) {
		return Response.json(
			{
				error: error.code,
				message: error.message,
			},
			{
				status: error.status,
			},
		);
	}

	return Response.json(
		{
			error: "InternalError",
			message: "Unexpected service error",
		},
		{
			status: 500,
		},
	);
}