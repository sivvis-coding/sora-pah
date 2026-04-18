import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Typography,
  Card,
  CardContent,
  CardActionArea,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { productsApi, type Product } from '../api/products.api';

export default function ProductList() {
  const navigate = useNavigate();
  const { t } = useTranslation('products');
  const { t: tShared } = useTranslation('shared');
  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: ['products'],
    queryFn: productsApi.list,
  });

  if (isLoading) return <CircularProgress />;
  if (error) return <Alert severity="error">{tShared('common.errorLoadProducts')}</Alert>;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {t('title')}
      </Typography>
      {data?.length === 0 && (
        <Typography color="text.secondary">
          {t('empty')}
        </Typography>
      )}
      <Grid container spacing={2}>
        {data?.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card>
              <CardActionArea onClick={() => navigate(`/products/${product.id}`)}>
                <CardContent>
                  <Typography variant="h6">{product.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {product.description || t('noDescription')}
                  </Typography>
                </CardContent>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>
    </>
  );
}
