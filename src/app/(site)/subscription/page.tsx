import { Suspense } from "react";
import SubscriptionClient from "./subscription-client";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-5 py-10">Loading…</div>}>
      <SubscriptionClient />
    </Suspense>
  );
}
