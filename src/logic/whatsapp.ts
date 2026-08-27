// WhatsApp deep links. Only the *dynamic* one (message depends on which
// product type is selected) is built from here — the other three CTAs on
// the page (Contato section, "Começar pela fase 01", the "vaga aberta"
// card) are static content and link to wa.me directly in the `.dc.html`
// markup; centralizing the number there too would mean threading it back
// out of the generated `<script data-dc-script>` into plain template HTML,
// which the build has no mechanism for. If a WhatsApp CTA is added anywhere
// else that needs a *computed* message, build it with this helper instead
// of hand-rolling another `https://wa.me/...` string.

/** International format, no `+` or separators — see wa.me's own convention. */
const WHATSAPP_NUMBER = '5511997668181';

/** Builds a `wa.me` deep link pre-filled with `message`. */
export function whatsAppLink(message: string): string {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}
