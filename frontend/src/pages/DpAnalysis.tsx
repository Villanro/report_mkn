import { useParams } from "react-router-dom";
import HierarchySection from "@/pages/HierarchySection";
import type { HierarchySectionKey } from "@/types";

const VALID_DP = new Set(["1", "2", "6"]);

export default function DpAnalysis() {
  const { dp } = useParams<{ dp: string }>();
  const dpNumber = dp && VALID_DP.has(dp) ? dp : "1";
  const section = `dp${dpNumber}` as HierarchySectionKey;

  return <HierarchySection title={`DP${dpNumber} Analysis`} section={section} />;
}
