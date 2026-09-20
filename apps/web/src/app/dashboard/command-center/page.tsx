import { redirect } from "next/navigation";

// Keep the retired Command Center URL safe for bookmarked links and sessions
// created before client feature controls were introduced.
export default function CommandCenterRedirect() {
  redirect("/dashboard");
}
