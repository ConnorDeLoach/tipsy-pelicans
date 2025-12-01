/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as auditLog from "../auditLog.js";
import type * as auth from "../auth.js";
import type * as chat_messages from "../chat/messages.js";
import type * as chat_model from "../chat/model.js";
import type * as chat_presence from "../chat/presence.js";
import type * as chat_push from "../chat/push.js";
import type * as chat_unread from "../chat/unread.js";
import type * as cronLogger from "../cronLogger.js";
import type * as crons from "../crons.js";
import type * as games from "../games.js";
import type * as health from "../health.js";
import type * as http from "../http.js";
import type * as me from "../me.js";
import type * as merch_actions from "../merch/actions.js";
import type * as merch_http from "../merch/http.js";
import type * as merch_model from "../merch/model.js";
import type * as merch_mutations from "../merch/mutations.js";
import type * as merch_queries from "../merch/queries.js";
import type * as migrations from "../migrations.js";
import type * as oembed_index from "../oembed/index.js";
import type * as oembed_instagram from "../oembed/instagram.js";
import type * as oembed_model from "../oembed/model.js";
import type * as oembed_mutations from "../oembed/mutations.js";
import type * as oembed_queries from "../oembed/queries.js";
import type * as opponents from "../opponents.js";
import type * as players from "../players.js";
import type * as push from "../push.js";
import type * as pushActions from "../pushActions.js";
import type * as reminders from "../reminders.js";
import type * as rsvpTokens from "../rsvpTokens.js";
import type * as seasons from "../seasons.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  auditLog: typeof auditLog;
  auth: typeof auth;
  "chat/messages": typeof chat_messages;
  "chat/model": typeof chat_model;
  "chat/presence": typeof chat_presence;
  "chat/push": typeof chat_push;
  "chat/unread": typeof chat_unread;
  cronLogger: typeof cronLogger;
  crons: typeof crons;
  games: typeof games;
  health: typeof health;
  http: typeof http;
  me: typeof me;
  "merch/actions": typeof merch_actions;
  "merch/http": typeof merch_http;
  "merch/model": typeof merch_model;
  "merch/mutations": typeof merch_mutations;
  "merch/queries": typeof merch_queries;
  migrations: typeof migrations;
  "oembed/index": typeof oembed_index;
  "oembed/instagram": typeof oembed_instagram;
  "oembed/model": typeof oembed_model;
  "oembed/mutations": typeof oembed_mutations;
  "oembed/queries": typeof oembed_queries;
  opponents: typeof opponents;
  players: typeof players;
  push: typeof push;
  pushActions: typeof pushActions;
  reminders: typeof reminders;
  rsvpTokens: typeof rsvpTokens;
  seasons: typeof seasons;
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
