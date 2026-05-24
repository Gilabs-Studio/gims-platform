import { PageMotion } from "@/components/motion";
import { FeedbackSubmitView } from "@/features/feedback/components/feedback-submit-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hubungi Kami & Feedback",
  description: "Kirim masukan atau laporan bug sistem kepada tim developer",
};

export default function FeedbackPage() {
  return (
    <PageMotion>
      <FeedbackSubmitView />
    </PageMotion>
  );
}
