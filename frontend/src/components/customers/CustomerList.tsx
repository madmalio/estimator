import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { CustomerForm } from './CustomerForm';
import type { Customer, CreateCustomerRequest } from '../../types';
import {
  GetAllCustomers,
  CreateCustomer,
  UpdateCustomer,
  DeleteCustomer,
} from '../../../wailsjs/go/main/App';

export function CustomerList() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [loading, setLoading] = useState(true);

  const fetchCustomers = async () => {
    try {
      const data = await GetAllCustomers();
      setCustomers(data || []);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCreate = async (data: CreateCustomerRequest) => {
    try {
      await CreateCustomer(data);
      await fetchCustomers();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to create customer:', error);
    }
  };

  const handleUpdate = async (data: CreateCustomerRequest) => {
    if (!editingCustomer) return;
    try {
      await UpdateCustomer(editingCustomer.id, data);
      await fetchCustomers();
      setEditingCustomer(undefined);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Failed to update customer:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this customer?')) return;
    try {
      await DeleteCustomer(id);
      await fetchCustomers();
    } catch (error) {
      console.error('Failed to delete customer:', error);
    }
  };

  const openCreateModal = () => {
    setEditingCustomer(undefined);
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setEditingCustomer(undefined);
    setIsModalOpen(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400">Loading customers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-100">Customers</h2>
        <Button onClick={openCreateModal}>
          <Plus size={16} className="mr-2" />
          Add Customer
        </Button>
      </div>

      {customers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400">No customers yet. Add your first customer to get started.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-700 bg-zinc-800">
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Phone</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-zinc-400">Address</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-zinc-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((customer) => (
                    <tr key={customer.id} className="border-b border-zinc-800 hover:bg-zinc-800">
                      <td className="px-4 py-3 text-sm font-medium text-zinc-100">
                        {customer.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{customer.phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{customer.email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-zinc-400">{customer.address || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(customer)}
                        >
                          <Pencil size={14} className="text-zinc-400" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(customer.id)}
                        >
                          <Trash2 size={14} className="text-red-500" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingCustomer ? 'Edit Customer' : 'Add Customer'}
      >
        <CustomerForm
          customer={editingCustomer}
          onSubmit={editingCustomer ? handleUpdate : handleCreate}
          onCancel={closeModal}
        />
      </Modal>
    </div>
  );
}
