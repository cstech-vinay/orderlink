import { LEGAL } from "@/lib/legal";

export function WhatsAppButton({
  variant = "floating",
  prefill = "Hi%20OrderLink",
  label,
}: {
  variant?: "floating" | "inline";
  prefill?: string;
  label?: string;
}) {
  const href = `https://wa.me/${LEGAL.whatsappNumber.replace("+", "")}?text=${prefill}`;

  if (variant === "floating") {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener"
        aria-label="Chat with OrderLink on WhatsApp"
        className="fixed bottom-5 right-5 z-40 w-14 h-14 rounded-full bg-coral text-cream flex items-center justify-center shadow-lg hover:scale-105 transition"
      >
        <svg viewBox="0 0 24 24" aria-hidden className="w-7 h-7 fill-current">
          <path d="M20.52 3.48A11.9 11.9 0 0012.02.06 11.94 11.94 0 001.19 17.63L.06 23.94l6.47-1.68a11.94 11.94 0 005.5 1.4h.01A11.94 11.94 0 0023.94 12a11.87 11.87 0 00-3.42-8.52zM12.02 21.6h-.01a9.7 9.7 0 01-4.95-1.36l-.36-.21-3.84 1 .99-3.77-.23-.39a9.72 9.72 0 0115.48-11.7A9.65 9.65 0 0121.7 12c0 5.36-4.35 9.6-9.68 9.6zm5.6-7.2c-.3-.16-1.77-.87-2.05-.97s-.48-.16-.67.15c-.2.3-.77.97-.95 1.17-.17.2-.35.23-.65.08-.3-.16-1.27-.47-2.42-1.5-.89-.79-1.49-1.78-1.66-2.08-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.18.2-.3.3-.5.1-.2.05-.38-.02-.53-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57a1.1 1.1 0 00-.8.37c-.28.3-1.05 1.02-1.05 2.48s1.08 2.88 1.23 3.08c.15.2 2.12 3.24 5.14 4.55 1.5.64 2.13.7 2.88.6.46-.06 1.4-.57 1.6-1.12.2-.55.2-1.02.14-1.12-.06-.1-.27-.16-.57-.3z" />
        </svg>
      </a>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 font-sans text-sm text-coral underline underline-offset-4 hover:no-underline"
    >
      {label ?? "WhatsApp us →"}
    </a>
  );
}
