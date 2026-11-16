
import { authorizedFetch } from "./api";
import type { Profile, ProfileUpdatePayload } from "../types/profile";

// Get the currently logged-in user's profile
export async function getMyProfile(): Promise<Profile> {
  return authorizedFetch<Profile>("/api/v1/profile/me");
}

// Update the currently logged-in user's profile
export async function updateMyProfile(
  payload: ProfileUpdatePayload
): Promise<Profile> {
  return authorizedFetch<Profile>("/api/v1/profile/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

// Admin-only: Get another user's profile
export async function getUserProfile(
  userId: number
): Promise<Profile> {
  return authorizedFetch<Profile>(`/api/v1/profile/${userId}`);
}
