import { gql } from "graphql-tag";

const CART_FIELDS = gql`
  fragment CartFields on Checkout {
    id
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
    total: totalPrice {
      gross {
        amount
        currency
      }
    }
  }
`;

export const CREATE_CART_MUTATION = gql`
  ${CART_FIELDS}
  mutation CreateCart($channel: String!, $lines: [CheckoutLineInput!]!) {
    checkoutCreate(input: { channel: $channel, lines: $lines }) {
      checkout {
        ...CartFields
      }
      errors {
        field
        message
      }
    }
  }
`;

export const ADD_TO_CART_MUTATION = gql`
  ${CART_FIELDS}
  mutation AddToCart($id: ID!, $lines: [CheckoutLineInput!]!) {
    checkoutLinesAdd(id: $id, lines: $lines) {
      checkout {
        ...CartFields
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_CART_LINE_MUTATION = gql`
  ${CART_FIELDS}
  mutation UpdateCartLine($id: ID!, $lineId: ID!, $quantity: Int!) {
    checkoutLinesUpdate(
      id: $id
      lines: [{ lineId: $lineId, quantity: $quantity }]
    ) {
      checkout {
        ...CartFields
      }
      errors {
        field
        message
      }
    }
  }
`;

export const REMOVE_CART_LINE_MUTATION = gql`
  ${CART_FIELDS}
  mutation RemoveCartLine($id: ID!, $lineId: ID!) {
    checkoutLinesDelete(id: $id, linesIds: [$lineId]) {
      checkout {
        ...CartFields
      }
      errors {
        field
        message
      }
    }
  }
`;

export const GET_CART_QUERY = gql`
  ${CART_FIELDS}
  query GetCart($cartId: ID!) {
    checkout(id: $cartId) {
      ...CartFields
    }
  }
`;
