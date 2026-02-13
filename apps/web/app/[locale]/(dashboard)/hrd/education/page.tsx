import { EducationHistoryList } from "@/features/hrd/education-history/components/education-history-list";
import { PageMotion } from "@/components/motion";

export default async function EducationHistoryPage() {
  return (
    <PageMotion>
      <EducationHistoryList />
    </PageMotion>
  );
}
