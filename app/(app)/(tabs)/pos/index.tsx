import React, { useState, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, Modal, ScrollView, Alert, ActivityIndicator,
  Platform, useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useProducts, useCategories, type ProductWithCategory } from '@/hooks/useProducts';
import { useCreateInvoice } from '@/hooks/useInvoices';
import { useCustomers, useCreateCustomer, useAddLoyaltyPoints } from '@/hooks/useCustomers';
import { Colors, Spacing, Radius } from '@/constants/colors';

// ── Types ──────────────────────────────────────────────────────────────────────
type CartItem = {
  product_id: string;
  name: string;
  unit_price: number;
  cost_price: number;
  quantity: number;
  total: number;
};

type Receipt = {
  items: CartItem[];
  subtotal: number;
  discountAmt: number;
  total: number;
  paymentMethod: string;
  cashGiven: number;
  change: number;
  customerName: string | null;
  date: Date;
};

const PAYMENT_METHODS = [
  { key: 'card',   label: 'CB',      icon: 'card-outline' as const },
  { key: 'cash',   label: 'Espèces', icon: 'cash-outline' as const },
  { key: 'mobile', label: 'Mobile',  icon: 'phone-portrait-outline' as const },
];

const QUICK_AMOUNTS = [5, 10, 20, 50, 100];

function showAlert(title: string, message?: string) {
  if (Platform.OS === 'web') {
    window.alert(message ? `${title}\n${message}` : title);
  } else {
    Alert.alert(title, message);
  }
}

const round2 = (n: number) => Math.round(n * 100) / 100;

