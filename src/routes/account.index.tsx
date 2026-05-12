import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const SavedRoutesPage = lazy(() => import("@/components/account/SavedRoutesPage").then(module => ({ default: module.SavedRoutesPage })));

export const Route = createFileRoute("/account/")({
  component: SavedRoutesPage,
});