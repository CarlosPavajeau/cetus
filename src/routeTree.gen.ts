/* eslint-disable */

// @ts-nocheck

// noinspection JSUnusedGlobalSymbols

// This file was automatically generated by TanStack Router.
// You should NOT make any changes in this file as it will be overwritten.
// Additionally, you should also exclude this file from your linter and/or formatter to prevent it from being checked or modified.

// Import Routes

import { Route as rootRoute } from './routes/__root'
import { Route as ProductsImport } from './routes/products'
import { Route as OrdersImport } from './routes/orders'
import { Route as CartImport } from './routes/cart'
import { Route as AppImport } from './routes/app'
import { Route as IndexImport } from './routes/index'
import { Route as CartIndexImport } from './routes/cart/index'
import { Route as AppIndexImport } from './routes/app/index'
import { Route as ProductsIdImport } from './routes/products/$id'
import { Route as AppProductsIndexImport } from './routes/app/products/index'
import { Route as AppDashboardIndexImport } from './routes/app/dashboard/index'
import { Route as OrdersOrderIdConfirmationImport } from './routes/orders/$orderId.confirmation'
import { Route as OrdersOrderIdCheckoutImport } from './routes/orders/$orderId.checkout'
import { Route as AppProductsNewImport } from './routes/app/products/new'
import { Route as AppOrdersOrderIdImport } from './routes/app/orders/$orderId'

// Create/Update Routes

const ProductsRoute = ProductsImport.update({
  id: '/products',
  path: '/products',
  getParentRoute: () => rootRoute,
} as any)

const OrdersRoute = OrdersImport.update({
  id: '/orders',
  path: '/orders',
  getParentRoute: () => rootRoute,
} as any)

const CartRoute = CartImport.update({
  id: '/cart',
  path: '/cart',
  getParentRoute: () => rootRoute,
} as any)

const AppRoute = AppImport.update({
  id: '/app',
  path: '/app',
  getParentRoute: () => rootRoute,
} as any)

const IndexRoute = IndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRoute,
} as any)

const CartIndexRoute = CartIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => CartRoute,
} as any)

const AppIndexRoute = AppIndexImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => AppRoute,
} as any)

const ProductsIdRoute = ProductsIdImport.update({
  id: '/$id',
  path: '/$id',
  getParentRoute: () => ProductsRoute,
} as any)

const AppProductsIndexRoute = AppProductsIndexImport.update({
  id: '/products/',
  path: '/products/',
  getParentRoute: () => AppRoute,
} as any)

const AppDashboardIndexRoute = AppDashboardIndexImport.update({
  id: '/dashboard/',
  path: '/dashboard/',
  getParentRoute: () => AppRoute,
} as any)

const OrdersOrderIdConfirmationRoute = OrdersOrderIdConfirmationImport.update({
  id: '/$orderId/confirmation',
  path: '/$orderId/confirmation',
  getParentRoute: () => OrdersRoute,
} as any)

const OrdersOrderIdCheckoutRoute = OrdersOrderIdCheckoutImport.update({
  id: '/$orderId/checkout',
  path: '/$orderId/checkout',
  getParentRoute: () => OrdersRoute,
} as any)

const AppProductsNewRoute = AppProductsNewImport.update({
  id: '/products/new',
  path: '/products/new',
  getParentRoute: () => AppRoute,
} as any)

const AppOrdersOrderIdRoute = AppOrdersOrderIdImport.update({
  id: '/orders/$orderId',
  path: '/orders/$orderId',
  getParentRoute: () => AppRoute,
} as any)