// ── Numpad ─────────────────────────────────────────────────────────────────────
function Numpad({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  function press(key: string) {
    if (key === 'C') { onChange(''); return; }
    if (key === '⌫') { onChange(value.slice(0, -1)); return; }
    if (key === '.' && value.includes('.')) return;
    if (key === '.' && value === '') { onChange('0.'); return; }
    const parts = value.split('.');
    if (parts[1]?.length >= 2) return;
    onChange(value + key);
  }
  const rows = [['7','8','9'],['4','5','6'],['1','2','3'],['.','0','⌫']];
  return (
    <View style={np.grid}>
      {rows.map((row, ri) => (
        <View key={ri} style={np.row}>
          {row.map(k => (
            <TouchableOpacity
              key={k}
              style={[np.key, k === '⌫' && np.keyDel]}
              onPress={() => press(k)}
              activeOpacity={0.65}
            >
              {k === '⌫'
                ? <Ionicons name="backspace-outline" size={20} color={Colors.danger} />
                : <Text style={np.keyTxt}>{k}</Text>}
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const np = StyleSheet.create({
  grid: { gap: 8 },
  row: { flexDirection: 'row', gap: 8 },
  key: {
    flex: 1, height: 52, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  keyDel: { backgroundColor: `${Colors.danger}10`, borderColor: `${Colors.danger}30` },
  keyTxt: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary },
});

// ── Carte produit ──────────────────────────────────────────────────────────────
function ProductCard({ product, qty, onAdd, onRemove }: {
  product: ProductWithCategory; qty: number; onAdd: () => void; onRemove: () => void;
}) {
  const outOfStock = product.stock_quantity === 0;
  const catColor = product.categories?.color ?? Colors.primary;

  return (
    <TouchableOpacity
      style={[pc.card, outOfStock && pc.disabled, qty > 0 && pc.selected]}
      onPress={onAdd}
      activeOpacity={outOfStock ? 1 : 0.75}
      disabled={outOfStock}
    >
      <View style={[pc.colorBar, { backgroundColor: catColor }]} />
      <View style={pc.body}>
        <Text style={pc.name} numberOfLines={2}>{product.name}</Text>
        <View style={pc.footer}>
          <Text style={[pc.price, { color: outOfStock ? Colors.textMuted : Colors.primary }]}>
            {product.selling_price.toFixed(2)} €
          </Text>
          <View style={[pc.stockBadge, { backgroundColor: outOfStock ? `${Colors.danger}15` : `${Colors.success}15` }]}>
            <Text style={[pc.stockTxt, { color: outOfStock ? Colors.danger : Colors.success }]}>
              {outOfStock ? 'Épuisé' : `${product.stock_quantity}`}
            </Text>
          </View>
        </View>
      </View>
      {qty > 0 && (
        <View style={pc.badge}>
          <TouchableOpacity
            onPress={(e) => { e.stopPropagation?.(); onRemove(); }}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 2 }}
          >
            <Text style={pc.badgeMinus}>−</Text>
          </TouchableOpacity>
          <Text style={pc.badgeCount}>{qty}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const pc = StyleSheet.create({
  card: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.lg,
    overflow: 'hidden', minHeight: 110,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  disabled: { opacity: 0.4 },
  selected: { borderColor: Colors.primary },
  colorBar: { height: 4 },
  body: { flex: 1, padding: 12, justifyContent: 'space-between' },
  name: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, lineHeight: 18 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  price: { fontSize: 16, fontWeight: '900', letterSpacing: -0.5 },
  stockBadge: { paddingHorizontal: 7, paddingVertical: 3, borderRadius: Radius.full },
  stockTxt: { fontSize: 10, fontWeight: '700' },
  badge: {
    position: 'absolute', top: 8, right: 8,
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 4,
  },
  badgeMinus: { color: '#0B0D11', fontSize: 16, fontWeight: '900', lineHeight: 18 },
  badgeCount: { color: '#0B0D11', fontSize: 13, fontWeight: '900' },
});

// ── Ticket de caisse ───────────────────────────────────────────────────────────
function ReceiptModal({ receipt, onClose }: { receipt: Receipt; onClose: () => void }) {
  const dateStr = receipt.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = receipt.date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const pmLabel = PAYMENT_METHODS.find(m => m.key === receipt.paymentMethod)?.label ?? receipt.paymentMethod;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={rm.overlay}>
        <View style={rm.sheet}>
          <View style={rm.handle} />

          {/* Header */}
          <View style={rm.header}>
            <View style={rm.logoWrap}><Text style={rm.logoTxt}>P</Text></View>
            <View style={{ flex: 1 }}>
              <Text style={rm.brand}>Prelvio Gestion</Text>
              <Text style={rm.date}>{dateStr} · {timeStr}</Text>
            </View>
            <TouchableOpacity style={rm.closeBtn} onPress={onClose}>
              <Ionicons name="close" size={18} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {receipt.customerName && (
            <View style={rm.customerRow}>
              <Ionicons name="person-circle-outline" size={16} color={Colors.primary} />
              <Text style={rm.customerTxt}>{receipt.customerName}</Text>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
            <View style={rm.divider} />

            {receipt.items.map((item) => (
              <View key={item.product_id} style={rm.line}>
                <View style={{ flex: 1 }}>
                  <Text style={rm.lineName}>{item.name}</Text>
                  <Text style={rm.lineQty}>{item.quantity} × {item.unit_price.toFixed(2)} €</Text>
                </View>
                <Text style={rm.lineTotal}>{item.total.toFixed(2)} €</Text>
              </View>
            ))}

            <View style={rm.divider} />

            <View style={rm.totals}>
              <View style={rm.totalRow}>
                <Text style={rm.totalLabel}>Sous-total</Text>
                <Text style={rm.totalVal}>{receipt.subtotal.toFixed(2)} €</Text>
              </View>
              {receipt.discountAmt > 0 && (
                <View style={rm.totalRow}>
                  <Text style={rm.totalLabel}>Remise</Text>
                  <Text style={[rm.totalVal, { color: Colors.success }]}>−{receipt.discountAmt.toFixed(2)} €</Text>
                </View>
              )}
              <View style={[rm.totalRow, rm.totalBig]}>
                <Text style={rm.totalBigLabel}>TOTAL TTC</Text>
                <Text style={rm.totalBigVal}>{receipt.total.toFixed(2)} €</Text>
              </View>
              <View style={rm.totalRow}>
                <Text style={rm.totalLabel}>Paiement</Text>
                <Text style={[rm.totalVal, { color: Colors.primary }]}>{pmLabel}</Text>
              </View>
              {receipt.paymentMethod === 'cash' && receipt.cashGiven > 0 && (
                <>
                  <View style={rm.totalRow}>
                    <Text style={rm.totalLabel}>Reçu</Text>
                    <Text style={rm.totalVal}>{receipt.cashGiven.toFixed(2)} €</Text>
                  </View>
                  <View style={rm.totalRow}>
                    <Text style={rm.totalLabel}>Monnaie</Text>
                    <Text style={[rm.totalVal, { color: Colors.success, fontWeight: '800' }]}>{receipt.change.toFixed(2)} €</Text>
                  </View>
                </>
              )}
            </View>

            <View style={rm.divider} />
            <Text style={rm.thank}>Merci pour votre achat !</Text>
          </ScrollView>

          <TouchableOpacity style={rm.doneBtn} onPress={onClose}>
            <Ionicons name="checkmark-circle" size={20} color="#0B0D11" />
            <Text style={rm.doneTxt}>Fermer le ticket</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const rm = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: { backgroundColor: Colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, maxHeight: '90%', paddingHorizontal: Spacing.lg },
  handle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  logoWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  logoTxt: { fontSize: 20, fontWeight: '900', color: '#0B0D11' },
  brand: { fontSize: 16, fontWeight: '800', color: Colors.textPrimary },
  date: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: `${Colors.primary}10`, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 12 },
  customerTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: 16 },
  line: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 8 },
  lineName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  lineQty: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  lineTotal: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  totals: { gap: 10 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 13, color: Colors.textSecondary },
  totalVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  totalBig: { backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, paddingHorizontal: 12, paddingVertical: 10, marginTop: 4 },
  totalBigLabel: { fontSize: 13, fontWeight: '800', color: Colors.textPrimary },
  totalBigVal: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
  thank: { textAlign: 'center', fontSize: 14, color: Colors.textMuted, fontStyle: 'italic' },
  doneBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, marginTop: 16, marginBottom: 8 },
  doneTxt: { fontSize: 16, fontWeight: '800', color: '#0B0D11' },
});

// ── Écran principal ────────────────────────────────────────────────────────────
export default function POSScreen() {
  const { data: products = [], isLoading } = useProducts();
  const { data: categories = [] } = useCategories();
  const { data: customers = [] } = useCustomers();
  const createInvoice = useCreateInvoice();
  const createCustomer = useCreateCustomer();
  const addLoyaltyPoints = useAddLoyaltyPoints();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartVisible, setCartVisible] = useState(false);
  const [discountType, setDiscountType] = useState<'pct' | 'fixed'>('fixed');
  const [discountValue, setDiscountValue] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [cashGiven, setCashGiven] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerPickerOpen, setCustomerPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [laserMode, setLaserMode] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [newClientMode, setNewClientMode] = useState(false);
  const [newLastName, setNewLastName] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [freeProductName, setFreeProductName] = useState('');
  const [freeProductPrice, setFreeProductPrice] = useState('');
  const [freeProductOpen, setFreeProductOpen] = useState(false);
  const [customTotal, setCustomTotal] = useState('');
  const [customTotalEnabled, setCustomTotalEnabled] = useState(false);

  const searchRef = useRef<TextInput>(null);
  const { width: screenWidth } = useWindowDimensions();
  const isWide = screenWidth >= 768;

  // ── Calculs ─────────────────────────────────────────────────────────────────
  const subtotal = round2(cart.reduce((s, i) => s + i.total, 0));
  const discountRaw = parseFloat(discountValue || '0') || 0;
  const discountAmt = round2(discountType === 'pct'
    ? subtotal * (discountRaw / 100)
    : Math.min(discountRaw, subtotal));
  const calculatedTotal = round2(subtotal - discountAmt);
  const total = customTotalEnabled && customTotal !== '' ? round2(parseFloat(customTotal) || 0) : calculatedTotal;
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);
  const cashGivenNum = round2(parseFloat(cashGiven) || 0);
  const change = round2(Math.max(0, cashGivenNum - total));
  const selectedCustomer = customers.find(c => c.id === selectedCustomerId) ?? null;

  const filtered = useMemo(() => products.filter(p => {
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()) || (p.barcode ?? '').includes(search);
    const matchCat = !selectedCategory || p.category_id === selectedCategory;
    return matchSearch && matchCat;
  }), [products, search, selectedCategory]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      `${c.last_name}${c.first_name ? ' ' + c.first_name : ''}`.toLowerCase().includes(q)
      || (c.email ?? '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [customers, customerSearch]);

  // ── Cart ─────────────────────────────────────────────────────────────────────
  function getQty(productId: string) {
    return cart.find(i => i.product_id === productId)?.quantity ?? 0;
  }

  function addToCart(product: ProductWithCategory) {
    const inCart = getQty(product.id);
    if (inCart >= product.stock_quantity) {
      showAlert('Stock insuffisant', `Stock disponible: ${product.stock_quantity}`);
      return;
    }
    setCart(prev => {
      const existing = prev.find(i => i.product_id === product.id);
      if (existing) {
        const newQty = existing.quantity + 1;
        return prev.map(i => i.product_id === product.id
          ? { ...i, quantity: newQty, total: round2(newQty * i.unit_price) }
          : i);
      }
      return [...prev, {
        product_id: product.id, name: product.name,
        unit_price: product.selling_price, cost_price: product.cost_price,
        quantity: 1, total: product.selling_price,
      }];
    });
  }

  function removeFromCart(productId: string) {
    setCart(prev => {
      const existing = prev.find(i => i.product_id === productId);
      if (!existing) return prev;
      if (existing.quantity === 1) return prev.filter(i => i.product_id !== productId);
      const newQty = existing.quantity - 1;
      return prev.map(i => i.product_id === productId
        ? { ...i, quantity: newQty, total: round2(newQty * i.unit_price) }
        : i);
    });
  }

  function addFreeProduct() {
    const name = freeProductName.trim() || 'Article libre';
    const price = round2(parseFloat(freeProductPrice) || 0);
    if (price <= 0) { showAlert('Prix invalide', 'Veuillez saisir un prix valide.'); return; }
    setCart(prev => [...prev, {
      product_id: `free-${Date.now()}`, name,
      unit_price: price, cost_price: 0, quantity: 1, total: price,
    }]);
    setFreeProductName('');
    setFreeProductPrice('');
    setFreeProductOpen(false);
  }

  function pressFreeNumpad(key: string) {
    setFreeProductPrice(prev => {
      if (key === 'C') return '';
      if (key === '⌫') return prev.slice(0, -1);
      if (key === '.' && prev.includes('.')) return prev;
      if (key === '.' && prev === '') return '0.';
      const parts = prev.split('.');
      if (parts[1]?.length >= 2) return prev;
      return prev + key;
    });
  }

  // ── Scanner ──────────────────────────────────────────────────────────────────
  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScannerOpen(true);
  }

  function handleBarcodeScan({ data }: { data: string }) {
    setScannerOpen(false);
    const product = products.find(p => p.barcode === data.trim());
    if (product) {
      addToCart(product);
    } else {
      showAlert('Produit introuvable', `Aucun produit avec le code : ${data.trim()}`);
    }
  }

  function toggleLaserMode() {
    const next = !laserMode;
    setLaserMode(next);
    if (next) { setSearch(''); setTimeout(() => searchRef.current?.focus(), 100); }
  }

  function handleSearchSubmit() {
    if (laserMode && search.trim()) {
      const product = products.find(p => p.barcode === search.trim());
      if (product) { addToCart(product); setSearch(''); }
      else showAlert('Produit introuvable', `Code : ${search.trim()}`);
    }
  }

  // ── Nouveau client rapide ────────────────────────────────────────────────────
  async function handleCreateQuickCustomer() {
    if (!newLastName.trim()) { showAlert('Nom requis'); return; }
    try {
      const c = await createCustomer.mutateAsync({
        store_id: '', last_name: newLastName.trim(),
        first_name: newFirstName.trim() || null,
        email: newEmail.trim() || null, phone: newPhone.trim() || null,
        address: null, segment: 'regular', notes: null,
      });
      setSelectedCustomerId(c.id);
      setCustomerPickerOpen(false);
      setNewClientMode(false);
      setNewLastName(''); setNewFirstName(''); setNewEmail(''); setNewPhone('');
    } catch (e: any) { showAlert('Erreur', e.message); }
  }

  // ── Encaissement ─────────────────────────────────────────────────────────────
  async function handleCheckout() {
    if (cart.length === 0) return;
    try {
      await createInvoice.mutateAsync({
        customer_id: selectedCustomerId,
        items: cart, tax_rate: 0, discount: discountAmt,
        payment_method: paymentMethod,
        notes: 'Vente directe (Caisse)',
        due_date: null, status: 'paid',
      });
      if (selectedCustomerId) {
        const pts = Math.floor(total);
        if (pts > 0) addLoyaltyPoints.mutate({ customerId: selectedCustomerId, pointsToAdd: pts });
      }
      const r: Receipt = {
        items: [...cart], subtotal, discountAmt, total,
        paymentMethod, cashGiven: cashGivenNum, change,
        customerName: selectedCustomer
          ? `${selectedCustomer.last_name}${selectedCustomer.first_name ? ' ' + selectedCustomer.first_name : ''}`
          : null,
        date: new Date(),
      };
      setCart([]);
      setDiscountValue('');
      setCashGiven('');
      setCustomTotal('');
      setCustomTotalEnabled(false);
      setSelectedCustomerId(null);
      setCustomerSearch('');
      setCartVisible(false);
      setReceipt(r);
    } catch (e: any) { showAlert('Erreur', e.message); }
  }

  // ── Panneau produits ─────────────────────────────────────────────────────────
  function renderProductsPanel() {
    return (
      <View style={s.productsPanel}>
        {/* Barre recherche */}
        <View style={s.searchRow}>
          <View style={[s.searchWrap, laserMode && s.searchWrapLaser]}>
            <Ionicons
              name={laserMode ? 'barcode-outline' : 'search-outline'}
              size={17}
              color={laserMode ? Colors.primary : Colors.textMuted}
              style={{ marginRight: 8 }}
            />
            <TextInput
              ref={searchRef}
              style={s.searchInput}
              placeholder={laserMode ? 'En attente du scanner...' : 'Rechercher un produit...'}
              placeholderTextColor={laserMode ? Colors.primary : Colors.textMuted}
              value={search}
              onChangeText={setSearch}
              onSubmitEditing={handleSearchSubmit}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={16} color={Colors.textMuted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            style={[s.iconBtn, laserMode && s.iconBtnActive]}
            onPress={toggleLaserMode}
          >
            <Ionicons name="barcode-outline" size={20} color={laserMode ? '#0B0D11' : Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} onPress={openScanner}>
            <Ionicons name="camera-outline" size={20} color={Colors.primary} />
          </TouchableOpacity>
        </View>

        {laserMode && (
          <View style={s.laserBanner}>
            <View style={s.laserDot} />
            <Text style={s.laserTxt}>Mode scanner actif</Text>
          </View>
        )}

        {/* Catégories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.catRow}
            style={{ flexShrink: 0 }}
          >
            <TouchableOpacity
              style={[s.catChip, !selectedCategory && s.catChipActive]}
              onPress={() => setSelectedCategory(null)}
            >
              <Text style={[s.catChipTxt, !selectedCategory && s.catChipTxtActive]}>Tous</Text>
            </TouchableOpacity>
            {categories.map(cat => {
              const active = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[s.catChip, active && { borderColor: cat.color, backgroundColor: `${cat.color}18` }]}
                  onPress={() => setSelectedCategory(active ? null : cat.id)}
                >
                  <View style={[s.catDot, { backgroundColor: cat.color }]} />
                  <Text style={[s.catChipTxt, active && { color: cat.color, fontWeight: '700' }]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Grille produits */}
        {isLoading ? (
          <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={p => p.id}
            numColumns={isWide ? 3 : 2}
            key={isWide ? 'wide' : 'mobile'}
            columnWrapperStyle={{ gap: 10 }}
            contentContainerStyle={[s.grid, !isWide && cartCount > 0 && { paddingBottom: 88 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <ProductCard
                product={item}
                qty={getQty(item.id)}
                onAdd={() => addToCart(item)}
                onRemove={() => removeFromCart(item.id)}
              />
            )}
            ListEmptyComponent={
              <View style={s.center}>
                <View style={s.emptyIcon}>
                  <Ionicons name="cube-outline" size={32} color={Colors.textMuted} />
                </View>
                <Text style={s.emptyTitle}>Aucun produit</Text>
                <Text style={s.emptySub}>Ajoutez des produits au stock.</Text>
              </View>
            }
          />
        )}
      </View>
    );
  }

  // ── Panneau panier + paiement ────────────────────────────────────────────────
  function renderCartPaymentPanel(scrollable = true) {
    const content = (
      <>
        {/* Panier */}
        <View style={s.cartSection}>
          <View style={s.cartSectionHeader}>
            <Text style={s.panelLabel}>PANIER</Text>
            {cart.length > 0 && (
              <TouchableOpacity onPress={() => setCart([])}>
                <Text style={s.clearCartTxt}>Vider</Text>
              </TouchableOpacity>
            )}
          </View>

          {cart.length === 0 ? (
            <View style={s.emptyCartWrap}>
              <Ionicons name="cart-outline" size={24} color={Colors.textMuted} />
              <Text style={s.emptyCartTxt}>Panier vide</Text>
            </View>
          ) : (
            <>
              {cart.map(item => (
                <View key={item.product_id} style={s.cartItem}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cartItemName} numberOfLines={1}>{item.name}</Text>
                    <Text style={s.cartItemMeta}>{item.unit_price.toFixed(2)} € × {item.quantity}</Text>
                  </View>
                  <View style={s.cartItemControls}>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => removeFromCart(item.product_id)}>
                      <Text style={s.qtyBtnTxt}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.cartItemTotal}>{item.total.toFixed(2)} €</Text>
                    <TouchableOpacity style={s.qtyBtn} onPress={() => {
                      if (item.product_id.startsWith('free-')) {
                        setCart(prev => prev.map(i => i.product_id === item.product_id
                          ? { ...i, quantity: i.quantity + 1, total: round2((i.quantity + 1) * i.unit_price) }
                          : i));
                      } else {
                        const p = products.find(pr => pr.id === item.product_id);
                        if (p) addToCart(p);
                      }
                    }}>
                      <Text style={s.qtyBtnTxt}>+</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </>
          )}

          {/* Article libre */}
          <TouchableOpacity
            style={s.freeToggle}
            onPress={() => setFreeProductOpen(!freeProductOpen)}
          >
            <Ionicons name={freeProductOpen ? 'remove-circle-outline' : 'add-circle-outline'} size={16} color={Colors.primary} />
            <Text style={s.freeToggleTxt}>Article libre</Text>
          </TouchableOpacity>

          {freeProductOpen && (
            <View style={s.freeCard}>
              <TextInput
                style={s.freeInput}
                placeholder="Nom de l'article (optionnel)"
                placeholderTextColor={Colors.textMuted}
                value={freeProductName}
                onChangeText={setFreeProductName}
              />
              <View style={s.freePriceRow}>
                <Text style={s.freePriceLabel}>Prix</Text>
                <Text style={s.freePriceVal}>
                  {freeProductPrice || '0'}{freeProductPrice.includes('.') ? '' : '.00'} €
                </Text>
              </View>
              <View style={s.freeNumpadWrap}>
                {[['7','8','9'],['4','5','6'],['1','2','3'],['.','0','⌫']].map((row, ri) => (
                  <View key={ri} style={{ flexDirection: 'row', gap: 6 }}>
                    {row.map(k => (
                      <TouchableOpacity
                        key={k}
                        style={[s.freeKey, k === '⌫' && s.freeKeyDel]}
                        onPress={() => pressFreeNumpad(k)}
                      >
                        {k === '⌫'
                          ? <Ionicons name="backspace-outline" size={16} color={Colors.danger} />
                          : <Text style={s.freeKeyTxt}>{k}</Text>}
                      </TouchableOpacity>
                    ))}
                  </View>
                ))}
              </View>
              <TouchableOpacity
                style={[s.freeAddBtn, !freeProductPrice && { opacity: 0.4 }]}
                onPress={addFreeProduct}
                disabled={!freeProductPrice}
              >
                <Ionicons name="add" size={16} color="#0B0D11" />
                <Text style={s.freeAddBtnTxt}>Ajouter au panier</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Client */}
        <View style={s.paySection}>
          <Text style={s.panelLabel}>CLIENT</Text>
          <TouchableOpacity
            style={s.customerBtn}
            onPress={() => { setCustomerPickerOpen(!customerPickerOpen); setNewClientMode(false); setCustomerSearch(''); }}
          >
            <View style={[s.customerAvatar, selectedCustomer && { backgroundColor: `${Colors.primary}20`, borderColor: Colors.primary }]}>
              {selectedCustomer ? (
                <Text style={[s.customerInitial, { color: Colors.primary }]}>
                  {selectedCustomer.last_name[0].toUpperCase()}
                </Text>
              ) : (
                <Ionicons name="person-outline" size={15} color={Colors.textMuted} />
              )}
            </View>
            <Text style={[s.customerBtnTxt, selectedCustomer && { color: Colors.textPrimary, fontWeight: '700' }]}>
              {selectedCustomer
                ? `${selectedCustomer.last_name}${selectedCustomer.first_name ? ' ' + selectedCustomer.first_name : ''}`
                : 'Vente anonyme'}
            </Text>
            {selectedCustomer && (
              <View style={s.ptsBadge}>
                <Ionicons name="star" size={10} color={Colors.primary} />
                <Text style={s.ptsBadgeTxt}>{selectedCustomer.loyalty_points} pts</Text>
              </View>
            )}
            <Ionicons name={customerPickerOpen ? 'chevron-up' : 'chevron-down'} size={14} color={Colors.textMuted} />
          </TouchableOpacity>

          {customerPickerOpen && (
            <View style={s.customerDropdown}>
              {newClientMode ? (
                <View style={{ gap: 8 }}>
                  <TextInput style={s.dropInput} placeholder="Nom *" placeholderTextColor={Colors.textMuted}
                    value={newLastName} onChangeText={setNewLastName} autoCapitalize="words" />
                  <TextInput style={s.dropInput} placeholder="Prénom" placeholderTextColor={Colors.textMuted}
                    value={newFirstName} onChangeText={setNewFirstName} autoCapitalize="words" />
                  <TextInput style={s.dropInput} placeholder="Email" placeholderTextColor={Colors.textMuted}
                    value={newEmail} onChangeText={setNewEmail} keyboardType="email-address" autoCapitalize="none" />
                  <TextInput style={s.dropInput} placeholder="Téléphone" placeholderTextColor={Colors.textMuted}
                    value={newPhone} onChangeText={setNewPhone} keyboardType="phone-pad" />
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TouchableOpacity style={[s.dropBtn, { flex: 1 }]} onPress={handleCreateQuickCustomer} disabled={createCustomer.isPending}>
                      {createCustomer.isPending
                        ? <ActivityIndicator size="small" color="#0B0D11" />
                        : <Text style={s.dropBtnTxt}>Créer</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.dropBtnOutline, { flex: 1 }]} onPress={() => setNewClientMode(false)}>
                      <Text style={s.dropBtnOutlineTxt}>Retour</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <>
                  <TouchableOpacity style={s.newClientRow} onPress={() => setNewClientMode(true)}>
                    <View style={s.newClientIcon}>
                      <Ionicons name="person-add-outline" size={14} color={Colors.primary} />
                    </View>
                    <Text style={s.newClientTxt}>Nouveau client</Text>
                    <Ionicons name="chevron-forward" size={13} color={Colors.primary} />
                  </TouchableOpacity>
                  <View style={s.dropSearch}>
                    <Ionicons name="search-outline" size={14} color={Colors.textMuted} />
                    <TextInput
                      style={s.dropSearchInput}
                      placeholder="Rechercher..."
                      placeholderTextColor={Colors.textMuted}
                      value={customerSearch}
                      onChangeText={setCustomerSearch}
                    />
                  </View>
                  <TouchableOpacity
                    style={s.customerRow}
                    onPress={() => { setSelectedCustomerId(null); setCustomerPickerOpen(false); setCustomerSearch(''); }}
                  >
                    <Text style={[s.customerRowTxt, { color: Colors.textMuted }]}>Vente anonyme</Text>
                    {!selectedCustomerId && <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />}
                  </TouchableOpacity>
                  {filteredCustomers.map(c => (
                    <TouchableOpacity
                      key={c.id}
                      style={s.customerRow}
                      onPress={() => { setSelectedCustomerId(c.id); setCustomerPickerOpen(false); setCustomerSearch(''); }}
                    >
                      <Text style={s.customerRowTxt} numberOfLines={1}>
                        {`${c.last_name}${c.first_name ? ' ' + c.first_name : ''}`}
                      </Text>
                      {selectedCustomerId === c.id && <Ionicons name="checkmark-circle" size={15} color={Colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          )}
        </View>

        <View style={s.divider} />

        {/* Remise */}
        <View style={s.paySection}>
          <Text style={s.panelLabel}>REMISE</Text>
          <View style={s.discountRow}>
            <View style={s.discountToggle}>
              {(['fixed', 'pct'] as const).map(t => (
                <TouchableOpacity
                  key={t}
                  style={[s.discountTypeBtn, discountType === t && s.discountTypeBtnActive]}
                  onPress={() => setDiscountType(t)}
                >
                  <Text style={[s.discountTypeTxt, discountType === t && s.discountTypeTxtActive]}>
                    {t === 'fixed' ? '€' : '%'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              style={s.discountInput}
              placeholder="0"
              placeholderTextColor={Colors.textMuted}
              value={discountValue}
              onChangeText={setDiscountValue}
              keyboardType="decimal-pad"
            />
          </View>
        </View>

        <View style={s.divider} />

        {/* Mode de paiement */}
        <View style={s.paySection}>
          <Text style={s.panelLabel}>PAIEMENT</Text>
          <View style={s.paymentRow}>
            {PAYMENT_METHODS.map(m => {
              const active = paymentMethod === m.key;
              return (
                <TouchableOpacity
                  key={m.key}
                  style={[s.payBtn, active && s.payBtnActive]}
                  onPress={() => setPaymentMethod(m.key)}
                >
                  <Ionicons name={m.icon} size={20} color={active ? '#0B0D11' : Colors.textSecondary} />
                  <Text style={[s.payBtnTxt, active && s.payBtnTxtActive]}>{m.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Numpad espèces */}
        {paymentMethod === 'cash' && (
          <>
            <View style={s.divider} />
            <View style={s.paySection}>
              <Text style={s.panelLabel}>MONTANT REÇU</Text>
              <View style={s.cashDisplay}>
                <Text style={[s.cashDisplayVal, cashGiven === '' && { color: Colors.textMuted }]}>
                  {cashGiven === '' ? `${total.toFixed(2)} €` : `${cashGiven} €`}
                </Text>
                {change > 0 && (
                  <View style={s.changePill}>
                    <Text style={s.changePillTxt}>Monnaie : {change.toFixed(2)} €</Text>
                  </View>
                )}
                {cashGivenNum > 0 && cashGivenNum < total && (
                  <Text style={s.remainingTxt}>Reste : {round2(total - cashGivenNum).toFixed(2)} €</Text>
                )}
              </View>
              <View style={s.quickAmounts}>
                {QUICK_AMOUNTS.map(a => (
                  <TouchableOpacity key={a} style={s.quickAmountBtn} onPress={() => setCashGiven(String(a))}>
                    <Text style={s.quickAmountTxt}>{a}€</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity style={[s.quickAmountBtn, { borderColor: Colors.primary }]} onPress={() => setCashGiven(total.toFixed(2))}>
                  <Text style={[s.quickAmountTxt, { color: Colors.primary }]}>Exact</Text>
                </TouchableOpacity>
              </View>
              <Numpad value={cashGiven} onChange={setCashGiven} />
            </View>
          </>
        )}

        <View style={s.divider} />

        {/* Récapitulatif + encaisser */}
        <View style={s.paySection}>
          {subtotal > 0 && (
            <View style={s.summaryRows}>
              <View style={s.summaryRow}>
                <Text style={s.summaryLabel}>Sous-total</Text>
                <Text style={s.summaryVal}>{subtotal.toFixed(2)} €</Text>
              </View>
              {discountAmt > 0 && (
                <View style={s.summaryRow}>
                  <Text style={s.summaryLabel}>Remise</Text>
                  <Text style={[s.summaryVal, { color: Colors.success }]}>−{discountAmt.toFixed(2)} €</Text>
                </View>
              )}
            </View>
          )}

          <View style={s.totalRow}>
            <View>
              <Text style={s.totalLabel}>TOTAL</Text>
              {customTotalEnabled ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <TextInput
                    style={s.customTotalInput}
                    value={customTotal}
                    onChangeText={setCustomTotal}
                    keyboardType="decimal-pad"
                    placeholder={calculatedTotal.toFixed(2)}
                    placeholderTextColor={Colors.textMuted}
                  />
                  <Text style={s.totalVal}>€</Text>
                </View>
              ) : (
                <Text style={s.totalVal}>{total.toFixed(2)} €</Text>
              )}
            </View>
            <TouchableOpacity
              style={s.customTotalBtn}
              onPress={() => { setCustomTotalEnabled(!customTotalEnabled); setCustomTotal(''); }}
            >
              <Ionicons name={customTotalEnabled ? 'close-circle-outline' : 'create-outline'} size={14} color={Colors.primary} />
              <Text style={s.customTotalBtnTxt}>{customTotalEnabled ? 'Annuler' : 'Modifier'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[s.checkoutBtn, (cart.length === 0 || createInvoice.isPending) && { opacity: 0.4 }]}
            onPress={handleCheckout}
            disabled={cart.length === 0 || createInvoice.isPending}
            activeOpacity={0.85}
          >
            {createInvoice.isPending ? (
              <ActivityIndicator color="#0B0D11" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={22} color="#0B0D11" />
                <Text style={s.checkoutTxt}>Encaisser · {total.toFixed(2)} €</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </>
    );

    if (!scrollable) return content;
    return (
      <ScrollView style={s.cartPanelScroll} showsVerticalScrollIndicator={false}>
        {content}
      </ScrollView>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root}>
      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.title}>Caisse</Text>
          <Text style={s.subtitle}>{filtered.length} produit{filtered.length !== 1 ? 's' : ''}</Text>
        </View>
        {!isWide && cartCount > 0 && (
          <TouchableOpacity style={s.cartHeaderBtn} onPress={() => setCartVisible(true)}>
            <View style={s.cartHeaderBadge}><Text style={s.cartHeaderBadgeTxt}>{cartCount}</Text></View>
            <Text style={s.cartHeaderTxt}>Panier · {total.toFixed(2)} €</Text>
          </TouchableOpacity>
        )}
      </View>

      {isWide ? (
        /* ── Layout large : produits gauche | panier+paiement droite ── */
        <View style={s.splitLayout}>
          <View style={s.leftCol}>
            {renderProductsPanel()}
          </View>
          <View style={s.rightCol}>
            {renderCartPaymentPanel(true)}
          </View>
        </View>
      ) : (
        /* ── Layout mobile : produits plein écran ── */
        <>
          {renderProductsPanel()}
          {cartCount > 0 && (
            <TouchableOpacity style={s.cartBar} onPress={() => setCartVisible(true)} activeOpacity={0.9}>
              <View style={s.cartBarLeft}>
                <View style={s.cartBarBadge}>
                  <Text style={s.cartBarBadgeTxt}>{cartCount}</Text>
                </View>
                <Text style={s.cartBarLabel}>article{cartCount > 1 ? 's' : ''}</Text>
              </View>
              <View style={s.cartBarRight}>
                <Text style={s.cartBarTotal}>{total.toFixed(2)} €</Text>
                <Ionicons name="chevron-forward" size={18} color="#0B0D11" />
              </View>
            </TouchableOpacity>
          )}
        </>
      )}

      {/* Scanner modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          <CameraView
            style={{ flex: 1 }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <View style={s.scannerOverlay}>
            <Text style={s.scannerTitle}>Scanner un produit</Text>
            <View style={s.scannerFrame} />
            <Text style={s.scannerHint}>Pointez vers un code-barres</Text>
            <TouchableOpacity style={s.scannerCloseBtn} onPress={() => setScannerOpen(false)}>
              <Text style={s.scannerCloseTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Panier modal (mobile) */}
      {!isWide && (
        <Modal visible={cartVisible} animationType="slide" transparent onRequestClose={() => setCartVisible(false)}>
          <View style={s.modalOverlay}>
            <View style={s.bottomSheet}>
              <View style={s.sheetHandle} />
              <View style={s.sheetHeader}>
                <Text style={s.sheetTitle}>Panier · {cartCount} article{cartCount > 1 ? 's' : ''}</Text>
                <TouchableOpacity
                  style={s.sheetCloseBtn}
                  onPress={() => setCartVisible(false)}
                >
                  <Ionicons name="close" size={18} color={Colors.textSecondary} />
                </TouchableOpacity>
              </View>
              {renderCartPaymentPanel(true)}
            </View>
          </View>
        </Modal>
      )}

      {/* Ticket */}
      {receipt && <ReceiptModal receipt={receipt} onClose={() => setReceipt(null)} />}
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  // Header
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingTop: Spacing.md, paddingBottom: Spacing.sm,
  },
  title: { fontSize: 28, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 12, color: Colors.textSecondary, marginTop: 1 },
  cartHeaderBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  cartHeaderBadge: {
    backgroundColor: '#0B0D11', borderRadius: 10,
    minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
  },
  cartHeaderBadgeTxt: { color: Colors.primary, fontSize: 11, fontWeight: '900' },
  cartHeaderTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 13 },

  // Split layout
  splitLayout: { flex: 1, flexDirection: 'row' },
  leftCol: { flex: 3 },
  rightCol: {
    width: 340, backgroundColor: Colors.surface,
    borderLeftWidth: 1, borderLeftColor: Colors.border,
  },
  cartPanelScroll: { flex: 1 },

  // Products panel
  productsPanel: { flex: 1 },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm,
  },
  searchWrap: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border, paddingHorizontal: 14, height: 46,
  },
  searchWrapLaser: { borderColor: Colors.primary, borderWidth: 2 },
  searchInput: { flex: 1, color: Colors.textPrimary, fontSize: 14, paddingVertical: 0 },
  iconBtn: {
    width: 46, height: 46, borderRadius: Radius.md,
    backgroundColor: Colors.surface, borderWidth: 1.5, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  iconBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  laserBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    marginHorizontal: Spacing.lg, marginBottom: Spacing.sm,
    paddingHorizontal: 12, paddingVertical: 7,
    backgroundColor: `${Colors.success}15`, borderRadius: Radius.md,
    borderWidth: 1, borderColor: `${Colors.success}30`,
  },
  laserDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  laserTxt: { fontSize: 12, color: Colors.success, fontWeight: '600' },

  // Catégories
  catRow: { paddingHorizontal: Spacing.lg, gap: 8, paddingBottom: Spacing.sm },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 7,
    backgroundColor: Colors.surface, borderRadius: Radius.full,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  catChipActive: { backgroundColor: `${Colors.primary}15`, borderColor: Colors.primary },
  catChipTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  catChipTxtActive: { color: Colors.primary },
  catDot: { width: 8, height: 8, borderRadius: 4 },

  // Grille produits
  grid: { paddingHorizontal: Spacing.lg, paddingBottom: 24, gap: 10 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 60, gap: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  emptySub: { fontSize: 13, color: Colors.textSecondary, textAlign: 'center' },

  // Cart bar (mobile)
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.primary,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  cartBarBadge: {
    backgroundColor: '#0B0D11', borderRadius: 12,
    minWidth: 24, height: 24, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6,
  },
  cartBarBadgeTxt: { color: Colors.primary, fontSize: 12, fontWeight: '900' },
  cartBarLabel: { fontSize: 14, fontWeight: '600', color: '#0B0D11' },
  cartBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartBarTotal: { fontSize: 22, fontWeight: '900', color: '#0B0D11', letterSpacing: -0.5 },

  // Cart + payment panel
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },
  cartSection: { padding: Spacing.md, gap: 0 },
  cartSectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  panelLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.4 },
  clearCartTxt: { fontSize: 12, fontWeight: '600', color: Colors.danger },
  emptyCartWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 16, paddingHorizontal: 4 },
  emptyCartTxt: { fontSize: 13, color: Colors.textMuted, fontWeight: '500' },

  // Cart items
  cartItem: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  cartItemName: { fontSize: 14, fontWeight: '600', color: Colors.textPrimary },
  cartItemMeta: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28, height: 28, borderRadius: Radius.sm,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  qtyBtnTxt: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary, lineHeight: 22 },
  cartItemTotal: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary, minWidth: 60, textAlign: 'right' },

  // Article libre
  freeToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingTop: 12, paddingBottom: 4,
  },
  freeToggleTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  freeCard: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing.md, gap: 10, marginTop: 8,
  },
  freeInput: {
    backgroundColor: Colors.background, borderRadius: Radius.sm,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 13,
  },
  freePriceRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 4,
  },
  freePriceLabel: { fontSize: 12, color: Colors.textMuted, fontWeight: '600' },
  freePriceVal: { fontSize: 22, fontWeight: '900', color: Colors.primary, letterSpacing: -0.5 },
  freeNumpadWrap: { gap: 6 },
  freeKey: {
    flex: 1, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.background, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  freeKeyDel: { backgroundColor: `${Colors.danger}10`, borderColor: `${Colors.danger}30` },
  freeKeyTxt: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  freeAddBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: Colors.primary, borderRadius: Radius.md, paddingVertical: 11,
  },
  freeAddBtnTxt: { fontSize: 13, fontWeight: '800', color: '#0B0D11' },

  // Sections paiement
  paySection: { padding: Spacing.md, gap: 10 },

  // Client
  customerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 12, paddingVertical: 10,
  },
  customerAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  customerInitial: { fontSize: 13, fontWeight: '800' },
  customerBtnTxt: { flex: 1, fontSize: 13, color: Colors.textMuted, fontWeight: '500' },
  ptsBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: `${Colors.primary}15`, borderRadius: Radius.full,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  ptsBadgeTxt: { fontSize: 11, fontWeight: '700', color: Colors.primary },

  customerDropdown: {
    backgroundColor: Colors.background, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden', marginTop: 4,
  },
  dropInput: {
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
    color: Colors.textPrimary, fontSize: 13,
  },
  dropBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.md,
    paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    margin: 8,
  },
  dropBtnTxt: { fontSize: 13, fontWeight: '800', color: '#0B0D11' },
  dropBtnOutline: {
    borderWidth: 1, borderColor: Colors.border,
    borderRadius: Radius.md, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
    margin: 8,
  },
  dropBtnOutlineTxt: { fontSize: 13, fontWeight: '600', color: Colors.textSecondary },
  newClientRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 12, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  newClientIcon: {
    width: 28, height: 28, borderRadius: Radius.sm,
    backgroundColor: `${Colors.primary}15`, alignItems: 'center', justifyContent: 'center',
  },
  newClientTxt: { flex: 1, fontSize: 13, fontWeight: '600', color: Colors.primary },
  dropSearch: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 12, paddingVertical: 8,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  dropSearchInput: { flex: 1, color: Colors.textPrimary, fontSize: 13 },
  customerRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  customerRowTxt: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary, flex: 1 },

  // Remise
  discountRow: { flexDirection: 'row', gap: 10, alignItems: 'center' },
  discountToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  discountTypeBtn: { paddingHorizontal: 16, paddingVertical: 10 },
  discountTypeBtnActive: { backgroundColor: Colors.primary },
  discountTypeTxt: { fontSize: 14, fontWeight: '700', color: Colors.textSecondary },
  discountTypeTxtActive: { color: '#0B0D11' },
  discountInput: {
    flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    paddingHorizontal: 14, paddingVertical: 10,
    color: Colors.textPrimary, fontSize: 16, fontWeight: '700', textAlign: 'center',
  },

  // Mode de paiement
  paymentRow: { flexDirection: 'row', gap: 8 },
  payBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 12, borderRadius: Radius.md,
    backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border,
  },
  payBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  payBtnTxt: { fontSize: 12, fontWeight: '600', color: Colors.textSecondary },
  payBtnTxtActive: { color: '#0B0D11', fontWeight: '800' },

  // Espèces
  cashDisplay: {
    backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.border,
    padding: 14, alignItems: 'center', gap: 6,
  },
  cashDisplayVal: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: -1 },
  changePill: {
    backgroundColor: `${Colors.success}20`, borderRadius: Radius.full,
    paddingHorizontal: 12, paddingVertical: 4,
  },
  changePillTxt: { fontSize: 13, fontWeight: '700', color: Colors.success },
  remainingTxt: { fontSize: 13, fontWeight: '600', color: Colors.warning },
  quickAmounts: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  quickAmountBtn: {
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: Radius.md, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border,
  },
  quickAmountTxt: { fontSize: 13, fontWeight: '700', color: Colors.textPrimary },

  // Récap + checkout
  summaryRows: { gap: 6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between' },
  summaryLabel: { fontSize: 13, color: Colors.textSecondary },
  summaryVal: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 },
  totalLabel: { fontSize: 10, fontWeight: '800', color: Colors.textMuted, letterSpacing: 1.2 },
  totalVal: { fontSize: 28, fontWeight: '900', color: Colors.primary, letterSpacing: -1 },
  customTotalInput: {
    fontSize: 28, fontWeight: '900', color: Colors.primary,
    borderBottomWidth: 2, borderBottomColor: Colors.primary,
    minWidth: 100, textAlign: 'right', paddingVertical: 0,
  },
  customTotalBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: `${Colors.primary}10`, borderRadius: Radius.full,
  },
  customTotalBtnTxt: { fontSize: 12, fontWeight: '600', color: Colors.primary },
  checkoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingVertical: 18, marginTop: 8,
  },
  checkoutTxt: { fontSize: 17, fontWeight: '900', color: '#0B0D11' },

  // Scanner
  scannerOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    alignItems: 'center', justifyContent: 'center', gap: 24,
  },
  scannerTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textShadowColor: '#000', textShadowRadius: 8, textShadowOffset: { width: 0, height: 2 } },
  scannerFrame: { width: 220, height: 150, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12 },
  scannerHint: { fontSize: 14, color: 'rgba(255,255,255,0.8)' },
  scannerCloseBtn: {
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full,
    paddingHorizontal: 28, paddingVertical: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)',
  },
  scannerCloseTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // Modal sheet
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.65)' },
  bottomSheet: {
    backgroundColor: Colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '92%', paddingBottom: 32,
  },
  sheetHandle: { width: 40, height: 4, backgroundColor: Colors.border, borderRadius: 2, alignSelf: 'center', marginTop: 12, marginBottom: 4 },
  sheetHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.md,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -0.3 },
  sheetCloseBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
});
