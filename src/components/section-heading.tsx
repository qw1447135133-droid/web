export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="terminal-divider flex flex-col gap-4 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl">
        <p className="section-label">{eyebrow}</p>
        <h2 className="display-title mt-2 text-3xl font-semibold text-white sm:text-4xl">{title}</h2>
        {description ? <p className="mt-3 text-sm leading-7 text-slate-400 sm:text-base">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
