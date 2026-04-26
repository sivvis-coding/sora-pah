import apiClient from '../../../shared/api/client';

export interface AdPerson {
  oid: string;
  displayName: string;
  mail: string | null;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
}

export const graphApi = {
  searchPeople: (search: string): Promise<AdPerson[]> =>
    apiClient.get('/graph/people', { params: { search } }).then((r) => r.data),
};
