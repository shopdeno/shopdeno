// Instant skeleton for product detail — covers the Render cold-start window.
export default function ProductDetailLoading() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
        <div className="mb-8 h-4 w-64 animate-pulse rounded bg-gray-100" />
        <div className="lg:grid lg:grid-cols-2 lg:gap-x-12">
          <div>
            <div className="aspect-square w-full animate-pulse rounded-xl bg-gray-100" />
            <div className="mt-4 flex gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-24 w-24 flex-shrink-0 animate-pulse rounded-lg bg-gray-100" />
              ))}
            </div>
          </div>
          <div className="mt-10 lg:mt-0">
            <div className="h-8 w-3/4 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-9 w-32 animate-pulse rounded bg-gray-200" />
            <div className="mt-4 h-4 w-full animate-pulse rounded bg-gray-100" />
            <div className="mt-2 h-4 w-5/6 animate-pulse rounded bg-gray-100" />
            <div className="mt-6 h-12 w-full animate-pulse rounded-full bg-gray-200" />
          </div>
        </div>
      </div>
    </div>
  );
}
