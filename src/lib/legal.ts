/**
 * Single source of truth for all legal identifiers, brand names, and contact
 * details. Every policy page, invoice, email, and footer reads from this
 * module. Update values here and they flow everywhere.
 */
export const LEGAL = {
  companyName: "CodeSierra Tech Private Limited",
  brandName: "OrderLink",

  cin: "U62013PN2025PTC241138",
  gstin: "27AAMCC6643G1ZF",
  panEmbedded: "AAMCC6643G",

  registeredAddress: {
    line1: "Eon Free Zone",
    line2: "Kharadi",
    city: "Pune",
    state: "Maharashtra",
    pincode: "411014",
    country: "India",
  },

  supportEmail: "hello@orderlink.in",
  supportPhone: "+91 20 66897519",
  whatsappNumber: "+912066897519",

  dpoName: "Vinay Vernekar",
  dpoDesignation: "Director",
  grievanceOfficerName: "Vinay Vernekar",

  incorporatedYear: 2025,

  parentSiteUrl: "https://codesierra.tech",

  /** wa.me deep-link URL for click-to-chat. */
  whatsappDeepLink(prefilled: string = "Hi%20OrderLink"): string {
    return `https://wa.me/${this.whatsappNumber.replace("+", "")}?text=${prefilled}`;
  },

  /** Multi-line readable address for invoices + footers. */
  formattedAddress(): string {
    const a = this.registeredAddress;
    return `${a.line1}, ${a.line2}, ${a.city}, ${a.state} ${a.pincode}, ${a.country}`;
  },
} as const;
