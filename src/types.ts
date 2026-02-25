import { Timestamp } from "firebase/firestore";

export type UserRole = "superadmin" | "owner";

export interface UserDoc {
  isVerified?: boolean;
  uid: string;
  email: string;
  role: UserRole;
  restaurantId?: string;
  createdAt: Timestamp;
}

export type PlanStatus = "trial" | "active" | "past_due" | "disabled";

export interface RestaurantTheme {
  mode: "light" | "dark";
  primary: string;
  secondary: string;
  background: string;
}

export interface RestaurantBranding {
  logoUrl?: string;
  /** Optional name shown on the public menu (can differ from internal restaurant name) */
  displayName?: string;
  /** Optional hero/banner image for the public menu */
  heroImageUrl?: string;
  /** Contact info shown on the public menu */
  contact?: {
    address?: string;
    phone?: string;
    email?: string;
    hours?: string;
  };
  theme: RestaurantTheme;
}

export interface RestaurantDoc {
  id: string;
  name: string;
  slug: string;
  ownerUid: string;
  phone?: string;
  whatsappPhoneE164?: string;
  address?: string;
  isActive: boolean;
  planStatus: PlanStatus;
  trialEndsAt: Timestamp;
  subscriptionEndsAt?: Timestamp;
  billingNote?: string;
  createdAt: Timestamp;
  branding: RestaurantBranding;
}

export interface CategoryDoc {
  id: string;
  nameAr: string;
  nameEn: string;
  order: number;
  /** Optional category cover image shown on the public menu */
  coverImageUrl?: string;
}

export interface ItemDoc {
  id: string;
  categoryId: string;
  nameAr: string;
  nameEn: string;
  descAr?: string;
  descEn?: string;
  price: number;
  currency: "USD" | "LBP";
  imageUrl?: string;
  available: boolean;
  order: number;
}
