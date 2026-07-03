import { gql } from "graphql-tag";

export const CHANNELS_QUERY = gql`
  query Channels {
    channels {
      id
      slug
      name
      currencyCode
    }
  }
`;

export const MAIN_MENU_QUERY = gql`
  query MainMenu($channel: String!) {
    menu(channel: $channel, slug: "main") {
      id
      items {
        id
        name
        url
        category {
          id
          slug
          name
        }
        collection {
          id
          slug
          name
        }
        page {
          slug
          title
        }
      }
    }
  }
`;

export const PRODUCTS_QUERY = gql`
  query Products(
    $channel: String!
    $first: Int!
    $after: String
    $sortBy: ProductOrder
    $filter: ProductFilterInput
  ) {
    products(
      channel: $channel
      first: $first
      after: $after
      sortBy: $sortBy
      filter: $filter
    ) {
      edges {
        node {
          id
          name
          slug
          seoDescription
          rating
          thumbnail(size: 1024) {
            url
            alt
          }
          media {
            url
            alt
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
            priceRangeUndiscounted {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
          category {
            slug
          }
          variants {
            id
            media {
              url
              alt
            }
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`;

export const RELATED_PRODUCTS_QUERY = gql`
  query RelatedProducts($channel: String!, $categoryId: ID!) {
    products(channel: $channel, first: 5, filter: { categories: [$categoryId] }) {
      edges {
        node {
          id
          name
          slug
          thumbnail(size: 1024) {
            url
            alt
          }
          variants {
            id
            media {
              url
              alt
            }
          }
          pricing {
            priceRange {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
            priceRangeUndiscounted {
              start {
                gross {
                  amount
                  currency
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const PRODUCT_DETAIL_QUERY = gql`
  query ProductBySlug($slug: String!, $channel: String!) {
    product(slug: $slug, channel: $channel) {
      id
      name
      slug
      seoDescription
      seoTitle
      description
      descriptionJson
      rating
      isAvailableForPurchase
      availableForPurchase
      pricing {
        priceRange {
          start {
            gross {
              amount
              currency
            }
          }
          stop {
            gross {
              amount
              currency
            }
          }
        }
        priceRangeUndiscounted {
          start {
            gross {
              amount
              currency
            }
          }
        }
      }
      images {
        id
        url
        alt
      }
      thumbnail {
        url
        alt
      }
      variants {
        id
        name
        sku
        media {
          id
          url
          alt
        }
        attributes {
          attribute {
            id
            name
            slug
          }
          values {
            id
            name
            value
            slug
          }
        }
        pricing {
          price {
            gross {
              amount
              currency
            }
          }
          priceUndiscounted {
            gross {
              amount
              currency
            }
          }
        }
      }
      attributes {
        attribute {
          id
          name
          slug
        }
        values {
          id
          name
          value
          slug
        }
      }
      category {
        id
        name
        slug
      }
    }
  }
`;

export const COLLECTION_DETAIL_QUERY = gql`
  query CollectionBySlug($slug: String!, $channel: String!) {
    collection(slug: $slug, channel: $channel) {
      id
      name
      slug
      seoDescription
      seoTitle
      description
      backgroundImage {
        url
        alt
      }
    }
  }
`;

export const COLLECTIONS_QUERY = gql`
  query Collections($channel: String!, $first: Int!) {
    collections(channel: $channel, first: $first) {
      edges {
        node {
          id
          name
          slug
          description
          backgroundImage {
            url
            alt
          }
        }
      }
    }
  }
`;

export const CATEGORY_DETAIL_QUERY = gql`
  query CategoryBySlug($slug: String!) {
    category(slug: $slug) {
      id
      name
      slug
      seoDescription
      seoTitle
      description
      backgroundImage {
        url
        alt
      }
    }
  }
`;

export const BROWSE_CATEGORIES_QUERY = gql`
  query BrowseCategories($first: Int!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          slug
          description
          backgroundImage {
            url
            alt
          }
        }
      }
    }
  }
`;

export const SACCO_LANDING_QUERY = gql`
  query SaccoLanding($first: Int!, $channel: String!) {
    categories(first: $first) {
      edges {
        node {
          id
          name
          slug
          description
          products(first: 5, channel: $channel) {
            edges {
              node {
                thumbnail(size: 1024) {
                  url
                  alt
                }
              }
            }
          }
        }
      }
    }
  }
`;
