/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bootstrap from "../bootstrap.js";
import type * as chats from "../chats.js";
import type * as crons from "../crons.js";
import type * as deployments from "../deployments.js";
import type * as founderGeneration from "../founderGeneration.js";
import type * as http from "../http.js";
import type * as lib_agentAreas from "../lib/agentAreas.js";
import type * as lib_authz from "../lib/authz.js";
import type * as lib_founderPrompts from "../lib/founderPrompts.js";
import type * as lib_venice from "../lib/venice.js";
import type * as serverChatIgnition from "../serverChatIgnition.js";
import type * as serverChats from "../serverChats.js";
import type * as serverControlPlane from "../serverControlPlane.js";
import type * as serverDeployments from "../serverDeployments.js";
import type * as serverFounder from "../serverFounder.js";
import type * as serverOrchestration from "../serverOrchestration.js";
import type * as summarize from "../summarize.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bootstrap: typeof bootstrap;
  chats: typeof chats;
  crons: typeof crons;
  deployments: typeof deployments;
  founderGeneration: typeof founderGeneration;
  http: typeof http;
  "lib/agentAreas": typeof lib_agentAreas;
  "lib/authz": typeof lib_authz;
  "lib/founderPrompts": typeof lib_founderPrompts;
  "lib/venice": typeof lib_venice;
  serverChatIgnition: typeof serverChatIgnition;
  serverChats: typeof serverChats;
  serverControlPlane: typeof serverControlPlane;
  serverDeployments: typeof serverDeployments;
  serverFounder: typeof serverFounder;
  serverOrchestration: typeof serverOrchestration;
  summarize: typeof summarize;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