// Populate the FileRoutesByPath interface

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexImport
      parentRoute: typeof rootRoute
    }
    '/app': {
      id: '/app'
      path: '/app'
      fullPath: '/app'
      preLoaderRoute: typeof AppImport
      parentRoute: typeof rootRoute
    }
    '/cart': {
      id: '/cart'
      path: '/cart'
      fullPath: '/cart'
      preLoaderRoute: typeof CartImport
      parentRoute: typeof rootRoute
    }
    '/orders': {
      id: '/orders'
      path: '/orders'
      fullPath: '/orders'
      preLoaderRoute: typeof OrdersImport
      parentRoute: typeof rootRoute
    }
    '/products': {
      id: '/products'
      path: '/products'
      fullPath: '/products'
      preLoaderRoute: typeof ProductsImport
      parentRoute: typeof rootRoute
    }
    '/products/$id': {
      id: '/products/$id'
      path: '/$id'
      fullPath: '/products/$id'
      preLoaderRoute: typeof ProductsIdImport
      parentRoute: typeof ProductsImport
    }
    '/app/': {
      id: '/app/'
      path: '/'
      fullPath: '/app/'
      preLoaderRoute: typeof AppIndexImport
      parentRoute: typeof AppImport
    }
    '/cart/': {
      id: '/cart/'
      path: '/'
      fullPath: '/cart/'
      preLoaderRoute: typeof CartIndexImport
      parentRoute: typeof CartImport
    }
    '/app/orders/$orderId': {
      id: '/app/orders/$orderId'
      path: '/orders/$orderId'
      fullPath: '/app/orders/$orderId'
      preLoaderRoute: typeof AppOrdersOrderIdImport
      parentRoute: typeof AppImport
    }
    '/app/products/new': {
      id: '/app/products/new'
      path: '/products/new'
      fullPath: '/app/products/new'
      preLoaderRoute: typeof AppProductsNewImport
      parentRoute: typeof AppImport
    }
    '/orders/$orderId/checkout': {
      id: '/orders/$orderId/checkout'
      path: '/$orderId/checkout'
      fullPath: '/orders/$orderId/checkout'
      preLoaderRoute: typeof OrdersOrderIdCheckoutImport
      parentRoute: typeof OrdersImport
    }
    '/orders/$orderId/confirmation': {
      id: '/orders/$orderId/confirmation'
      path: '/$orderId/confirmation'
      fullPath: '/orders/$orderId/confirmation'
      preLoaderRoute: typeof OrdersOrderIdConfirmationImport
      parentRoute: typeof OrdersImport
    }
    '/app/dashboard/': {
      id: '/app/dashboard/'
      path: '/dashboard'
      fullPath: '/app/dashboard'
      preLoaderRoute: typeof AppDashboardIndexImport
      parentRoute: typeof AppImport
    }
    '/app/products/': {
      id: '/app/products/'
      path: '/products'
      fullPath: '/app/products'
      preLoaderRoute: typeof AppProductsIndexImport
      parentRoute: typeof AppImport
    }
  }
}

// Create and export the route tree

interface AppRouteChildren {
  AppIndexRoute: typeof AppIndexRoute
  AppOrdersOrderIdRoute: typeof AppOrdersOrderIdRoute
  AppProductsNewRoute: typeof AppProductsNewRoute
  AppDashboardIndexRoute: typeof AppDashboardIndexRoute
  AppProductsIndexRoute: typeof AppProductsIndexRoute
}

const AppRouteChildren: AppRouteChildren = {
  AppIndexRoute: AppIndexRoute,
  AppOrdersOrderIdRoute: AppOrdersOrderIdRoute,
  AppProductsNewRoute: AppProductsNewRoute,
  AppDashboardIndexRoute: AppDashboardIndexRoute,
  AppProductsIndexRoute: AppProductsIndexRoute,
}

const AppRouteWithChildren = AppRoute._addFileChildren(AppRouteChildren)

interface CartRouteChildren {
  CartIndexRoute: typeof CartIndexRoute
}

const CartRouteChildren: CartRouteChildren = {
  CartIndexRoute: CartIndexRoute,
}

const CartRouteWithChildren = CartRoute._addFileChildren(CartRouteChildren)

interface OrdersRouteChildren {
  OrdersOrderIdCheckoutRoute: typeof OrdersOrderIdCheckoutRoute
  OrdersOrderIdConfirmationRoute: typeof OrdersOrderIdConfirmationRoute
}

const OrdersRouteChildren: OrdersRouteChildren = {
  OrdersOrderIdCheckoutRoute: OrdersOrderIdCheckoutRoute,
  OrdersOrderIdConfirmationRoute: OrdersOrderIdConfirmationRoute,
}

const OrdersRouteWithChildren =
  OrdersRoute._addFileChildren(OrdersRouteChildren)

interface ProductsRouteChildren {
  ProductsIdRoute: typeof ProductsIdRoute
}

const ProductsRouteChildren: ProductsRouteChildren = {
  ProductsIdRoute: ProductsIdRoute,
}

const ProductsRouteWithChildren = ProductsRoute._addFileChildren(
  ProductsRouteChildren,
)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/app': typeof AppRouteWithChildren
  '/cart': typeof CartRouteWithChildren
  '/orders': typeof OrdersRouteWithChildren
  '/products': typeof ProductsRouteWithChildren
  '/products/$id': typeof ProductsIdRoute
  '/app/': typeof AppIndexRoute
  '/cart/': typeof CartIndexRoute
  '/app/orders/$orderId': typeof AppOrdersOrderIdRoute
  '/app/products/new': typeof AppProductsNewRoute
  '/orders/$orderId/checkout': typeof OrdersOrderIdCheckoutRoute
  '/orders/$orderId/confirmation': typeof OrdersOrderIdConfirmationRoute
  '/app/dashboard': typeof AppDashboardIndexRoute
  '/app/products': typeof AppProductsIndexRoute
}

