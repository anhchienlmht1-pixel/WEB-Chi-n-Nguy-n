// Static reference profiles for listed symbols — cleared at the user's
// request so profile data can be set up fresh. Keep the shape here; UI
// consumers already treat a missing/empty entry as "no static profile"
// and fall back gracefully (live KBS/VCI profile data where available, or
// hide the field/section entirely).
export interface CompanyProfile {
  fullName: string;
  sector?: string;
  website?: string;
  founded?: number;
  headquarters?: string;
  description?: string;
}

export const COMPANY_PROFILES: Record<string, CompanyProfile> = {};
