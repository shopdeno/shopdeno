import { gql } from "graphql-tag";

// Server-only GraphQL docs for Saleor's Transactions API. These require the
// HANDLE_PAYMENTS permission, so they are only ever executed via the app token
// in src/lib/saleor-server.ts (never from the browser urql client).

// Creates a TransactionItem on a checkout (or order). Pass exactly one of the
// amount fields to set the initial state:
//   - amountAuthorized: funds reserved but not captured (offline / pay-later)
//   - amountCharged:    funds captured (gateway confirmed payment)
// The optional transactionEvent records an initial event for the audit trail.
export const TRANSACTION_CREATE = gql`
  mutation TransactionCreate(
    $id: ID!
    $transaction: TransactionCreateInput!
    $transactionEvent: TransactionEventInput
  ) {
    transactionCreate(
      id: $id
      transaction: $transaction
      transactionEvent: $transactionEvent
    ) {
      transaction {
        id
        pspReference
        authorizedAmount {
          amount
          currency
        }
        chargedAmount {
          amount
          currency
        }
      }
      errors {
        field
        message
        code
      }
    }
  }
`;

// Reports a gateway event (e.g. CHARGE_SUCCESS) against an existing transaction.
// Idempotent by pspReference: Saleor dedupes events with the same
// (transaction, pspReference, type), so replaying an IPN/webhook is safe.
export const TRANSACTION_EVENT_REPORT = gql`
  mutation TransactionEventReport(
    $id: ID!
    $type: TransactionEventTypeEnum!
    $amount: PositiveDecimal!
    $pspReference: String!
    $message: String
  ) {
    transactionEventReport(
      id: $id
      type: $type
      amount: $amount
      pspReference: $pspReference
      message: $message
    ) {
      alreadyProcessed
      transaction {
        id
        chargedAmount {
          amount
          currency
        }
        authorizedAmount {
          amount
          currency
        }
      }
      transactionEvent {
        id
        type
      }
      errors {
        field
        message
        code
      }
    }
  }
`;