export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/orders': typeof OrdersRouteWithChildren
  '/products': typeof ProductsRouteWithChildren
  '/products/$id': typeof ProductsIdRoute
  '/app': typeof AppIndexRoute
  '/cart': typeof CartIndexRoute
  '/app/orders/$orderId': typeof AppOrdersOrderIdRoute
  '/app/products/new': typeof AppProductsNewRoute
  '/orders/$orderId/checkout': typeof OrdersOrderIdCheckoutRoute
  '/orders/$orderId/confirmation': typeof OrdersOrderIdConfirmationRoute
  '/app/dashboard': typeof AppDashboardIndexRoute
  '/app/products': typeof AppProductsIndexRoute
}

export interface FileRoutesById {
  __root__: typeof rootRoute
  '/': typeof IndexRoute
  '/app': typeof AppRouteWithChildren
  '/cart': typeof CartRouteWithChildren
  '/orders': typeof OrdersRouteWithChildren
  '/products': typeof ProductsRouteWithChildren
  '/products/$id': typeof ProductsIdRoute
  '/app/': typeof AppIndexRoute
  '/cart/': typeof CartIndexRoute
  '/app/orders/$orderId': typeof AppOrdersOrderIdRoute
  '/app/products/new': typeof AppProductsNewRoute
  '/orders/$orderId/checkout': typeof OrdersOrderIdCheckoutRoute
  '/orders/$orderId/confirmation': typeof OrdersOrderIdConfirmationRoute
  '/app/dashboard/': typeof AppDashboardIndexRoute
  '/app/products/': typeof AppProductsIndexRoute
}

export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/app'
    | '/cart'
    | '/orders'
    | '/products'
    | '/products/$id'
    | '/app/'
    | '/cart/'
    | '/app/orders/$orderId'
    | '/app/products/new'
    | '/orders/$orderId/checkout'
    | '/orders/$orderId/confirmation'
    | '/app/dashboard'
    | '/app/products'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/orders'
    | '/products'
    | '/products/$id'
    | '/app'
    | '/cart'
    | '/app/orders/$orderId'
    | '/app/products/new'
    | '/orders/$orderId/checkout'
    | '/orders/$orderId/confirmation'
    | '/app/dashboard'
    | '/app/products'
  id:
    | '__root__'
    | '/'
    | '/app'
    | '/cart'
    | '/orders'
    | '/products'
    | '/products/$id'
    | '/app/'
    | '/cart/'
    | '/app/orders/$orderId'
    | '/app/products/new'
    | '/orders/$orderId/checkout'
    | '/orders/$orderId/confirmation'
    | '/app/dashboard/'
    | '/app/products/'
  fileRoutesById: FileRoutesById
}

export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AppRoute: typeof AppRouteWithChildren
  CartRoute: typeof CartRouteWithChildren
  OrdersRoute: typeof OrdersRouteWithChildren
  ProductsRoute: typeof ProductsRouteWithChildren
}

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AppRoute: AppRouteWithChildren,
  CartRoute: CartRouteWithChildren,
  OrdersRoute: OrdersRouteWithChildren,
  ProductsRoute: ProductsRouteWithChildren,
}

export const routeTree = rootRoute
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

/* ROUTE_MANIFEST_START
{
  "routes": {
    "__root__": {
      "filePath": "__root.tsx",
      "children": [
        "/",
        "/app",
        "/cart",
        "/orders",
        "/products"
      ]
    },
    "/": {
      "filePath": "index.tsx"
    },
    "/app": {
      "filePath": "app.tsx",
      "children": [
        "/app/",
        "/app/orders/$orderId",
        "/app/products/new",
        "/app/dashboard/",
        "/app/products/"
      ]
    },
    "/cart": {
      "filePath": "cart.tsx",
      "children": [
        "/cart/"
      ]
    },
    "/orders": {
      "filePath": "orders.tsx",
      "children": [
        "/orders/$orderId/checkout",
        "/orders/$orderId/confirmation"
      ]
    },
    "/products": {
      "filePath": "products.tsx",
      "children": [
        "/products/$id"
      ]
    },
    "/products/$id": {
      "filePath": "products/$id.tsx",
      "parent": "/products"
    },
    "/app/": {
      "filePath": "app/index.tsx",
      "parent": "/app"
    },
    "/cart/": {
      "filePath": "cart/index.tsx",
      "parent": "/cart"
    },
    "/app/orders/$orderId": {
      "filePath": "app/orders/$orderId.tsx",
      "parent": "/app"
    },
    "/app/products/new": {
      "filePath": "app/products/new.tsx",
      "parent": "/app"
    },
    "/orders/$orderId/checkout": {
      "filePath": "orders/$orderId.checkout.tsx",
      "parent": "/orders"
    },
    "/orders/$orderId/confirmation": {
      "filePath": "orders/$orderId.confirmation.tsx",
      "parent": "/orders"
    },
    "/app/dashboard/": {
      "filePath": "app/dashboard/index.tsx",
      "parent": "/app"
    },
    "/app/products/": {
      "filePath": "app/products/index.tsx",
      "parent": "/app"
    }
  }
}
ROUTE_MANIFEST_END */
