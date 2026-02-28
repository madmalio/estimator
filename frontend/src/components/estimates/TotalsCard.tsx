import React from 'react';
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
  const markupAmount = subtotal * (markupPercent / 100);
  const installTotal = installQty * installRate;
  const grandTotal = subtotal + markupAmount + installTotal + miscCharge;

  return (
    <Card>
      <CardHeader>
        <h3 className="font-semibold text-zinc-100">Totals</h3>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between py-2 border-b border-zinc-700">
          <span className="text-sm text-zinc-400">Subtotal</span>
          <span className="font-medium text-zinc-100">{formatCurrency(subtotal)}</span>
        </div>

        {/* Markup */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 flex-1">Markup %</label>
            <Input
              type="number"
              step="0.1"
              min="0"
              value={markupPercent || ''}
              onChange={(e) => onMarkupChange(parseFloat(e.target.value) || 0)}
              className="w-20 text-right"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Markup Amount</span>
            <span className="text-zinc-200">{formatCurrency(markupAmount)}</span>
          </div>
        </div>

        {/* Installation */}
        <div className="space-y-2 pt-2 border-t border-zinc-700">
          <label className="text-sm text-zinc-400">Installation</label>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              step="1"
              min="0"
              value={installQty || ''}
              onChange={(e) => onInstallQtyChange(parseFloat(e.target.value) || 0)}
              placeholder="Qty"
              className="flex-1"
            />
            <span className="text-gray-500">x</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={installRate || ''}
              onChange={(e) => onInstallRateChange(parseFloat(e.target.value) || 0)}
              placeholder="Rate"
              className="flex-1"
            />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-zinc-400">Install Total</span>
            <span className="text-zinc-200">{formatCurrency(installTotal)}</span>
          </div>
        </div>

        {/* Misc Charge */}
        <div className="space-y-2 pt-2 border-t border-zinc-700">
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-400 flex-1">Misc. Charges</label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={miscCharge || ''}
              onChange={(e) => onMiscChargeChange(parseFloat(e.target.value) || 0)}
              className="w-28 text-right"
            />
          </div>
        </div>

        {/* Grand Total */}
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
