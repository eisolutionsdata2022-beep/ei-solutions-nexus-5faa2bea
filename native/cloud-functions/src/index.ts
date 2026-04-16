/**
 * EI Solutions — Cloud Functions entrypoint.
 *
 * Each domain export is grouped by feature so that `firebase deploy
 * --only functions:interceptor` works for selective rollouts.
 */
import { initializeApp } from "firebase-admin/app";

initializeApp();

export * as interceptor from "./interceptor";
