import { saleorClient } from "./src/lib/saleor";

// Query to get warehouses
const WAREHOUSES_QUERY = `
  query Warehouses {
    warehouses {
      id
      name
      slug
      address {
        streetAddress1
        streetAddress2
        city
        countryArea
        postalCode
        country {
          code
          country
        }
      }
    }
  }
`;

async function main() {
  try {
    console.log("Fetching warehouses from Saleor Cloud...");
    const response = await saleorClient.query(WAREHOUSES_QUERY, {});
    console.log("Response:", JSON.stringify(response, null, 2));
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    // Try to get more details
    if (error.networkError) {
      console.error("Network error:", error.networkError);
    }
    if (error.graphQLErrors) {
      console.error("GraphQL errors:", error.graphQLErrors);
    }
  }
}

main();