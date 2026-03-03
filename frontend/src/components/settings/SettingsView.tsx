import React, { useEffect, useRef, useState } from 'react';
import { Building2, FileText, Save, Percent, Plus, Trash2, Check, SunMoon, Sun, Moon, Monitor, Database, Download, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useTheme } from '../ui/ThemeProvider';
import type { Theme } from '../ui/ThemeProvider';
import { cn } from '../../lib/utils';
import { types as wailsTypes } from '../../../wailsjs/go/models';
import type {
  UpdateCompanySettingsRequest,
  TaxRate,
  CreateTaxRateRequest,
  Category,
  CreatePriceListItemRequest,
  Customer,
  EstimateJob,
  ManualQuote,
} from '../../types';
import {
  GetCompanySettings,
  UpdateCompanySettings,
  GetAllTaxRates,
  CreateTaxRate,
  UpdateTaxRate,
  DeleteTaxRate,
  GetAllCategoriesWithItems,
  CreateCategory,
  CreatePriceListItem,
  GetAllCustomers,
  CreateCustomer,
  DeleteCustomer,
  GetAllEstimates,
  CreateEstimate,
  AddLineItem,
  UpdateEstimate,
  DeleteEstimate,
  UpdateEstimateSortOrder,
  GetAllManualQuotes,
  CreateManualQuote,
  DeleteManualQuote,
  DeleteCategory,
} from '../../../wailsjs/go/main/App';

type SettingsSection = 'company' | 'proposal' | 'tax-rates' | 'theme' | 'data';

const defaultTermsBlock1 =
  'Pricing is subject to change without notice. All material is guaranteed to be as specified and completed in a substantial workmanlike manner.';
const defaultTermsBlock2 =
  'A FINANCE CHARGE is computed by applying a period rate of 1.5% per month, which is an annual rate of 18% on past due accounts.';
const defaultTermsBlock3 =
  'Any collection charges or legal fees must be paid by the customer. A 25% restocking charge must be paid on all cancelled orders. RETURN CHECK CHARGE $25.00.';
const defaultPaymentsNote = 'Payments to be made as follows: 75% Deposit';
const defaultCreditCardNote = '* THERE WILL BE A 3% FEE ADDED TO ALL CREDIT CARD TRANSACTIONS *';
const defaultSignatureNote =
  'By signing this document, the customer agrees to the services and conditions outlined in this document.';

const defaultSettings: UpdateCompanySettingsRequest = {
  companyName: '',
  addressLine1: '',
  addressLine2: '',
  phone: '',
  email: '',
  theme: 'system',
  defaultTermsBlock1,
  defaultTermsBlock2,
  defaultTermsBlock3,
  defaultPaymentsNote,
  defaultCreditCardNote,
  defaultSignatureNote,
};

const themeOptions: Array<{
  value: Theme;
  label: string;
  description: string;
  Icon: typeof Sun;
}> = [
  {
    value: 'light',
    label: 'Light',
    description: 'Bright interface for daytime use.',
    Icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Low-glare interface for darker spaces.',
    Icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Automatically match your OS preference.',
    Icon: Monitor,
  },
];

const normalizeTheme = (value?: string): Theme => {
  if (value === 'light' || value === 'dark' || value === 'system') {
    return value;
  }
  return 'system';
};

const themePreviewPalettes: Record<Theme, {
  bg: string;
  panel: string;
  panelAlt: string;
  border: string;
  heading: string;
}> = {
  light: {
    bg: '#fafafa',
    panel: '#f4f4f5',
    panelAlt: '#e4e4e7',
    border: '#d4d4d8',
    heading: '#18181b',
  },
  dark: {
    bg: '#09090c',
    panel: '#18181b',
    panelAlt: '#27272a',
    border: '#3f3f46',
    heading: '#f4f4f5',
  },
  system: {
    bg: 'linear-gradient(90deg, #fafafa 0%, #f4f4f5 48%, #18181b 52%, #09090c 100%)',
    panel: '#f4f4f5',
    panelAlt: '#27272a',
    border: '#71717a',
    heading: '#27272a',
  },
};

interface PriceListImportItem {
  itemName: string;
  unitPrice: number;
}

