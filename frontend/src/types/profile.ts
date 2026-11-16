
export interface Profile {
  id: number;
  full_name: string;
  email: string;
  role: "patient" | "doctor" | "clinic" | "admin";
  is_active: boolean;
}

export interface ProfileUpdatePayload {
  full_name?: string;
  email?: string;
}
