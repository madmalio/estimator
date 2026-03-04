import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from './Input';
import type { Customer } from '../../types';

const RECENT_CUSTOMERS_STORAGE_KEY = 'cabcon:recent-customers';
const LEGACY_RECENT_CUSTOMERS_STORAGE_KEY = 'cabinet-estimator:recent-customers';

interface CustomerComboboxProps {
  label?: string;
  customers: Customer[];
  value: number;
  onChange: (customerId: number) => void;
  placeholder?: string;
  disabled?: boolean;
  recentLimit?: number;
}

export function CustomerCombobox({
  label,
  customers,
  value,
  onChange,
  placeholder = 'Search customer...',
  disabled,
  recentLimit = 8,
}: CustomerComboboxProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  const selectedCustomer = useMemo(
    () => customers.find((customer) => customer.id === value) || null,
    [customers, value]
  );

  const recentCustomerIds = useMemo(() => {
    try {
      let raw = localStorage.getItem(RECENT_CUSTOMERS_STORAGE_KEY);
      if (!raw) {
        const legacy = localStorage.getItem(LEGACY_RECENT_CUSTOMERS_STORAGE_KEY);
        if (legacy) {
          raw = legacy;
          localStorage.setItem(RECENT_CUSTOMERS_STORAGE_KEY, legacy);
        }
      }
      if (!raw) return [] as number[];
      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) return [] as number[];
      return parsed
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0) as number[];
    } catch {
      return [] as number[];
    }
  }, [isOpen, value]);

  const recentCustomers = useMemo(() => {
    if (recentCustomerIds.length === 0) return [] as Customer[];
    const byId = new Map(customers.map((customer) => [customer.id, customer]));
    return recentCustomerIds
      .map((id) => byId.get(id))
      .filter((customer): customer is Customer => Boolean(customer))
      .slice(0, recentLimit);
  }, [customers, recentCustomerIds, recentLimit]);

  useEffect(() => {
    if (!isOpen) {
      setQuery(selectedCustomer?.name || '');
    }
  }, [selectedCustomer, isOpen]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const filteredCustomers = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) {
      if (recentCustomers.length > 0) {
        return recentCustomers;
      }
      return customers.slice(0, recentLimit);
    }

    return customers.filter((customer) => {
      const candidates = [customer.name, customer.phone, customer.email]
        .filter((value): value is string => Boolean(value))
        .map((value) => value.toLowerCase());

      return candidates.some((value) => value.includes(trimmed));
    });
  }, [customers, query, recentCustomers, recentLimit]);

  const rememberRecentCustomer = (customerId: number) => {
    try {
      const nextRecent = [customerId, ...recentCustomerIds.filter((id) => id !== customerId)].slice(
        0,
        recentLimit
      );
      localStorage.setItem(RECENT_CUSTOMERS_STORAGE_KEY, JSON.stringify(nextRecent));
    } catch {
      // Ignore localStorage errors and continue
    }
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <Input
        label={label}
        value={query}
        placeholder={placeholder}
        disabled={disabled}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
          if (value) {
            onChange(0);
          }
        }}
      />

      {isOpen && !disabled && (
        <div className="absolute z-30 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg">
          {filteredCustomers.length === 0 ? (
            <p className="px-3 py-2 text-sm text-zinc-400">No customers found</p>
          ) : (
            filteredCustomers.map((customer) => (
              <button
                key={customer.id}
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-zinc-800"
                onMouseDown={(event) => {
                  event.preventDefault();
                  onChange(customer.id);
                  rememberRecentCustomer(customer.id);
                  setQuery(customer.name);
                  setIsOpen(false);
                }}
              >
                <p className="text-sm text-zinc-100">{customer.name}</p>
                {(customer.phone || customer.email) && (
                  <p className="text-xs text-zinc-400">
                    {customer.phone || ''}
                    {customer.phone && customer.email ? ' | ' : ''}
                    {customer.email || ''}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