interface PriceListImportCategory {
  name: string;
  items: PriceListImportItem[];
}

interface PriceListImportPayload {
  version: number;
  exportedAt?: string;
  categories: PriceListImportCategory[];
}

interface AllDataImportPayload {
  version: number;
  exportedAt?: string;
  settings?: UpdateCompanySettingsRequest;
  customers: Customer[];
  taxRates: TaxRate[];
  categories: PriceListImportCategory[];
  estimates: EstimateJob[];
  manualQuotes: ManualQuote[];
}

const wipeConfirmPhrase = 'WIPE ALL DATA';

function normalizePriceListImportPayload(raw: unknown): PriceListImportPayload {
  const parsed = raw as { version?: unknown; categories?: unknown } | unknown[];
  const categoriesSource = Array.isArray(parsed)
    ? parsed
    : Array.isArray((parsed as { categories?: unknown })?.categories)
      ? (parsed as { categories: unknown[] }).categories
      : [];

  const categories: PriceListImportCategory[] = categoriesSource
    .map((category) => {
      const c = category as { name?: unknown; items?: unknown };
      const name = typeof c.name === 'string' ? c.name.trim() : '';
      if (!name) return null;

      const items: PriceListImportItem[] = Array.isArray(c.items)
        ? c.items
          .map((item) => {
            const i = item as { itemName?: unknown; unitPrice?: unknown };
            const itemName = typeof i.itemName === 'string' ? i.itemName.trim() : '';
            const unitPrice = typeof i.unitPrice === 'number' ? i.unitPrice : Number(i.unitPrice);
            if (!itemName || Number.isNaN(unitPrice) || unitPrice < 0) {
              return null;
            }
            return { itemName, unitPrice };
          })
          .filter((item): item is PriceListImportItem => item !== null)
        : [];

      return { name, items };
    })
    .filter((category): category is PriceListImportCategory => category !== null);

  return {
    version: typeof (parsed as { version?: unknown })?.version === 'number'
      ? (parsed as { version: number }).version
      : 1,
    categories,
  };
}

