import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, ActivityIndicator, Modal, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useProduct, useUpdateProduct, useCategories, useCreateCategory, CAT_COLORS, STOCK_UNITS, calcMargin } from '@/hooks/useProducts';
import { Input } from '@/components/ui/Input';
import { Colors, Spacing, Radius } from '@/constants/colors';

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product } = useProduct(id);
  const { mutateAsync: updateProduct, isPending } = useUpdateProduct();
  const { data: categories } = useCategories();
  const createCategory = useCreateCategory();

  const [newCatName, setNewCatName] = useState('');
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatColor, setNewCatColor] = useState<string>(CAT_COLORS[0]);

  function handleCreateCategory() {
    if (!newCatName.trim()) return;
    createCategory.mutate({ name: newCatName.trim(), color: newCatColor }, {
      onSuccess: (cat) => {
        update('category_id', cat.id);
        setNewCatName('');
        setShowNewCat(false);
        setNewCatColor(CAT_COLORS[0]);
      },
    });
  }

  const [form, setForm] = useState({
    name: '',
    sku: '',
    barcode: '',
    description: '',
    cost_price: '',
    selling_price: '',
    low_stock_alert: '5',
    unit: 'pièce',
    category_id: '',
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [globalError, setGlobalError] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        description: product.description ?? '',
        cost_price: String(product.cost_price),
        selling_price: String(product.selling_price),
        low_stock_alert: String(product.low_stock_alert),
        unit: product.unit,
        category_id: product.category_id ?? '',
      });
    }
  }, [product]);

  async function openScanner() {
    if (!permission?.granted) {
      const res = await requestPermission();
      if (!res.granted) return;
    }
    setScannerOpen(true);
  }

  function handleBarcodeScan({ data }: { data: string }) {
    update('barcode', data);
    setScannerOpen(false);
  }

  function update(field: keyof typeof form, value: string) {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field]) setErrors((p) => ({ ...p, [field]: undefined }));
  }

  function validate() {
    const e: Partial<typeof form> = {};
    if (!form.name.trim()) e.name = 'Nom requis';
    if (!form.selling_price || isNaN(Number(form.selling_price))) e.selling_price = 'Prix de vente invalide';
    if (!form.cost_price || isNaN(Number(form.cost_price))) e.cost_price = "Prix d'achat invalide";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    setGlobalError('');
    try {
      await updateProduct({
        id,
        name: form.name.trim(),
        sku: form.sku.trim() || null,
        barcode: form.barcode.trim() || null,
        description: form.description.trim() || null,
        cost_price: Number(form.cost_price),
        selling_price: Number(form.selling_price),
        low_stock_alert: Number(form.low_stock_alert) || 5,
        unit: form.unit || 'pièce',
        category_id: form.category_id || null,
      });
      router.back();
    } catch (err: unknown) {
      setGlobalError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    }
  }

  const marginPreview = form.cost_price && form.selling_price && Number(form.cost_price) > 0
    ? calcMargin(Number(form.cost_price), Number(form.selling_price))
    : null;

  return (
    <SafeAreaView style={s.root}>
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={20} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={s.title}>Modifier le produit</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {globalError ? (
          <View style={s.errorBox}>
            <Ionicons name="warning-outline" size={15} color={Colors.danger} />
            <Text style={s.errorTxt}>{globalError}</Text>
          </View>
        ) : null}

        <View style={s.section}>
          <Text style={s.sectionTitle}>Informations générales</Text>
          <Input label="Nom du produit *" placeholder="Ex: T-shirt blanc M" value={form.name} onChangeText={(v) => update('name', v)} error={errors.name} />
          <Input label="SKU (référence interne)" placeholder="Ex: TSH-BL-M" value={form.sku} onChangeText={(v) => update('sku', v)} autoCapitalize="characters" />
          <View>
            <Input label="Code-barres" placeholder="Ex: 3760000000000" value={form.barcode} onChangeText={(v) => update('barcode', v)} keyboardType="numeric" />
            <TouchableOpacity style={s.scanBtn} onPress={openScanner} activeOpacity={0.75}>
              <Ionicons name="camera-outline" size={15} color={Colors.primary} />
              <Text style={s.scanBtnTxt}>Scanner</Text>
            </TouchableOpacity>
          </View>
          <Input label="Description" placeholder="Description optionnelle..." value={form.description} onChangeText={(v) => update('description', v)} multiline numberOfLines={3} />
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Prix</Text>
          <View style={s.row}>
            <View style={s.flex}>
              <Input label="Prix d'achat (€) *" placeholder="0.00" value={form.cost_price} onChangeText={(v) => update('cost_price', v)} keyboardType="decimal-pad" error={errors.cost_price} />
            </View>
            <View style={s.flex}>
              <Input label="Prix de vente (€) *" placeholder="0.00" value={form.selling_price} onChangeText={(v) => update('selling_price', v)} keyboardType="decimal-pad" error={errors.selling_price} />
            </View>
          </View>
          {marginPreview !== null && (
            <View style={s.marginPreview}>
              <View style={s.marginStat}>
                <Text style={[s.marginVal, { color: marginPreview.net >= 0 ? Colors.success : Colors.danger }]}>
                  {marginPreview.net >= 0 ? '+' : ''}{marginPreview.net.toFixed(2)} €
                </Text>
                <Text style={s.marginLbl}>Marge nette</Text>
              </View>
              <View style={s.marginSep} />
              <View style={s.marginStat}>
                <Text style={[s.marginVal, { color: marginPreview.net >= 0 ? Colors.success : Colors.danger }]}>
                  {marginPreview.pct}%
                </Text>
                <Text style={s.marginLbl}>Marge %</Text>
              </View>
            </View>
          )}
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Stock</Text>
          <Input label="Alerte stock bas" placeholder="5" value={form.low_stock_alert} onChangeText={(v) => update('low_stock_alert', v)} keyboardType="numeric" />
          <Text style={s.subLabel}>Unité</Text>
          <View style={s.unitRow}>
            {STOCK_UNITS.map((u) => (
              <TouchableOpacity
                key={u}
                style={[s.unitChip, form.unit === u && s.unitChipActive]}
                onPress={() => update('unit', u)}
              >
                <Text style={[s.unitTxt, form.unit === u && s.unitTxtActive]}>{u}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={s.section}>
          <Text style={s.sectionTitle}>Catégorie</Text>
          <View style={s.catGrid}>
            <TouchableOpacity
              style={[s.catChip, !form.category_id && s.catChipActive]}
              onPress={() => update('category_id', '')}
            >
              <Text style={[s.catTxt, !form.category_id && s.catTxtActive]}>Aucune</Text>
            </TouchableOpacity>
            {(categories ?? []).map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={[s.catChip, form.category_id === cat.id && s.catChipActive]}
                onPress={() => update('category_id', cat.id)}
              >
                <View style={[s.catDot, { backgroundColor: cat.color }]} />
                <Text style={[s.catTxt, form.category_id === cat.id && s.catTxtActive]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[s.catChip, { borderStyle: 'dashed' }]}
              onPress={() => setShowNewCat(!showNewCat)}
            >
              <Ionicons name={showNewCat ? 'close' : 'add'} size={14} color={Colors.primary} />
              <Text style={[s.catTxt, { color: Colors.primary }]}>Nouvelle</Text>
            </TouchableOpacity>
          </View>
          {showNewCat && (
            <View style={s.newCatWrap}>
              <TextInput
                style={s.newCatInput}
                placeholder="Nom de la catégorie"
                placeholderTextColor={Colors.textMuted}
                value={newCatName}
                onChangeText={setNewCatName}
              />
              <View style={s.newCatColors}>
                {CAT_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[s.newCatColorDot, { backgroundColor: c }, newCatColor === c && s.newCatColorDotActive]}
                    onPress={() => setNewCatColor(c)}
                  />
                ))}
              </View>
              <TouchableOpacity
                style={[s.newCatBtn, !newCatName.trim() && { opacity: 0.4 }]}
                onPress={handleCreateCategory}
                disabled={!newCatName.trim() || createCategory.isPending}
              >
                <Text style={s.newCatBtnTxt}>Créer la catégorie</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.submitBtn} onPress={handleSubmit} disabled={isPending} activeOpacity={0.8}>
          {isPending
            ? <ActivityIndicator size="small" color="#0B0D11" />
            : (
              <>
                <Ionicons name="checkmark-circle-outline" size={18} color="#0B0D11" />
                <Text style={s.submitBtnTxt}>Enregistrer les modifications</Text>
              </>
            )
          }
        </TouchableOpacity>

      </ScrollView>

      {/* Scanner modal */}
      <Modal visible={scannerOpen} animationType="slide" onRequestClose={() => setScannerOpen(false)}>
        <View style={s.scannerRoot}>
          <CameraView
            style={s.scannerCamera}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39', 'upc_a', 'upc_e'] }}
            onBarcodeScanned={handleBarcodeScan}
          />
          <View style={s.scannerOverlay}>
            <View style={s.scannerFrame} />
            <Text style={s.scannerHint}>Pointez la caméra vers le code-barres</Text>
            <TouchableOpacity style={s.scannerClose} onPress={() => setScannerOpen(false)}>
              <Text style={s.scannerCloseTxt}>Annuler</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.lg, paddingTop: Spacing.sm, paddingBottom: Spacing.sm },
  backBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: Colors.surface, borderWidth: 1, borderColor: Colors.border, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 18, fontWeight: '800', color: Colors.textPrimary },

  scroll: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 40 },
  section: { backgroundColor: Colors.surface, borderRadius: Radius.lg, padding: Spacing.md, gap: Spacing.md, borderWidth: 1, borderColor: Colors.border },
  sectionTitle: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },

  row: { flexDirection: 'row', gap: Spacing.md },
  flex: { flex: 1 },

  marginPreview: { flexDirection: 'row', backgroundColor: Colors.surfaceAlt, borderRadius: Radius.md, padding: 12, borderWidth: 1, borderColor: Colors.border },
  marginStat: { flex: 1, alignItems: 'center', gap: 3 },
  marginSep: { width: 1, backgroundColor: Colors.border, marginVertical: 4 },
  marginVal: { fontSize: 16, fontWeight: '800' },
  marginLbl: { fontSize: 9, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },

  subLabel: { fontSize: 9, fontWeight: '800', color: Colors.textMuted, textTransform: 'uppercase', letterSpacing: 1.4 },
  unitRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  unitChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border },
  unitChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  unitTxt: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  unitTxtActive: { color: '#0B0D11', fontWeight: '700' },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.full, backgroundColor: Colors.surfaceAlt, borderWidth: 1.5, borderColor: Colors.border },
  catChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  catDot: { width: 8, height: 8, borderRadius: 4 },
  catTxt: { fontSize: 13, fontWeight: '500', color: Colors.textSecondary },
  catTxtActive: { color: '#0B0D11', fontWeight: '700' },

  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#3B1212', borderRadius: Radius.md, padding: Spacing.md, borderWidth: 1, borderColor: `${Colors.danger}40` },
  errorTxt: { color: Colors.danger, fontSize: 13, flex: 1 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: Colors.primary, borderRadius: Radius.lg, paddingVertical: 16, marginTop: 4 },
  submitBtnTxt: { color: '#0B0D11', fontWeight: '800', fontSize: 15 },

  scanBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: Colors.surfaceAlt, borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  scanBtnTxt: { fontSize: 13, fontWeight: '600', color: Colors.primary },

  scannerRoot: { flex: 1, backgroundColor: '#000' },
  scannerCamera: { flex: 1 },
  scannerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 24 },
  scannerFrame: { width: 240, height: 160, borderRadius: 12, borderWidth: 2.5, borderColor: Colors.primary },
  scannerHint: { color: '#fff', fontSize: 14, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  scannerClose: { paddingHorizontal: 28, paddingVertical: 12, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border },
  scannerCloseTxt: { color: '#fff', fontWeight: '700', fontSize: 15 },

  newCatWrap: {
    marginTop: 12, backgroundColor: Colors.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.border, padding: 14, gap: 12,
  },
  newCatInput: {
    height: 44, borderRadius: 12, backgroundColor: Colors.surfaceAlt,
    borderWidth: 1, borderColor: Colors.border, paddingHorizontal: 14,
    color: Colors.textPrimary, fontSize: 14,
  },
  newCatColors: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  newCatColorDot: { width: 26, height: 26, borderRadius: 13, borderWidth: 2, borderColor: 'transparent' },
  newCatColorDotActive: { borderColor: '#fff', shadowColor: '#fff', shadowOpacity: 0.4, shadowRadius: 6 },
  newCatBtn: {
    height: 42, borderRadius: 12, backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  newCatBtnTxt: { color: '#0B0D11', fontSize: 14, fontWeight: '800' },
});
