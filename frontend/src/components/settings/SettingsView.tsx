import React, { useEffect, useState } from 'react';
import { Building2, FileText, Save, Percent, Plus, Trash2, Check, SunMoon } from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';
import { Modal } from '../ui/Modal';
import { useTheme } from '../ui/ThemeProvider';
import { cn } from '../../lib/utils';
import type { UpdateCompanySettingsRequest, TaxRate, CreateTaxRateRequest } from '../../types';
import {
  GetCompanySettings,
  UpdateCompanySettings,
  GetAllTaxRates,
  CreateTaxRate,
  UpdateTaxRate,
  DeleteTaxRate,
} from '../../../wailsjs/go/main/App';

type SettingsSection = 'company' | 'proposal' | 'tax-rates' | 'theme';

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

export function SettingsView() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('company');
  const [settings, setSettings] = useState<UpdateCompanySettingsRequest>(defaultSettings);
  const [taxRates, setTaxRates] = useState<TaxRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isTaxModalOpen, setIsTaxModalOpen] = useState(false);
  const [newTaxRate, setNewTaxRate] = useState<CreateTaxRateRequest>({
    name: '',
    rate: 0,
    isDefault: false,
  });
  const { showToast } = useToast();
  const { setTheme } = useTheme();

  const fetchData = async () => {
    try {
      const [settingsData, taxRatesData] = await Promise.all([
        GetCompanySettings(),
        GetAllTaxRates(),
      ]);
      
      setSettings({
        companyName: settingsData?.companyName || '',
        addressLine1: settingsData?.addressLine1 || '',
        addressLine2: settingsData?.addressLine2 || '',
        phone: settingsData?.phone || '',
        email: settingsData?.email || '',
        theme: settingsData?.theme || 'system',
        defaultTermsBlock1: settingsData?.defaultTermsBlock1 || defaultTermsBlock1,
        defaultTermsBlock2: settingsData?.defaultTermsBlock2 || defaultTermsBlock2,
        defaultTermsBlock3: settingsData?.defaultTermsBlock3 || defaultTermsBlock3,
        defaultPaymentsNote: settingsData?.defaultPaymentsNote || defaultPaymentsNote,
        defaultCreditCardNote: settingsData?.defaultCreditCardNote || defaultCreditCardNote,
        defaultSignatureNote: settingsData?.defaultSignatureNote || defaultSignatureNote,
      });

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
      setTheme(settings.theme as any);
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
              <div className="space-y-4 max-w-xs">
                <Select
                  label="Application Theme"
                  value={settings.theme}
                  onChange={(value) => {
                    handleChange('theme', value);
                    setTheme(value as any);
                  }}
                  options={[
                    { value: 'light', label: 'Light' },
                    { value: 'dark', label: 'Dark' },
                    { value: 'system', label: 'System' },
                  ]}
                />
                <p className="text-xs text-zinc-400">
                  Select your preferred color theme for the application. System theme will automatically match your operating system settings.
                </p>
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
    </div>
  );
}
