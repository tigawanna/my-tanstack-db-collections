import type { RegisteredRouter } from "@tanstack/react-router";

// Export the registered router type for use in type utilities
export type AppRouter = RegisteredRouter;

export type RoutesByPath = RegisteredRouter["routesByPath"];

// Helper type to get all valid route paths
export type ValidRoutes = RegisteredRouter["routesByPath"][keyof RoutesByPath]["fullPath"];

// Get the full search params type for a route (inferred from validateSearch)
export type SearchParamsForRoute<T extends ValidRoutes> = RoutesByPath[T]["types"]["searchSchema"];

// Get the keys of search params for a route
export type SearchParamKeysForRoute<T extends ValidRoutes> = keyof SearchParamsForRoute<T>;

// Get a specific search param type for a route
export type SearchParamValue<
  TRoute extends ValidRoutes,
  TKey extends SearchParamKeysForRoute<TRoute>,
> = SearchParamsForRoute<TRoute>[TKey];

// Example usage:
// type AdminUsersSearchKeys = SearchParamKeysForRoute<"/dashboard/admin/users/">;
// type AdminUsersSearchParams = SearchParamsForRoute<"/dashboard/admin/users/">;
// type SearchFieldValue = SearchParamValue<"/dashboard/admin/users/", "searchField">;
