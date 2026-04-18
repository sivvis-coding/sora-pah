export interface JwtPayload {
  /** Azure AD object ID */
  oid: string;
  /** User email (preferred_username or email claim) */
  email: string;
  /** Display name */
  name: string;
  /** Token issuer */
  iss?: string;
  /** Token audience */
  aud?: string;
}
