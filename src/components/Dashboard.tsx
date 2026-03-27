"use client";

import { ScanProvider } from "@/context/ScanContext";
import DealScanEngine from "@/components/DealScanEngine";
import TopOpportunities from "@/components/TopOpportunities";
import KPIStrip from "@/components/KPIStrip";
import DealInbox from "@/components/DealInbox";
import PipelineBoard from "@/components/PipelineBoard";
import CompanyDetail from "@/components/CompanyDetail";
import WatchlistActivity from "@/components/WatchlistActivity";

export default function Dashboard() {
  return (
    <ScanProvider>
      <DealScanEngine />
      <TopOpportunities />
      <KPIStrip />
      <DealInbox />
      <PipelineBoard />
      <CompanyDetail />
      <WatchlistActivity />
    </ScanProvider>
  );
}
