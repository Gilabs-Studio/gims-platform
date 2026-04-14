import { redirect } from "next/navigation";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export default async function FinanceJournalsBridgePage({ params }: Props) {
  const { slug } = await params;
  const suffix = Array.isArray(slug) && slug.length > 0
    ? `/${slug.map((part) => encodeURIComponent(part)).join("/")}`
    : "";

  redirect(`/en/finance/journals${suffix}`);
}