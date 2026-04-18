import React from 'react';
import { RouteObject } from 'react-router-dom';
import ProductList from './pages/ProductList';
import ProductDetail from './pages/ProductDetail';

export const productRoutes: RouteObject[] = [
  { path: 'products', element: <ProductList /> },
  { path: 'products/:id', element: <ProductDetail /> },
];
