import { gql } from "graphql-tag";

export const GET_CHECKOUT_QUERY = gql`
  query GetCheckout($checkoutId: ID!) {
    checkout(id: $checkoutId) {
      id
      email
      shippingAddress {
        id
        firstName
        lastName
        companyName
        streetAddress1
        streetAddress2
        city
        countryArea
        postalCode
        country {
          code
          country
        }
        phone
      }
      billingAddress {
        id
        firstName
        lastName
        companyName
        streetAddress1
        streetAddress2
        city
        countryArea
        postalCode
        country {
          code
          country
        }
        phone
      }
      lines {
        id
        quantity
        variant {
          id
          name
          sku
          product {
            id
            name
            slug
            thumbnail {
              url
              alt
            }
          }
          pricing {
            price {
              gross {
                amount
                currency
              }
            }
          }
        }
      }
      subtotal: subtotalPrice {
        gross {
          amount
          currency
        }
      }
      shippingPrice {
        gross {
          amount
          currency
        }
      }
      total: totalPrice {
        gross {
          amount
          currency
        }
      }
      isShippingRequired
      chargeStatus
      authorizeStatus
      availableShippingMethods {
        id
        name
        price {
          gross {
            amount
            currency
          }
        }
      }
      availableCollectionPoints {
        id
        name
        clickAndCollectOption
      }
      shippingMethod {
        id
        name
      }
      deliveryMethod {
        __typename
        ... on ShippingMethod {
          id
          name
        }
        ... on Warehouse {
          id
          name
        }
      }
    }
  }
`;

// Sets both shipping and billing to the same address in one round-trip. The
// storefront collects a single address; Saleor requires a billing address for
// checkoutComplete, so we always mirror it. When shipping isn't required
// (pickup-only cart) the shippingAddress update is a harmless no-op.
export const UPDATE_CHECKOUT_ADDRESS_MUTATION = gql`
  mutation UpdateCheckoutAddress($checkoutId: ID!, $address: AddressInput!) {
    checkoutShippingAddressUpdate(
      checkoutId: $checkoutId
      shippingAddress: $address
    ) {
      errors {
        field
        message
      }
    }
    checkoutBillingAddressUpdate(
      checkoutId: $checkoutId
      billingAddress: $address
    ) {
      checkout {
        id
        shippingAddress {
          firstName
          lastName
          streetAddress1
          city
          countryArea
          postalCode
          country {
            code
          }
        }
        billingAddress {
          city
          countryArea
          postalCode
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_CHECKOUT_EMAIL_MUTATION = gql`
  mutation UpdateCheckoutEmail($checkoutId: ID!, $email: String!) {
    checkoutEmailUpdate(checkoutId: $checkoutId, email: $email) {
      checkout {
        id
        email
      }
      errors {
        field
        message
      }
    }
  }
`;

// Sets the checkout delivery method. deliveryMethodId accepts EITHER a
// ShippingMethod id OR a Warehouse (collection point) id, so this single
// mutation drives both regular shipping and click-and-collect pickup.
export const UPDATE_DELIVERY_METHOD_MUTATION = gql`
  mutation UpdateDeliveryMethod($checkoutId: ID!, $deliveryMethodId: ID!) {
    checkoutDeliveryMethodUpdate(
      id: $checkoutId
      deliveryMethodId: $deliveryMethodId
    ) {
      checkout {
        id
        deliveryMethod {
          __typename
          ... on ShippingMethod {
            id
            name
          }
          ... on Warehouse {
            id
            name
          }
        }
        shippingMethod {
          id
          name
        }
        shippingPrice {
          gross {
            amount
            currency
          }
        }
        total {
          gross {
            amount
            currency
          }
        }
      }
      errors {
        field
        message
      }
    }
  }
`;

// Real Saleor checkout completion. With the Transactions API, the checkout must
// be fully authorized or charged (or the channel must allow unpaid orders)
// before this succeeds. Called server-side after a transaction is recorded.
export const CHECKOUT_COMPLETE_MUTATION = gql`
  mutation CheckoutComplete($checkoutId: ID!) {
    checkoutComplete(id: $checkoutId) {
      order {
        id
        number
        status
        total {
          gross {
            amount
            currency
          }
        }
      }
      confirmationNeeded
      confirmationData
      errors {
        field
        message
        code
      }
    }
  }
`;

export const GET_COUNTRIES_QUERY = gql`
  query GetCountries {
    countries {
      code
      country
    }
  }
`;
