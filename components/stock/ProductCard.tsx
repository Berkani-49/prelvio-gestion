import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/colors';
import { calcMargin, calcStockLevel, type ProductWithCategory } from '@/hooks/useProducts';

interface ProductCardProps {
  product: ProductWithCategory;
}

function getStockEmoji(isOutOfStock: boolean, isLowStock: boolean): string {
  if (isOutOfStock) return '🔴';
  if (isLowStock) return '🟡';
  return '🟢';
}

export function ProductCard({ product }: ProductCardProps) {
  const catColor = product.categories?.color ?? Colors.surfaceAlt;
  const { pct: marginPct } = calcMargin(product.cost_price, product.selling_price);
  const { isOutOfStock, isLowStock, fillPct, stockColor } = calcStockLevel(product.stock_quantity, product.low_stock_alert);
  const stockEmoji = getStockEmoji(isOutOfStock, isLowStock);
  const stockLabel = isOutOfStock ? 'Rupture' : isLowStock ? 'Stock bas' : null;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/(app)/(tabs)/stock/${product.id}` as any)}
      activeOpacity={0.75}
    >
      {/* Barre couleur catégorie */}
      <View style={[styles.catBar, { backgroundColor: catColor }]} />

      <View style={styles.body}>
        {/* En-tête */}
        <View style={styles.topRow}>
          <View style={styles.topLeft}>
            <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
            <View style={styles.metaRow}>
              {product.categories?.name && (
                <View style={[styles.catChip, { backgroundColor: `${catColor}20`, borderColor: `${catColor}50` }]}>
                  <Text style={[styles.catDot, { color: catColor }]}>●</Text>
                  <Text style={[styles.catChipTxt, { color: catColor }]}>{product.categories.name}</Text>
                </View>
              )}
              {product.sku ? <Text style={styles.sku}>#{product.sku}</Text> : null}
            </View>
          </View>

          {/* Quantité + statut */}
          <View style={styles.qtyBlock}>
            {stockLabel && (
              <View style={[styles.alertTag, { backgroundColor: `${stockColor}18`, borderColor: `${stockColor}40` }]}>
                <Text style={styles.alertEmoji}>{stockEmoji}</Text>
                <Text style={[styles.alertTagTxt, { color: stockColor }]}>{stockLabel}</Text>
              </View>
            )}
            <Text style={[styles.qty, { color: stockColor }]}>{product.stock_quantity}</Text>
            <Text style={styles.qtyUnit}>{product.unit}</Text>
          </View>
        </View>

        {/* Barre de niveau stock */}
        <View style={styles.barWrap}>
          <View style={[styles.barFill, { width: `${fillPct}%` as any, backgroundColor: stockColor }]} />
        </View>

        {/* Ligne prix */}
        <View style={styles.priceRow}>
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>💰 Vente</Text>
            <Text style={styles.priceVal}>{product.selling_price.toFixed(2)} €</Text>
          </View>
          <View style={styles.priceSep} />
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>📦 Coût</Text>
            <Text style={[styles.priceVal, { color: Colors.textSecondary }]}>{product.cost_price.toFixed(2)} €</Text>
          </View>
          <View style={styles.priceSep} />
          <View style={styles.priceItem}>
            <Text style={styles.priceLabel}>📊 Marge</Text>
            <Text style={[styles.priceVal, { color: marginPct >= 0 ? Colors.success : Colors.danger }]}>
              {marginPct >= 0 ? '+' : ''}{marginPct}%
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.chevron}>›</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    shadowColor: '#6366F1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  catBar: { width: 4 },
  body: { flex: 1, padding: Spacing.md, gap: 10 },

  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  topLeft: { flex: 1, gap: 6, marginRight: 12 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary, letterSpacing: -0.2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  catDot: { fontSize: 8 },
  catChipTxt: { fontSize: 11, fontWeight: '700' },
  sku: { fontSize: 11, color: Colors.textMuted, fontWeight: '500' },

  qtyBlock: { alignItems: 'flex-end', gap: 2 },
  alertTag: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, marginBottom: 2, borderWidth: 1 },
  alertEmoji: { fontSize: 11 },
  alertTagTxt: { fontSize: 10, fontWeight: '700' },
  qty: { fontSize: 30, fontWeight: '900', lineHeight: 32, letterSpacing: -1 },
  qtyUnit: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  barWrap: { height: 4, backgroundColor: Colors.surfaceAlt, borderRadius: 2, overflow: 'hidden' },
  barFill: { height: 4, borderRadius: 2 },

  priceRow: { flexDirection: 'row', alignItems: 'center' },
  priceItem: { flex: 1, gap: 2 },
  priceSep: { width: 1, height: 28, backgroundColor: Colors.border, marginHorizontal: 4 },
  priceLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted },
  priceVal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  chevron: { fontSize: 20, color: Colors.textMuted, alignSelf: 'center', paddingRight: 12 },
});
