import { useMemo } from "react";
import { extractPhrases } from "../utils/wordCloud";

export default function WordCloud({
  items,
  heading,
  subheading,
}: {
  items: { title: string; description?: string }[];
  heading: string;
  subheading?: string;
}) {
  const words = useMemo(() => extractPhrases(items), [items]);
  if (words.length === 0) return null;

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {heading}
      </h4>
      {subheading && <p className="text-xs text-slate-400 dark:text-slate-500">{subheading}</p>}
      <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {words.map(({ phrase, count, size, className }) => (
          <span
            key={phrase}
            title={`Xuất hiện ${count} lần trong tin gần đây`}
            style={{ fontSize: `${size}rem` }}
            className={`font-semibold leading-none ${className}`}
          >
            {phrase}
          </span>
        ))}
      </div>
    </div>
  );
}
