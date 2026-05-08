// User session model
export interface UserSession {
  kunnr: string;
  name?: string;
  city?: string;
  country?: string;
}

// Profile model
export interface CustomerProfile {
  kunnr: string;
  name: string;
  name2?: string;
  street?: string;
  city: string;
  pincode?: string;
  country: string;
  email?: string;
  phone?: string;
}
