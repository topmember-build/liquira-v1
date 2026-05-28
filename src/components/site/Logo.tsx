export function Logo({ className }: { className?: string }) {
  return (
    <img
      src="/liquira-logo.png"
      alt="Liquira"
      className={className ?? "h-auto object-contain"}
      draggable="false"
    />
  );
}
