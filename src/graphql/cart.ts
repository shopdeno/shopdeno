import { gql } from "graphql-tag";

export const CREATE_CART_MUTATION = gql`
  mutation CreateCart($channel: String!) {
    cartCreate(input: { channel: $channel }) {
      cart {
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
        subtotal {
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

export const ADD_TO_CART_MUTATION = gql`
  mutation AddToCart($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
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
        subtotal {
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

export const UPDATE_CART_LINE_MUTATION = gql`
  mutation UpdateCartLine($cartId: ID!, $lineId: ID!, $quantity: Int!) {
    cartLinesUpdate(
      cartId: $cartId
      lines: [{ lineId: $lineId, quantity: $quantity }]
    ) {
      cart {
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
        subtotal {
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

export const REMOVE_CART_LINE_MUTATION = gql`
  mutation RemoveCartLine($cartId: ID!, $lineId: ID!) {
    cartLinesRemove(cartId: $cartId, lines: [$lineId]) {
      cart {
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
        subtotal {
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

export const GET_CART_QUERY = gql`
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
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
      subtotal {
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
  }
`;
