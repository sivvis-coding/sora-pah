import { UserRole } from '../constants/user-role';

export interface JwtPayload {
  /** Azure AD object ID */
  oid: string;
  /** User email (preferred_username or email claim) */
  email: string;
  /** Display name */
  name: string;
  /** Role — present in dev tokens; in production use the DB value */
  role?: UserRole;
  /** Department from Azure AD / dev token */
  department?: string;
  /** Job title from Azure AD / dev token */
  jobTitle?: string;
  /** Token issuer */
  iss?: string;
  /** Token audience */
  aud?: string;
}
