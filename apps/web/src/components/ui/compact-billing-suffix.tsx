import { cn } from "@/lib/utils";

interface CompactBillingSuffixProps {
  className?: string;
  srLabel: string;
  text: string;
}

export function CompactBillingSuffix({
  className,
  srLabel,
  text,
}: CompactBillingSuffixProps) {
  return (
    <span className={cn("seo-slash-prefix inline-flex items-center", className)}>
      <span className="sr-only">{srLabel}</span>
      <span aria-hidden="true">{text}</span>
    </span>
  );
}
