import { gql } from "graphql-tag";

export const LOGIN_MUTATION = gql`
  mutation Login($email: String!, $password: String!) {
    tokenCreate(email: $email, password: $password) {
      token
      refreshToken
      errors {
        field
        message
      }
    }
  }
`;

export const REGISTER_MUTATION = gql`
  mutation Register(
    $email: String!
    $password: String!
    $firstName: String!
    $lastName: String!
  ) {
    accountRegister(
      input: { email: $email, password: $password, firstName: $firstName, lastName: $lastName }
    ) {
      user {
        id
        email
        firstName
        lastName
      }
      errors {
        field
        message
      }
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      errors {
        field
        message
      }
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($oldPassword: String!, $newPassword: String!) {
    passwordChange(oldPassword: $oldPassword, newPassword: $newPassword) {
      errors {
        field
        message
      }
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($email: String!) {
    requestPasswordReset(email: $email, channel: "default-channel") {
      errors {
        field
        message
      }
    }
  }
`;

export const CUSTOMER_QUERY = gql`
  query Customer {
    me {
      id      firstName

      email
      lastName
      addresses {
        id
        firstName
        lastName
        companyName
        streetAddress1
        streetAddress2
        city
        postalCode
        country {
          code
          country
        }
        phone
      }
      defaultBillingAddress {
        id
      }
      defaultShippingAddress {
        id
      }
    }
  }
`;

export const ORDERS_QUERY = gql`
  query Orders($first: Int!) {
    me {
      orders(first: $first, sortBy: { field: CREATED_AT, direction: DESC }) {
        edges {
          node {
            id
            number
            created
            status
            total {
              gross {
                amount
                currency
              }
            }
            lines {
              id
              productName
              quantity
            }
          }
        }
        pageInfo {
          hasNextPage
        }
      }
    }
  }
`;

export const ORDER_DETAIL_QUERY = gql`
  query OrderDetail($id: ID!) {
    order(id: $id) {
      id
      number
      created
      status
      subtotal {
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
      total {
        gross {
          amount
          currency
        }
      }
      shippingAddress {
        firstName
        lastName
        streetAddress1
        streetAddress2
        city
        postalCode
        country {
          code
          country
        }
      }
      billingAddress {
        firstName
        lastName
        streetAddress1
        streetAddress2
        city
        postalCode
        country {
          code
          country
        }
      }
      lines {
        id
        productName
        variantName
        quantity
        unitPrice {
          gross {
            amount
            currency
          }
        }
        totalPrice {
          gross {
            amount
            currency
          }
        }
      }
    }
  }
`;

export const CREATE_ADDRESS_MUTATION = gql`
  mutation CreateAddress($input: AddressInput!) {
    accountAddressCreate(input: $input) {
      address {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;

export const UPDATE_ADDRESS_MUTATION = gql`
  mutation UpdateAddress($id: ID!, $input: AddressInput!) {
    accountAddressUpdate(id: $id, input: $input) {
      address {
        id
      }
      errors {
        field
        message
      }
    }
  }
`;

export const DELETE_ADDRESS_MUTATION = gql`
  mutation DeleteAddress($id: ID!) {
    accountAddressDelete(id: $id) {
      errors {
        field
        message
      }
    }
  }
`;

export const SET_DEFAULT_ADDRESS_MUTATION = gql`
  mutation SetDefaultAddress($id: ID!, $type: AddressTypeEnum!) {
    accountSetDefaultAddress(id: $id, type: $type) {
      errors {
        field
        message
      }
    }
  }
`;
