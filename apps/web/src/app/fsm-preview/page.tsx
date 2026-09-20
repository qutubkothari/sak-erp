import { notFound } from "next/navigation";
import FieldSalesPage from "../dashboard/fsm/page";

// Local visual-acceptance harness. This route is deliberately unavailable in
// production builds; the shipped workspace remains /dashboard/fsm and uses the
// normal authentication, entitlement and permission wrappers.
export default function FsmPreviewPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <FieldSalesPage searchParams={{ demo: "1" }} />;
}