function normalizeAllDataImportPayload(raw: unknown): AllDataImportPayload {
  const parsed = raw as Partial<AllDataImportPayload>;

  return {
    version: typeof parsed.version === 'number' ? parsed.version : 1,
    exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : undefined,
    settings: parsed.settings,
    customers: Array.isArray(parsed.customers) ? parsed.customers : [],
    taxRates: Array.isArray(parsed.taxRates) ? parsed.taxRates : [],
    categories: normalizePriceListImportPayload({ categories: parsed.categories }).categories,
    estimates: Array.isArray(parsed.estimates) ? parsed.estimates : [],
    manualQuotes: Array.isArray(parsed.manualQuotes) ? parsed.manualQuotes : [],
  };
}

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('company');
  const [settings, setSettings] = useState<UpdateCompanySettingsRequest>(defaultSettings);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isImportingPriceList, setIsImportingPriceList] = useState(false);
  const [isImportingAllData, setIsImportingAllData] = useState(false);
  const [isWipingData, setIsWipingData] = useState(false);
  const [isWipeModalOpen, setIsWipeModalOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState<CreateTaxRateRequest>({
    name: '',
    rate: 0,
    isDefault: false,
  });
  const { showToast } = useToast();
  const { setTheme } = useTheme();
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const importAllDataInputRef = useRef<HTMLInputElement | null>(null);
  const isWipeConfirmed = wipeConfirmText.trim() === wipeConfirmPhrase;

  const fetchData = async () => {
    try {
      const [settingsData, taxRatesData] = await Promise.all([
        GetCompanySettings(),
        GetAllTaxRates(),
      ]);
      
      const selectedTheme = normalizeTheme(settingsData?.theme);

      setSettings({
        companyName: settingsData?.companyName || '',
        addressLine1: settingsData?.addressLine1 || '',
        addressLine2: settingsData?.addressLine2 || '',
        phone: settingsData?.phone || '',
        email: settingsData?.email || '',
        theme: selectedTheme,
        defaultTermsBlock1: settingsData?.defaultTermsBlock1 || defaultTermsBlock1,
        defaultTermsBlock2: settingsData?.defaultTermsBlock2 || defaultTermsBlock2,
        defaultTermsBlock3: settingsData?.defaultTermsBlock3 || defaultTermsBlock3,
        defaultPaymentsNote: settingsData?.defaultPaymentsNote || defaultPaymentsNote,
        defaultCreditCardNote: settingsData?.defaultCreditCardNote || defaultCreditCardNote,
        defaultSignatureNote: settingsData?.defaultSignatureNote || defaultSignatureNote,
      });

      setTheme(selectedTheme);

      setTaxRates(taxRatesData || []);
    } catch (error) {
      console.error('Failed to load settings:', error);
      showToast('Failed to load settings', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleChange = (key: keyof UpdateCompanySettingsRequest, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!settings.companyName.trim()) {
      showToast('Company name is required', 'error');
      return;
    }

    setSaving(true);
    try {
      await UpdateCompanySettings({
        companyName: settings.companyName.trim(),
        addressLine1: settings.addressLine1.trim(),
        addressLine2: settings.addressLine2.trim(),
        phone: settings.phone.trim(),
        email: settings.email.trim(),
        theme: settings.theme,
        defaultTermsBlock1: settings.defaultTermsBlock1.trim(),
        defaultTermsBlock2: settings.defaultTermsBlock2.trim(),
        defaultTermsBlock3: settings.defaultTermsBlock3.trim(),
        defaultPaymentsNote: settings.defaultPaymentsNote.trim(),
        defaultCreditCardNote: settings.defaultCreditCardNote.trim(),
        defaultSignatureNote: settings.defaultSignatureNote.trim(),
      });
      setTheme(normalizeTheme(settings.theme));
      showToast('Settings saved', 'success');
    } catch (error) {
      console.error('Failed to save settings:', error);
      showToast('Failed to save settings', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleAddTaxRate = async () => {
    if (!newTaxRate.name.trim()) {
      showToast('Rate name is required', 'error');
      return;
    }

    try {
      await CreateTaxRate({
        name: newTaxRate.name.trim(),
        rate: newTaxRate.rate,
        isDefault: newTaxRate.isDefault,
      });
      showToast('Tax rate added', 'success');
      setIsTaxModalOpen(false);
      setNewTaxRate({ name: '', rate: 0, isDefault: false });
      await fetchData();
    } catch (error) {
      console.error('Failed to add tax rate:', error);
      showToast('Failed to add tax rate', 'error');
    }
  };

  const handleSetDefaultTaxRate = async (rate: TaxRate) => {
    try {
      await UpdateTaxRate(rate.id, {
        name: rate.name,
        rate: rate.rate,
        isDefault: true,
      });
      showToast('Default tax rate updated', 'success');
      await fetchData();
    } catch (error) {
      console.error('Failed to update default tax rate:', error);
      showToast('Failed to update default tax rate', 'error');
    }
  };

  const handleDeleteTaxRate = async (id: number) => {
    try {
      await DeleteTaxRate(id);
      showToast('Tax rate deleted', 'success');
      await fetchData();
    } catch (error) {
      console.error('Failed to delete tax rate:', error);
      showToast('Failed to delete tax rate', 'error');
    }
  };

  const handleThemeSelect = (theme: Theme) => {
    handleChange('theme', theme);
    setTheme(theme);
  };

  const handleExportPriceList = async () => {
    try {
      const categoriesData = await GetAllCategoriesWithItems();
      const payload: PriceListImportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        categories: (categoriesData || []).map((category) => ({
          name: category.name,
          items: (category.items || [])
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              itemName: item.itemName,
              unitPrice: item.unitPrice,
            })),
        })),
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateText = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `cabinet-price-list-${dateText}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('Price list exported', 'success');
    } catch (error) {
      console.error('Failed to export price list:', error);
      showToast('Failed to export price list', 'error');
    }
  };

  const handleImportPriceListFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingPriceList(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const payload = normalizePriceListImportPayload(parsed);

      if (payload.categories.length === 0) {
        showToast('No valid categories found in file', 'error');
        return;
      }

      const existingCategories = await GetAllCategoriesWithItems();
      const categoryByName = new Map(
        (existingCategories || []).map((category: Category) => [category.name.trim().toLowerCase(), category])
      );

      let createdCategories = 0;
      let createdItems = 0;

      for (const categoryData of payload.categories) {
        const key = categoryData.name.trim().toLowerCase();
        let targetCategory = categoryByName.get(key);

        if (!targetCategory) {
          const createdCategory = await CreateCategory({ name: categoryData.name });
          targetCategory = createdCategory as Category;
          categoryByName.set(key, targetCategory);
          createdCategories += 1;
        }

        for (const item of categoryData.items) {
          const req: CreatePriceListItemRequest = {
            categoryId: targetCategory.id,
            itemName: item.itemName,
            unitPrice: item.unitPrice,
          };
          await CreatePriceListItem(req);
          createdItems += 1;
        }
      }

      showToast(`Import complete: ${createdCategories} categories, ${createdItems} items`, 'success');
    } catch (error) {
      console.error('Failed to import price list:', error);
      showToast('Failed to import price list JSON', 'error');
    } finally {
      setIsImportingPriceList(false);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
    }
  };

  const wipeAllData = async () => {
    const [manualQuotes, estimates, categories, customers, rates] = await Promise.all([
      GetAllManualQuotes(),
      GetAllEstimates(),
      GetAllCategoriesWithItems(),
      GetAllCustomers(),
      GetAllTaxRates(),
    ]);

    for (const quote of manualQuotes || []) {
      await DeleteManualQuote(quote.id);
    }

    for (const estimate of estimates || []) {
      await DeleteEstimate(estimate.jobId);
    }

    for (const category of categories || []) {
      await DeleteCategory(category.id);
    }

    for (const customer of customers || []) {
      await DeleteCustomer(customer.id);
    }

    for (const rate of rates || []) {
      await DeleteTaxRate(rate.id);
    }

    const resetSettings: UpdateCompanySettingsRequest = {
      companyName: 'CabCon',
      addressLine1: '',
      addressLine2: '',
      phone: '',
      email: '',
      theme: 'system',
      defaultTermsBlock1,
      defaultTermsBlock2,
      defaultTermsBlock3,
      defaultPaymentsNote,
      defaultCreditCardNote,
      defaultSignatureNote,
    };

    await UpdateCompanySettings(resetSettings);
    setSettings(resetSettings);
    setTheme('system');
    await fetchData();
  };

  const handleExportAllData = async () => {
    try {
      const [settingsData, customers, taxRatesData, categoriesData, estimatesData, manualQuotesData] = await Promise.all([
        GetCompanySettings(),
        GetAllCustomers(),
        GetAllTaxRates(),
        GetAllCategoriesWithItems(),
        GetAllEstimates(),
        GetAllManualQuotes(),
      ]);

      const payload: AllDataImportPayload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        settings: {
          companyName: settingsData?.companyName || '',
          addressLine1: settingsData?.addressLine1 || '',
          addressLine2: settingsData?.addressLine2 || '',
          phone: settingsData?.phone || '',
          email: settingsData?.email || '',
          theme: normalizeTheme(settingsData?.theme),
          defaultTermsBlock1: settingsData?.defaultTermsBlock1 || defaultTermsBlock1,
          defaultTermsBlock2: settingsData?.defaultTermsBlock2 || defaultTermsBlock2,
          defaultTermsBlock3: settingsData?.defaultTermsBlock3 || defaultTermsBlock3,
          defaultPaymentsNote: settingsData?.defaultPaymentsNote || defaultPaymentsNote,
          defaultCreditCardNote: settingsData?.defaultCreditCardNote || defaultCreditCardNote,
          defaultSignatureNote: settingsData?.defaultSignatureNote || defaultSignatureNote,
        },
        customers: (customers || []) as Customer[],
        taxRates: (taxRatesData || []) as TaxRate[],
        categories: (categoriesData || []).map((category) => ({
          name: category.name,
          items: (category.items || [])
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => ({
              itemName: item.itemName,
              unitPrice: item.unitPrice,
            })),
        })),
        estimates: (estimatesData || []) as EstimateJob[],
        manualQuotes: (manualQuotesData || []) as ManualQuote[],
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const dateText = new Date().toISOString().slice(0, 10);
      link.href = url;
      link.download = `cabinet-estimator-backup-${dateText}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      showToast('All data exported', 'success');
    } catch (error) {
      console.error('Failed to export all data:', error);
      showToast('Failed to export all data', 'error');
    }
  };

  const handleImportAllDataFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImportingAllData(true);
    try {
      const text = await file.text();
      const payload = normalizeAllDataImportPayload(JSON.parse(text) as unknown);

      const hasData =
        payload.customers.length > 0 ||
        payload.taxRates.length > 0 ||
        payload.categories.length > 0 ||
        payload.estimates.length > 0 ||
        payload.manualQuotes.length > 0 ||
        Boolean(payload.settings);

      if (!hasData) {
        showToast('No usable data found in backup file', 'error');
        return;
      }

      await wipeAllData();

      const customerIdMap = new Map<number, number>();

      for (const customer of payload.customers) {
        const created = await CreateCustomer({
          name: customer.name,
          address: customer.address,
          phone: customer.phone,
          email: customer.email,
          archived: Boolean(customer.archived),
        } as any);
        customerIdMap.set(customer.id, created.id);
      }

      for (const rate of payload.taxRates) {
        await CreateTaxRate({
          name: rate.name,
          rate: rate.rate,
          isDefault: rate.isDefault,
        });
      }

      for (const category of payload.categories) {
        const createdCategory = await CreateCategory({ name: category.name });
        for (const item of category.items) {
          await CreatePriceListItem({
            categoryId: createdCategory.id,
            itemName: item.itemName,
            unitPrice: item.unitPrice,
          });
        }
      }

      const createdEstimateSortOrders: Array<{ id: number; sortOrder: number }> = [];

      for (const estimate of payload.estimates) {
        const mappedCustomerId = customerIdMap.get(estimate.customerId);
        if (!mappedCustomerId) continue;

        const createdEstimate = await CreateEstimate({
          customerId: mappedCustomerId,
          jobName: estimate.jobName,
          markupPercent: estimate.markupPercent,
          miscCharge: estimate.miscCharge,
        });

        for (const lineItem of (estimate.lineItems || []).slice().sort((a, b) => a.sortOrder - b.sortOrder)) {
          await AddLineItem({
            jobId: createdEstimate.jobId,
            itemName: lineItem.itemName,
            categoryName: lineItem.categoryName,
            quantity: lineItem.quantity,
            unitPrice: lineItem.unitPrice,
          });
        }

        await UpdateEstimate({
          jobId: createdEstimate.jobId,
          customerId: mappedCustomerId,
          jobName: estimate.jobName,
          totalAmount: estimate.totalAmount,
          installTotal: estimate.installTotal,
          markupPercent: estimate.markupPercent,
          miscCharge: estimate.miscCharge,
        });

        createdEstimateSortOrders.push({ id: createdEstimate.jobId, sortOrder: estimate.sortOrder });
      }

      if (createdEstimateSortOrders.length > 0) {
        await UpdateEstimateSortOrder(createdEstimateSortOrders);
      }

      const sortedManualQuotes = [...payload.manualQuotes].sort((a, b) => a.sortOrder - b.sortOrder);
      for (const quote of sortedManualQuotes) {
        const mappedCustomerId = quote.customerId ? customerIdMap.get(quote.customerId) : undefined;
        await CreateManualQuote(new wailsTypes.CreateManualQuoteRequest({
          customerId: mappedCustomerId,
          jobName: quote.jobName,
          descriptionBody: quote.descriptionBody,
          lineItems: (quote.lineItems || []).slice().sort((a, b) => a.sortOrder - b.sortOrder).map((item) => ({
            itemName: item.itemName,
            description: item.description,
            lineTotal: item.lineTotal,
            sortOrder: item.sortOrder,
          })),
          subtotal: quote.subtotal,
          tax: quote.tax,
          total: quote.total,
          depositPercent: quote.depositPercent,
          depositAmount: quote.depositAmount,
          amountDue: quote.amountDue,
          termsBlock1: quote.termsBlock1,
          termsBlock2: quote.termsBlock2,
          paymentsNote: quote.paymentsNote,
          creditCardNote: quote.creditCardNote,
          signatureNote: quote.signatureNote,
        }));
      }

      if (payload.settings) {
        const normalizedSettings: UpdateCompanySettingsRequest = {
          companyName: payload.settings.companyName || 'CabCon',
          addressLine1: payload.settings.addressLine1 || '',
          addressLine2: payload.settings.addressLine2 || '',
          phone: payload.settings.phone || '',
          email: payload.settings.email || '',
          theme: normalizeTheme(payload.settings.theme),
          defaultTermsBlock1: payload.settings.defaultTermsBlock1 || defaultTermsBlock1,
          defaultTermsBlock2: payload.settings.defaultTermsBlock2 || defaultTermsBlock2,
          defaultTermsBlock3: payload.settings.defaultTermsBlock3 || defaultTermsBlock3,
          defaultPaymentsNote: payload.settings.defaultPaymentsNote || defaultPaymentsNote,
          defaultCreditCardNote: payload.settings.defaultCreditCardNote || defaultCreditCardNote,
          defaultSignatureNote: payload.settings.defaultSignatureNote || defaultSignatureNote,
        };
        await UpdateCompanySettings(normalizedSettings);
        setSettings(normalizedSettings);
        setTheme(normalizeTheme(normalizedSettings.theme));
      }

      await fetchData();
      showToast('All data imported successfully', 'success');
    } catch (error) {
      console.error('Failed to import all data:', error);
      showToast('Failed to import backup file', 'error');
    } finally {
      setIsImportingAllData(false);
      if (importAllDataInputRef.current) {
        importAllDataInputRef.current.value = '';
      }
    }
  };

  const handleWipeAllData = async () => {
    setIsWipingData(true);
    try {
      await wipeAllData();
      showToast('All data has been wiped', 'success');
      setWipeConfirmText('');
      setIsWipeModalOpen(false);
    } catch (error) {
      console.error('Failed to wipe all data:', error);
      showToast('Failed to wipe all data', 'error');
    } finally {
      setIsWipingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Settings</h2>
        <Button onClick={handleSave} disabled={saving}>
          <Save size={16} className="mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <div className="grid grid-cols-[240px_1fr] gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold text-zinc-100">Sections</h3>
          </CardHeader>
          <CardContent className="space-y-2">
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === 'company'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              onClick={() => setActiveSection('company')}
            >
              <Building2 size={16} />
              Company Info
            </button>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === 'proposal'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              onClick={() => setActiveSection('proposal')}
            >
              <FileText size={16} />
              Proposal Defaults
            </button>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === 'tax-rates'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              onClick={() => setActiveSection('tax-rates')}
            >
              <Percent size={16} />
              Tax Rates
            </button>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === 'theme'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              onClick={() => setActiveSection('theme')}
            >
              <SunMoon size={16} />
              Theme
            </button>
            <button
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                activeSection === 'data'
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
              )}
              onClick={() => setActiveSection('data')}
            >
              <Database size={16} />
              Data
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-zinc-100">
                {activeSection === 'company'
                  ? 'Company Information'
                  : activeSection === 'proposal'
                  ? 'Proposal Defaults'
                  : activeSection === 'tax-rates'
                  ? 'Tax Rates'
                  : activeSection === 'data'
                  ? 'Data Management'
                  : 'Theme'}
              </h3>
              {activeSection === 'tax-rates' && (
                <Button size="sm" onClick={() => setIsTaxModalOpen(true)}>
                  <Plus size={14} className="mr-1" /> Add Rate
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {activeSection === 'company' ? (
              <>
                <Input
                  label="Company Name"
                  value={settings.companyName}
                  onChange={(e) => handleChange('companyName', e.target.value)}
                  placeholder="Your Company Name"
                />

                <Input
                  label="Address Line 1"
                  value={settings.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  placeholder="123 Main St"
                />

                <Input
                  label="Address Line 2"
                  value={settings.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  placeholder="City, State ZIP"
                />

                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Phone"
                    value={settings.phone}
                    onChange={(e) => handleChange('phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                  <Input
                    label="Email"
                    type="email"
                    value={settings.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    placeholder="you@company.com"
                  />
                </div>
              </>
            ) : activeSection === 'proposal' ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Terms Block 1</label>
                  <textarea
                    rows={4}
                    value={settings.defaultTermsBlock1}
                    onChange={(e) => handleChange('defaultTermsBlock1', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Terms Block 2</label>
                  <textarea
                    rows={4}
                    value={settings.defaultTermsBlock2}
                    onChange={(e) => handleChange('defaultTermsBlock2', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Terms Block 3</label>
                  <textarea
                    rows={4}
                    value={settings.defaultTermsBlock3}
                    onChange={(e) => handleChange('defaultTermsBlock3', e.target.value)}
                    className="w-full px-3 py-2 border border-zinc-600 rounded-lg shadow-sm bg-zinc-800 text-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:border-zinc-500"
                  />
                </div>

                <Input
                  label="Payments Note"
                  value={settings.defaultPaymentsNote}
                  onChange={(e) => handleChange('defaultPaymentsNote', e.target.value)}
                />
                <Input
                  label="Credit Card Fee Note"
                  value={settings.defaultCreditCardNote}
                  onChange={(e) => handleChange('defaultCreditCardNote', e.target.value)}
                />
                <Input
                  label="Signature Note"
                  value={settings.defaultSignatureNote}
                  onChange={(e) => handleChange('defaultSignatureNote', e.target.value)}
                />
              </>
            ) : activeSection === 'theme' ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  {themeOptions.map(({ value, label, description, Icon }) => {
                    const isSelected = settings.theme === value;
                    const previewPalette = themePreviewPalettes[value];

                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => handleThemeSelect(value)}
                        className={cn(
                          'rounded-xl border p-4 text-left transition-all',
                          'hover:border-zinc-500 hover:bg-zinc-800/50',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-900',
                          isSelected
                            ? 'border-zinc-300 bg-zinc-800 text-zinc-100 shadow-[0_0_0_1px_rgba(255,255,255,0.2)]'
                            : 'border-zinc-700 bg-zinc-900/60 text-zinc-300'
                        )}
                        aria-pressed={isSelected}
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon size={16} />
                            <span className="text-sm font-medium">{label}</span>
                          </div>
                          {isSelected && <Check size={16} className="text-green-400" />}
                        </div>
                        <div className="mb-3 h-12 rounded-md border p-1" style={{ borderColor: previewPalette.border, background: previewPalette.bg }}>
                          <div className="h-2 w-10 rounded-sm" style={{ background: previewPalette.heading }} />
                          <div className="mt-1 grid grid-cols-2 gap-1">
                            <span className="h-6 rounded-sm" style={{ background: previewPalette.panel }} />
                            <span className="h-6 rounded-sm" style={{ background: previewPalette.panelAlt }} />
                          </div>
                        </div>
                        <p className="text-xs text-zinc-400">{description}</p>
                      </button>
                    );
                  })}
                </div>
                <p className="text-xs text-zinc-400">
                  Theme previews apply instantly. Click Save Settings to persist your selection.
                </p>
              </div>
            ) : activeSection === 'data' ? (
              <div className="space-y-4 max-w-2xl">
                <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
                  <h4 className="text-sm font-semibold text-zinc-100">Price List JSON</h4>
                  <p className="mt-1 text-sm text-zinc-400">
                    Export your full price list to JSON, or import a JSON file to merge categories by name and add items.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleExportPriceList()}>
                      <Download size={16} className="mr-2" />
                      Export JSON
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => importInputRef.current?.click()}
                      disabled={isImportingPriceList}
                    >
                      <Upload size={16} className="mr-2" />
                      {isImportingPriceList ? 'Importing...' : 'Import JSON'}
                    </Button>
                    <input
                      ref={importInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => void handleImportPriceListFile(event)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-zinc-700 bg-zinc-900/50 p-4">
                  <h4 className="text-sm font-semibold text-zinc-100">Full Backup JSON</h4>
                  <p className="mt-1 text-sm text-zinc-400">
                    Export all app data to a single backup file. Import replaces current data with the backup contents.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => void handleExportAllData()}>
                      <Download size={16} className="mr-2" />
                      Export All Data
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => importAllDataInputRef.current?.click()}
                      disabled={isImportingAllData}
                    >
                      <Upload size={16} className="mr-2" />
                      {isImportingAllData ? 'Importing Backup...' : 'Import All Data'}
                    </Button>
                    <input
                      ref={importAllDataInputRef}
                      type="file"
                      accept="application/json,.json"
                      className="hidden"
                      onChange={(event) => void handleImportAllDataFile(event)}
                    />
                  </div>
                </div>

                <div className="rounded-lg border border-red-500/60 bg-red-950/20 p-4">
                  <h4 className="text-sm font-semibold text-red-300">Danger Zone</h4>
                  <p className="mt-1 text-sm text-zinc-300">
                    Permanently delete all customers, estimates, manual quotes, price list data, tax rates, and reset settings.
                  </p>
                  <div className="mt-4">
                    <Button
                      variant="danger"
                      onClick={() => {
                        setWipeConfirmText('');
                        setIsWipeModalOpen(true);
                      }}
                      disabled={isWipingData || isImportingAllData}
                    >
                      {isWipingData ? 'Wiping Data...' : 'Wipe All Data'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border border-zinc-700 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-800 text-zinc-400 font-medium">
                      <tr>
                        <th className="px-4 py-2 text-left">Name</th>
                        <th className="px-4 py-2 text-right">Rate (%)</th>
                        <th className="px-4 py-2 text-center w-24">Default</th>
                        <th className="px-4 py-2 text-right w-20">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800">
                      {taxRates.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                            No tax rates defined.
                          </td>
                        </tr>
                      ) : (
                        taxRates.map((rate) => (
                          <tr key={rate.id} className="hover:bg-zinc-800/50">
                            <td className="px-4 py-2 text-zinc-100">{rate.name}</td>
                            <td className="px-4 py-2 text-right text-zinc-100">{rate.rate.toFixed(2)}%</td>
                            <td className="px-4 py-2 text-center">
                              {rate.isDefault ? (
                                <Check size={16} className="mx-auto text-green-500" />
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleSetDefaultTaxRate(rate)}
                                >
                                  Set
                                </Button>
                              )}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteTaxRate(rate.id)}
                              >
                                <Trash2 size={14} className="text-red-500" />
                              </Button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Modal
        isOpen={isTaxModalOpen}
        onClose={() => {
          setIsTaxModalOpen(false);
          setNewTaxRate({ name: '', rate: 0, isDefault: false });
        }}
        title="Add Tax Rate"
      >
        <div className="space-y-4">
          <Input
            label="Rate Name"
            value={newTaxRate.name}
            onChange={(e) => setNewTaxRate((prev) => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Sales Tax, GST"
          />
          <Input
            label="Rate (%)"
            type="number"
            step="0.01"
            value={newTaxRate.rate || ''}
            onChange={(e) =>
              setNewTaxRate((prev) => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))
            }
          />
          <label className="flex items-center gap-2 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={newTaxRate.isDefault}
              onChange={(e) =>
                setNewTaxRate((prev) => ({ ...prev, isDefault: e.target.checked }))
              }
            />
            Set as default
          </label>
          <div className="flex justify-end gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsTaxModalOpen(false);
                setNewTaxRate({ name: '', rate: 0, isDefault: false });
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleAddTaxRate}>Add Rate</Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={isWipeModalOpen}
        onClose={() => {
          if (!isWipingData) {
            setWipeConfirmText('');
            setIsWipeModalOpen(false);
          }
        }}
        title="Wipe All Data"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            This will permanently delete all customers, estimates, manual quotes, price list data, tax rates, and reset settings.
          </p>
          <Input
            label={`Type ${wipeConfirmPhrase} to confirm`}
            value={wipeConfirmText}
            onChange={(e) => setWipeConfirmText(e.target.value)}
            placeholder={wipeConfirmPhrase}
          />
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setWipeConfirmText('');
                setIsWipeModalOpen(false);
              }}
              disabled={isWipingData}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={() => void handleWipeAllData()}
              disabled={isWipingData || !isWipeConfirmed}
            >
              {isWipingData ? 'Wiping Data...' : 'Wipe All Data'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
