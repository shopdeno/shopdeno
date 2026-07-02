import { createClient, cacheExchange, fetchExchange } from "urql";
import { CHANNELS_QUERY } from "@/graphql/queries";
import { getAuthToken } from "@/lib/auth-token";

function getSaleorApiUrl() {
  const url = process.env.NEXT_PUBLIC_SALEOR_API_URL;
  if (!url) {
    throw new Error("NEXT_PUBLIC_SALEOR_API_URL environment variable is not set");
  }
  return url;
}

export function getChannel() {
  return process.env.NEXT_PUBLIC_SALEOR_CHANNEL || "default-channel";
}

export async function getAvailableChannel() {
  const client = getSaleorClient();
  try {
    const result = await client.query(CHANNELS_QUERY, {}).toPromise();
    const channels = result.data?.channels;
    if (channels && channels.length > 0) {
      return channels[0].slug;
    }
  } catch (error) {
    console.error("Error fetching channels:", error);
  }
  return "default-channel";
}

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSaleorClient() {
  if (clientInstance) return clientInstance;
  
  clientInstance = createClient({
    url: getSaleorApiUrl(),
    exchanges: [cacheExchange, fetchExchange],
    // Saleor serves the GraphiQL playground HTML on GET /graphql/, so force
    // POST for queries (urql v5 defaults to GET when the query fits in the URL).
    preferGetMethod: false,
    fetchOptions: () => {
      const token = getAuthToken();
      return {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      };
    },
  });
  
  return clientInstance;
}

export const saleorClient = {
  query: async (query: any, variables?: any) => {
    const client = getSaleorClient();
    return client.query(query, variables).toPromise();
  },
  mutation: async (mutation: any, variables?: any) => {
    const client = getSaleorClient();
    return client.mutation(mutation, variables).toPromise();
  },
};
