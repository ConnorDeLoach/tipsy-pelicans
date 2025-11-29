/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auth from "../auth.js";
import type * as chat_messages from "../chat/messages.js";
import type * as chat_model from "../chat/model.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as http from "../http.js";
import type * as me from "../me.js";
import type * as merch_actions from "../merch/actions.js";
import type * as merch_http from "../merch/http.js";
import type * as merch_model from "../merch/model.js";
import type * as merch_mutations from "../merch/mutations.js";
import type * as merch_queries from "../merch/queries.js";
import type * as opponents from "../opponents.js";
import type * as players from "../players.js";
import type * as push from "../push.js";
import type * as pushActions from "../pushActions.js";
import type * as reminders from "../reminders.js";
import type * as rsvpTokens from "../rsvpTokens.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auth: typeof auth;
  "chat/messages": typeof chat_messages;
  "chat/model": typeof chat_model;
  crons: typeof crons;
  games: typeof games;
  http: typeof http;
  me: typeof me;
  "merch/actions": typeof merch_actions;
  "merch/http": typeof merch_http;
  "merch/model": typeof merch_model;
  "merch/mutations": typeof merch_mutations;
  "merch/queries": typeof merch_queries;
  opponents: typeof opponents;
  players: typeof players;
  push: typeof push;
  pushActions: typeof pushActions;
  reminders: typeof reminders;
  rsvpTokens: typeof rsvpTokens;
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
