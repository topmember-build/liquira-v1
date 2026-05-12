import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";

const PaymentPage = lazy(() => import("@/components/payment/PaymentPage").then(module => ({ default: module.PaymentPage })));

export const Route = createFileRoute("/payment")({
  component: PaymentPage,
});