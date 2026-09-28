// Instant skeleton while the server resolves the grid — covers the Render
// cold-start window so a first visit reads as "loading", not "broken".
export default function ProductsLoading() {
  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto h-8 w-48 animate-pulse rounded bg-gray-200" />
          <div className="mx-auto mt-4 h-5 w-80 animate-pulse rounded bg-gray-100" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3 lg:grid-cols-4 xl:gap-x-8">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <div className="aspect-square w-full animate-pulse rounded-lg bg-gray-100" />
              <div className="mt-4 h-4 w-3/4 animate-pulse rounded bg-gray-100" />
              <div className="mt-2 h-4 w-1/4 animate-pulse rounded bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
