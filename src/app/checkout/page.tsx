import { CheckoutProvider } from "@/context/CheckoutContext";
import { CheckoutContent } from "./CheckoutContent";

export default function CheckoutPage() {
  return (
    <CheckoutProvider>
      <CheckoutContent />
    </CheckoutProvider>
  );
}
