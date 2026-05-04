export type CategoryId =
  | "techland"
  | "clothlink"
  | "glossy"
  | "homely"
  | "kidzy"
  | "studify"
  | "sufraan"
  | "giftzone";

export type CategoryIcon =
  | "tech" | "cloth" | "glossy" | "home"
  | "kid" | "study" | "kitchen" | "gift";

export type Category = {
  id: CategoryId;
  name: string;
  tagline: string;
  hue: number;        // OKLCH hue 0-360, drives card tint
  icon: CategoryIcon;
};

export const categories: Category[] = [
  { id: "techland",  name: "TechLand",  tagline: "Gadgets & gear",  hue: 220, icon: "tech" },
  { id: "clothlink", name: "ClothLink", tagline: "Fashion finds",   hue: 340, icon: "cloth" },
  { id: "glossy",    name: "Glossy",    tagline: "Beauty & care",   hue:  16, icon: "glossy" },
  { id: "homely",    name: "Homely",    tagline: "For the home",    hue:  28, icon: "home" },
  { id: "kidzy",     name: "Kidzy",     tagline: "Kids & toys",     hue:  50, icon: "kid" },
  { id: "studify",   name: "Studify",   tagline: "Study & office",  hue: 260, icon: "study" },
  { id: "sufraan",   name: "Sufraan",   tagline: "Kitchen",         hue: 145, icon: "kitchen" },
  { id: "giftzone",  name: "GiftZone",  tagline: "Gifts & decor",   hue: 300, icon: "gift" },
];

export function findCategory(id: string): Category | undefined {
  return categories.find(c => c.id === id);
}
