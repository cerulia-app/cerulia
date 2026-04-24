/**
 * GENERATED CODE - DO NOT MODIFY
 */
import { HeadersMap, XRPCError } from "@atproto/xrpc";
import { type ValidationResult, BlobRef } from "@atproto/lexicon";
import { CID } from "multiformats/cid";
import { validate as _validate } from "../../../../../lexicons";
import {
	type $Typed,
	is$typed as _is$typed,
	type OmitKey,
} from "../../../../../util";
import type * as AppCeruliaDevCoreCharacterSheetSchema from "../core/characterSheetSchema.js";
import type * as AppCeruliaDevDefs from "../defs.js";

const is$typed = _is$typed,
	validate = _validate;
const id = "app.cerulia.dev.rule.createSheetSchema";

export type QueryParams = {};

export interface InputSchema {
	baseRulesetNsid: string;
	schemaVersion: string;
	title: string;
	fieldDefs: AppCeruliaDevCoreCharacterSheetSchema.FieldDefRoot[];
}

export type OutputSchema = AppCeruliaDevDefs.MutationAck;

export interface CallOptions {
	signal?: AbortSignal;
	headers?: HeadersMap;
	qp?: QueryParams;
	encoding?: "application/json";
}

export interface Response {
	success: boolean;
	headers: HeadersMap;
	data: OutputSchema;
}

export function toKnownErr(e: any) {
	return e;
}
