/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as academicYears from "../academicYears.js";
import type * as adminSeed from "../adminSeed.js";
import type * as adminUsers from "../adminUsers.js";
import type * as aiGrading from "../aiGrading.js";
import type * as announcements from "../announcements.js";
import type * as arenas from "../arenas.js";
import type * as attendance from "../attendance.js";
import type * as auth from "../auth.js";
import type * as badges from "../badges.js";
import type * as capsActions from "../capsActions.js";
import type * as capsSeed from "../capsSeed.js";
import type * as classes from "../classes.js";
import type * as cleanup from "../cleanup.js";
import type * as emails from "../emails.js";
import type * as events from "../events.js";
import type * as examSeed from "../examSeed.js";
import type * as exams from "../exams.js";
import type * as finance from "../finance.js";
import type * as gamification from "../gamification.js";
import type * as gradeInsights from "../gradeInsights.js";
import type * as gradeInsightsMutations from "../gradeInsightsMutations.js";
import type * as grading from "../grading.js";
import type * as homework from "../homework.js";
import type * as http from "../http.js";
import type * as learningPaths from "../learningPaths.js";
import type * as liveClasses from "../liveClasses.js";
import type * as lms from "../lms.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as parents from "../parents.js";
import type * as questionBank from "../questionBank.js";
import type * as repairDb from "../repairDb.js";
import type * as schoolSettings from "../schoolSettings.js";
import type * as search from "../search.js";
import type * as seed from "../seed.js";
import type * as stats from "../stats.js";
import type * as studyBuddy from "../studyBuddy.js";
import type * as studyGroups from "../studyGroups.js";
import type * as subjects from "../subjects.js";
import type * as submissions from "../submissions.js";
import type * as timetables from "../timetables.js";
import type * as tutoring from "../tutoring.js";
import type * as users from "../users.js";
import type * as videoLibrary from "../videoLibrary.js";
import type * as whiteboard from "../whiteboard.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  academicYears: typeof academicYears;
  adminSeed: typeof adminSeed;
  adminUsers: typeof adminUsers;
  aiGrading: typeof aiGrading;
  announcements: typeof announcements;
  arenas: typeof arenas;
  attendance: typeof attendance;
  auth: typeof auth;
  badges: typeof badges;
  capsActions: typeof capsActions;
  capsSeed: typeof capsSeed;
  classes: typeof classes;
  cleanup: typeof cleanup;
  emails: typeof emails;
  events: typeof events;
  examSeed: typeof examSeed;
  exams: typeof exams;
  finance: typeof finance;
  gamification: typeof gamification;
  gradeInsights: typeof gradeInsights;
  gradeInsightsMutations: typeof gradeInsightsMutations;
  grading: typeof grading;
  homework: typeof homework;
  http: typeof http;
  learningPaths: typeof learningPaths;
  liveClasses: typeof liveClasses;
  lms: typeof lms;
  messages: typeof messages;
  notifications: typeof notifications;
  parents: typeof parents;
  questionBank: typeof questionBank;
  repairDb: typeof repairDb;
  schoolSettings: typeof schoolSettings;
  search: typeof search;
  seed: typeof seed;
  stats: typeof stats;
  studyBuddy: typeof studyBuddy;
  studyGroups: typeof studyGroups;
  subjects: typeof subjects;
  submissions: typeof submissions;
  timetables: typeof timetables;
  tutoring: typeof tutoring;
  users: typeof users;
  videoLibrary: typeof videoLibrary;
  whiteboard: typeof whiteboard;
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
