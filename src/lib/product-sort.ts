// Maps the storefront sort-select values (see ProductGrid SORT_OPTIONS) to a
// Saleor `ProductOrder` object. Saleor expects an object, not a bare string —
// passing a string errors ("Expected ProductOrder, found not an object").
// `channel` is required for price/publication sorts, so it's always included.

export type ProductOrder = {
  field: string;
  direction: "ASC" | "DESC";
  channel?: string;
};

export function toProductOrder(sort: string | undefined, channel: string): ProductOrder {
  switch (sort) {
    case "NAME_DESC":
      return { field: "NAME", direction: "DESC", channel };
    case "PRICE":
      return { field: "MINIMAL_PRICE", direction: "ASC", channel };
    case "PRICE_DESC":
      return { field: "MINIMAL_PRICE", direction: "DESC", channel };
    case "DATE": // "Newest" in the UI
      return { field: "PUBLICATION_DATE", direction: "DESC", channel };
    case "DATE_DESC": // "Oldest" in the UI
      return { field: "PUBLICATION_DATE", direction: "ASC", channel };
    case "NAME":
    default:
      return { field: "NAME", direction: "ASC", channel };
  }
}
