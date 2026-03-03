import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Input } from '../ui/Input';
import { formatCurrency } from '../../lib/utils';

interface TotalsCardProps {
  subtotal: number;
  markupPercent: number;
  installQty: number;
  installRate: number;
  miscCharge: number;
  onMarkupChange: (value: number) => void;
  onInstallQtyChange: (value: number) => void;
  onInstallRateChange: (value: number) => void;
  onMiscChargeChange: (value: number) => void;
}

export function TotalsCard({
  subtotal,
  markupPercent,
  installQty,
  installRate,
  miscCharge,
  onMarkupChange,
  onInstallQtyChange,
  onInstallRateChange,
  onMiscChargeChange,
}: TotalsCardProps) {
  const [installRateInput, setInstallRateInput] = useState('');
  const [miscChargeInput, setMiscChargeInput] = useState('');
  const [isEditingInstallRate, setIsEditingInstallRate] = useState(false);
  const [isEditingMiscCharge, setIsEditingMiscCharge] = useState(false);

  useEffect(() => {
    if (!isEditingInstallRate) {
      setInstallRateInput(installRate === 0 ? '' : installRate.toFixed(2));
    }
  }, [installRate, isEditingInstallRate]);

  useEffect(() => {
    if (!isEditingMiscCharge) {
      setMiscChargeInput(miscCharge === 0 ? '' : miscCharge.toFixed(2));
    }
  }, [miscCharge, isEditingMiscCharge]);

  const markupAmountRaw = subtotal * (markupPercent / 100);
  const markupAmount = markupAmountRaw > 0 ? Math.ceil(markupAmountRaw / 5) * 5 : 0;
  const installTotal = installQty * installRate;
  const grandTotalRaw = subtotal + markupAmount + installTotal + miscCharge;
  const grandTotal = grandTotalRaw > 0 ? Math.ceil(grandTotalRaw / 5) * 5 : 0;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-zinc-100">Totals</h3>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pt-4 pb-0">
        <div className="flex items-center justify-between py-2 border-b border-zinc-700">
          <span className="text-sm text-zinc-400">Subtotal</span>
          <span className="font-medium text-zinc-100">{formatCurrency(subtotal)}</span>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 flex-1">Markup</label>
            <div className="flex items-center justify-end gap-1">
              <div className="w-20">
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={markupPercent === 0 ? '' : markupPercent.toString()}
                  onChange={(e) => onMarkupChange(parseInt(e.target.value, 10) || 0)}
                  className="text-right"
                />
              </div>
              <span className="text-sm text-zinc-400">%</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Markup Amount</span>
            <span className="text-zinc-200">{formatCurrency(markupAmount)}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-700">
          <label className="text-sm text-zinc-400">Installation</label>
          <div className="grid grid-cols-[1fr_16px_1fr] gap-2 items-center">
            <Input
              type="number"
              step="1"
              min="0"
              value={installQty === 0 ? '' : installQty.toString()}
              onChange={(e) => onInstallQtyChange(parseInt(e.target.value, 10) || 0)}
              placeholder="Units"
              className="text-right"
            />
            <span className="text-center text-zinc-500">x</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={installRateInput}
              onFocus={() => setIsEditingInstallRate(true)}
              onChange={(e) => {
                const next = e.target.value;
                setInstallRateInput(next);
                const parsed = parseFloat(next);
                if (!Number.isNaN(parsed)) {
                  onInstallRateChange(parsed);
                }
              }}
              onBlur={() => {
                setIsEditingInstallRate(false);
                const parsed = parseFloat(installRateInput);
                const normalized = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
                onInstallRateChange(normalized);
                setInstallRateInput(normalized === 0 ? '' : normalized.toFixed(2));
              }}
              placeholder="Rate"
              className="text-right"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Install Total</span>
            <span className="text-zinc-200">{formatCurrency(installTotal)}</span>
          </div>
        </div>

        <div className="space-y-2 pt-2 border-t border-zinc-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 flex-1">Misc. Charges</label>
            <div className="w-28 ml-auto">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={miscChargeInput}
                onFocus={() => setIsEditingMiscCharge(true)}
                onChange={(e) => {
                  const next = e.target.value;
                  setMiscChargeInput(next);
                  const parsed = parseFloat(next);
                  if (!Number.isNaN(parsed)) {
                    onMiscChargeChange(parsed);
                  }
                }}
                onBlur={() => {
                  setIsEditingMiscCharge(false);
                  const parsed = parseFloat(miscChargeInput);
                  const normalized = Number.isNaN(parsed) || parsed < 0 ? 0 : parsed;
                  onMiscChargeChange(normalized);
                  setMiscChargeInput(normalized === 0 ? '' : normalized.toFixed(2));
                }}
                className="text-right"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between py-3 mt-2 bg-zinc-800 -mx-4 px-4 rounded-b-lg">
          <span className="font-semibold text-zinc-100">Grand Total</span>
          <span className="text-xl font-bold text-zinc-100">
            {formatCurrency(grandTotal)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
