import { CheckoutProvider } from "@/context/CheckoutContext";
import { CheckoutContent } from "./CheckoutContent";
import { getSaleorClient } from "@/lib/saleor";
import { GET_COUNTRIES_QUERY } from "@/graphql/checkout";

export default async function CheckoutPage() {
  const client = getSaleorClient();
  const result = await client.query(GET_COUNTRIES_QUERY, {});
  const countries: { code: string; country: string }[] = result.data?.shop?.countries ?? [];

  return (
    <CheckoutProvider>
      <CheckoutContent countries={countries} />
    </CheckoutProvider>
  );
}
