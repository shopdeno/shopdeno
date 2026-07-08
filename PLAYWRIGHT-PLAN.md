# Playwright Checkout Flow Testing Plan

## Context
This plan outlines how to implement Playwright end-to-end tests for all checkout flows in the Catalyst Next.js storefront. The checkout system supports:
1. Collect (studio pickup) flow - Payment at studio on collection
2. Ship to address flow - Payment via PesaPal (M-Pesa/Visa/Mastercard)
3. Ship to address flow - Payment via PayPal
4. Single item and multi-item cart scenarios

Currently, there are no existing test files or Playwright configuration in the repository.

## Approach
1. Set up Playwright testing framework
2. Create test utility functions for common actions
3. Implement test cases for each checkout flow:
   - Collect flow with studio pickup
   - Shipping flow with PesaPal payment
   - Shipping flow with PayPal payment
   - Edge cases (invalid forms, empty cart, etc.)
4. Configure test environment to work with local Saleor instance
5. Implement test data cleanup strategies

## Implementation Steps

### 1. Install Playwright and dependencies
```bash
npm i -D playwright @playwright/test
npx playwright install
```

### 2. Create Playwright configuration
Create `playwright.config.ts` with:
- Test directory: `tests/`
- Base URL: `http://localhost:3000`
- Timeout: 30 seconds
- Retry on failure: 2 times
- Video recording: on failure only
- Screenshot: on failure only

### 3. Create test utilities
File: `tests/utils/checkout.ts`
- `setupCart`: Add products to cart via API or UI
- `clearCart`: Clear cart before each test
- `fillAddressForm`: Helper to fill shipping/billing address
- `selectDeliveryMethod`: Choose collect or ship
- `selectPaymentMethod`: Choose payment option
- `completeOrder`: Submit order and verify result
- `verifyOrderConfirmation`: Check order success page

### 4. Implement test cases

File: `tests/checkout-flows.test.ts`

#### Test Suite 1: Collect Flow
- Test collect flow with valid information
- Test collect flow with missing required fields
- Test collect flow proceeds to payment step correctly

#### Test Suite 2: Shipping + PesaPal Flow
- Test shipping to valid address with PesaPal selection
- Test PesaPal payment initiation (mock or test credentials)
- Test return URL handling from PesaPal

#### Test Suite 3: Shipping + PayPal Flow
- Test shipping to valid address with PayPal selection
- Test PayPal payment initiation (sandbox credentials)
- Test return URL handling from PayPal

#### Test Suite 4: Multi-item Cart
- Test collect flow with multiple products
- Test shipping flow with multiple products
- Verify cart summary accuracy

#### Test Suite 5: Error Handling
- Test invalid email validation
- Test invalid phone number handling
- Test missing required fields
- Test address validation errors

### 5. Environment Setup
- Ensure `.env` contains test credentials:
  - `NEXT_PUBLIC_SALEOR_API_URL=http://localhost:8000/graphql/`
  - `PESAPAL_CONSUMER_KEY` (test sandbox)
  - `PESAPAL_CONSUMER_SECRET` (test sandbox)
  - `PAYPAL_CLIENT_ID` (sandbox)
  - `PAYPAL_CLIENT_SECRET` (sandbox)
  - Optional: test product IDs/SKUs

### 6. Test Data Management
- Use dedicated test customer email pattern
- Clear test data after each test run
- Consider using test-specific cart IDs
- Optionally: create/delete test products via API

### 7. Verification Points
For each flow, verify:
- Correct step progression (information → shipping/payment → payment → confirmation)
- Form validation works correctly
- Correct payment method is selected
- Order confirmation page shows expected information
- Order ID is generated and displayed
- Appropriate success messages shown
- Studio pickup shows collection details when applicable

### 8. CI/CD Considerations
- Add test script to package.json: `"test:e2e": "playwright test"`
- Configure GitHub Actions workflow for automated testing
- Consider test isolation for parallel execution

## Files to Create
1. `playwright.config.ts` - Playwright configuration
2. `tests/utils/checkout.ts` - Test helper functions
3. `tests/checkout-flows.test.ts` - Main test suite
4. `tests/test-data/setup.ts` - Test data initialization (optional)
5. Update `package.json` with test scripts

## Dependencies
- Playwright v1.40+
- Node.js 18+
- Local Saleor instance running on :8000
- Test payment gateway credentials (sandbox mode recommended)

## Notes
- The checkout flow uses client-side routing, so Playwright must wait for navigation
- Some actions depend on Saleor API responses, need to account for loading states
- Payment gateway integration may require mocking or using sandbox test cards
- Studio pickup flow uses hardcoded warehouse ID from site config
- Address forms require country/state validation for shipping flows