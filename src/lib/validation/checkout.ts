import { z } from "zod";

export const checkoutSchema = z.object({
  productSlug: z.string().min(1),
  fullName: z.string().min(2).max(80),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Invalid Indian mobile"),
  email: z.string().email(),
  addressLine1: z.string().min(5).max(120),
  addressLine2: z.string().max(120).optional(),
  landmark: z.string().max(80).optional(),
  pincode: z.string().regex(/^\d{6}$/),
  city: z.string().min(2).max(60),
  state: z.string().min(2).max(60),
  paymentMethod: z.enum(["prepaid", "pay_on_delivery"]),
  couponCode: z.string().max(40).optional(),
  utm_source: z.string().max(80).optional(),
  utm_medium: z.string().max(80).optional(),
  utm_campaign: z.string().max(80).optional(),
  utm_term: z.string().max(80).optional(),
  utm_content: z.string().max(80).optional(),
  referrer: z.string().max(500).optional(),
  landing_page: z.string().max(500).optional(),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
