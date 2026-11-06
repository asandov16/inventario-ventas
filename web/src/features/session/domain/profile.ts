/** The signed-in user as the app sees it (from get_my_profile). */
export interface CurrentProfile {
  userId: string;
  fullName: string;
  roleCode: string;
  roleName: string;
  business: {
    id: string;
    name: string;
    timezone: string;
  };
  permissions: ReadonlySet<string>;
}

export type ProfileResult =
  { status: 'ok'; profile: CurrentProfile } | { status: 'inactive' } | { status: 'no_profile' };

/** First letter of a name for the avatar and the logo. */
export function initialOf(name: string): string {
  return name.trim().charAt(0).toUpperCase();
}
