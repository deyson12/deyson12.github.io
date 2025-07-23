import { Routes } from '@angular/router';

export default [
  {
    path: 'all',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'food-and-drinks',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'fashion',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'electronics',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'home',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'health-and-beauty',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'sports-and-outdoors',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'automotive',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'toys-and-entertainment',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'pets',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'services',
    loadComponent: () =>
      import('./product/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'cart',
    loadComponent: () =>
      import('./product/cart/cart.component').then(m => m.CartComponent)
  },
  {
    path: 'product-detail/:uuid',
    loadComponent: () =>
      import('./product/product-detail/product-detail.component').then(m => m.ProductDetailComponent)
  },
  {
    path: 'all-filtered/:q',
    loadComponent: () =>
      import('./product/all-filtered/all-filtered.component').then(m => m.AllFilteredComponent)
  },
  {
    path: 'seller-profile',
    loadComponent: () =>
      import('./product/seller-profile/seller-profile.component').then(m => m.SellerProfileComponent)
  },
  {
    path: 'profile',
    loadComponent: () =>
      import('./seller/profile/profile.component').then(m => m.ProfileComponent)
  },
  {
    path: 'my-sales',
    loadComponent: () =>
      import('./seller/my-sales/my-sales.component').then(m => m.MySalesComponent)
  },
  {
    path: 'payment',
    loadComponent: () =>
      import('./seller/payment-help/payment-help.component').then(m => m.PaymentHelpComponent)
  },
  {
    path: 'logout',
    loadComponent: () =>
      import('./seller/logout/logout.component').then(m => m.LogoutComponent)
  },
  {
    path: 'create-seller',
    loadComponent: () =>
      import('./seller/create-seller/create-seller.component').then(m => m.CreateSellerComponent)
  },
  {
    path: 'invoice',
    loadComponent: () =>
      import('./admin/invoice/invoice.component').then(m => m.InvoiceComponent)
  },
  {
    path: 'test',
    loadComponent: () =>
      import('./admin/test/test.component').then(m => m.TestComponent)
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./admin/dashboard/dashboard.component').then(m => m.DashboardComponent)
  },
  {
    path: 'cache',
    loadComponent: () =>
      import('./admin/cache/cache.component').then(m => m.CacheComponent)
  },
  {
    path: 'dropshipping',
    loadComponent: () =>
      import('./admin/dropshipping/dropshipping.component').then(m => m.DropshippingComponent)
  },
  { path: '**', redirectTo: '/pages/all' }
] as Routes;

