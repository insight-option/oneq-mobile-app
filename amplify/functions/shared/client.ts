import { Amplify } from 'aws-amplify';
import { generateClient } from 'aws-amplify/data';
import { getAmplifyDataClientConfig } from '@aws-amplify/backend/function/runtime';
import type { Schema } from '../../data/resource';

export type DataClient = ReturnType<typeof generateClient<Schema>>;
type DataEnv = Parameters<typeof getAmplifyDataClientConfig>[0];

let clientPromise: Promise<DataClient> | null = null;

/**
 * One configured AppSync data client per Lambda container (IAM auth through the function's resource access).
 * The generated `$amplify/env/<fn>` object carries the data endpoint variables once the schema grants the function access.
 */
export const getClient = (env: Record<string, string | undefined>): Promise<DataClient> => {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { resourceConfig, libraryOptions } = await getAmplifyDataClientConfig(env as unknown as DataEnv);
      Amplify.configure(resourceConfig, libraryOptions);
      return generateClient<Schema>();
    })();
  }
  return clientPromise;
};

/** Throws the first GraphQL error of a data call (or when no row came back), otherwise returns the row. */
export const unwrap = <T>(res: { data: T | null | undefined; errors?: { message: string }[] | null }, context: string): T => {
  if (res.errors?.length) throw new Error(`${context}: ${res.errors.map((e) => e.message).join('; ')}`);
  if (res.data == null) throw new Error(`${context}: EMPTY_RESULT`);
  return res.data;
};

/** Reads every page of a list query (small tables only: seeded catalogue, one customer's rows, ...). */
export const listAll = async <T>(fetchPage: (nextToken?: string | null) => Promise<{ data: T[]; nextToken?: string | null }>): Promise<T[]> => {
  const out: T[] = [];
  let token: string | null | undefined;
  do {
    const page = await fetchPage(token);
    out.push(...page.data);
    token = page.nextToken;
  } while (token);
  return out;
};
