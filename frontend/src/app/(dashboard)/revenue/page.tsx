"use client";

import { CohortGrid } from "@/components/features/cohort-grid";
import { MrrWaterfall } from "@/components/features/mrr-waterfall";
import { Header } from "@/components/layout/header";

export default function RevenuePage() {
  return (
    <>
      <Header title="Revenue" subtitle="Cohort retention and MRR movement" />
      <main className="flex-1 space-y-6 p-4 md:p-6">
        <MrrWaterfall />
        <CohortGrid />
      </main>
    </>
  );
}
