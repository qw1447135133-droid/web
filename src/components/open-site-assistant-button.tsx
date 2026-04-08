"use client";

type OpenSiteAssistantButtonProps = {
  className?: string;
  children: React.ReactNode;
};

export function OpenSiteAssistantButton({ className, children }: OpenSiteAssistantButtonProps) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        window.dispatchEvent(new CustomEvent("signal-nine-assistant:open"));
      }}
    >
      {children}
    </button>
  );
}
