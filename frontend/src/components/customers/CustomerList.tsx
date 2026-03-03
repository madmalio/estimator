import React, { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Archive, ArchiveRestore, ClipboardPlus, FilePlus2, MoreVertical } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card, CardContent, CardHeader } from '../ui/Card';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';
import { CustomerForm } from './CustomerForm';
import type { Customer, CreateCustomerRequest } from '../../types';
import {
  GetCustomersPage,
  CreateCustomer,
  UpdateCustomer,
  DeleteCustomer,
} from '../../../wailsjs/go/main/App';

interface CustomerListProps {
  onCreateProposalForCustomer?: (customer: Customer) => void;
  onCreateEstimateForCustomer?: (customer: Customer) => void;
}

interface CustomerActionMenuState {
  customerId: number;
  top: number;
  left: number;
}

export function CustomerList({
  onCreateProposalForCustomer,
  onCreateEstimateForCustomer,
}: CustomerListProps) {
  const [pageSize, setPageSize] = useState(10);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | undefined>();
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [actionMenuState, setActionMenuState] = useState<CustomerActionMenuState | null>(null);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  const totalPages = Math.max(1, Math.ceil(totalCustomers / pageSize));

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, showArchived, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const fetchCustomersPage = async (
    page = currentPage,
    search = searchTerm,
    archived = showArchived,
    size = pageSize
  ) => {
    try {
      const response = await GetCustomersPage({
        page,
        pageSize: size,
        search,
        showArchived: archived,
      });
      setCustomers(response?.items || []);
      setTotalCustomers(response?.total || 0);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchCustomersPage();
  }, [currentPage, searchTerm, showArchived, pageSize]);

  const handleCreate = async (data: CreateCustomerRequest) => {
    try {
      await CreateCustomer({ ...data, archived: false } as any);
      await fetchCustomersPage();
      setIsModalOpen(false);
      showToast('Customer created', 'success');
    } catch (error) {
      console.error('Failed to create customer:', error);
      showToast('Failed to create customer', 'error');
    }
  };

  const handleUpdate = async (data: CreateCustomerRequest) => {
    if (!editingCustomer) return;
    try {
      await UpdateCustomer(editingCustomer.id, {
        ...data,
        archived: Boolean(editingCustomer.archived),
      } as any);
      await fetchCustomersPage();
      setEditingCustomer(undefined);
      setIsModalOpen(false);
      showToast('Customer updated', 'success');
    } catch (error) {
      console.error('Failed to update customer:', error);
      showToast('Failed to update customer', 'error');
    }
  };

  const handleArchiveToggle = async (customer: Customer, archive: boolean) => {
    try {
      await UpdateCustomer(customer.id, {
        name: customer.name,
        address: customer.address,
        phone: customer.phone,
        email: customer.email,
        archived: archive,
      } as any);
      await fetchCustomersPage();
      showToast(archive ? 'Customer archived' : 'Customer restored', 'success');
    } catch (error) {
      console.error('Failed to update archive status:', error);
      showToast('Failed to update archive status', 'error');
    }
  };

  const handleDelete = async () => {
    if (!customerToDelete) return;

    try {
      await DeleteCustomer(customerToDelete.id);
      await fetchCustomersPage();
      showToast('Customer deleted', 'success');
    } catch (error) {
      console.error('Failed to delete customer:', error);
      showToast('Failed to delete customer', 'error');
    } finally {
      setCustomerToDelete(null);
      setIsDeleteModalOpen(false);
    }
  };

  const openDeleteModal = (customer: Customer) => {
    setCustomerToDelete(customer);
    setIsDeleteModalOpen(true);
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

      <Input
        placeholder="Search customers by name, phone, email, or address"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <div className="flex items-center gap-2">
        <Button
          variant={!showArchived ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowArchived(false)}
        >
          Active
        </Button>
        <Button
          variant={showArchived ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setShowArchived(true)}
        >
          Archived
        </Button>
      </div>

      {totalCustomers === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-zinc-400">
              {searchTerm.trim()
                ? 'No customers match your search.'
                : showArchived
                ? 'No archived customers yet.'
                : 'No active customers yet. Add your first customer to get started.'}
            </p>
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
                        {!showArchived && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCreateProposalForCustomer?.(customer)}
                              title="New proposal"
                            >
                              <ClipboardPlus size={14} className="text-zinc-400" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onCreateEstimateForCustomer?.(customer)}
                              title="New custom cabinet"
                            >
                              <FilePlus2 size={14} className="text-zinc-400" />
                            </Button>
                          </>
                        )}
                        <div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setActionMenuState((prev) =>
                                prev?.customerId === customer.id
                                  ? null
                                  : {
                                      customerId: customer.id,
                                      top: rect.bottom + 4,
                                      left: rect.right - 160,
                                    }
                              );
                            }}
                            title="More actions"
                          >
                            <MoreVertical size={14} className="text-zinc-400" />
                          </Button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between border-t border-zinc-800 px-4 py-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-zinc-400">Rows</label>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value, 10) || 10)}
                className="px-2 py-1 text-xs border border-zinc-600 rounded bg-zinc-800 text-zinc-100"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
              <p className="text-xs text-zinc-400">
                Showing {totalCustomers === 0 ? 0 : (currentPage - 1) * pageSize + 1}
                -{Math.min(currentPage * pageSize, totalCustomers)} of {totalCustomers}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <p className="text-xs text-zinc-400">
                Page {currentPage} of {totalPages}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
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

      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setCustomerToDelete(null);
          setIsDeleteModalOpen(false);
        }}
        title="Delete Customer"
      >
        <div className="space-y-4">
          <p className="text-zinc-300">
            Are you sure you want to delete
            {customerToDelete ? ` "${customerToDelete.name}"` : ' this customer'}?
          </p>
          <p className="text-sm text-red-300">
            This will also permanently delete all Proposals and Custom Cabinets for this customer.
          </p>
          <div className="flex justify-end gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setCustomerToDelete(null);
                setIsDeleteModalOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>

      {actionMenuState && (() => {
        const menuCustomer = customers.find((customer) => customer.id === actionMenuState.customerId);
        if (!menuCustomer) return null;

        return (
          <>
            <button
              type="button"
              className="fixed inset-0 z-30 cursor-default"
              onClick={() => setActionMenuState(null)}
              aria-label="Close actions menu"
            />
            <div
              className="fixed z-40 w-40 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden"
              style={{ top: actionMenuState.top, left: actionMenuState.left }}
            >
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  openEditModal(menuCustomer);
                  setActionMenuState(null);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Pencil size={14} />
                  Edit
                </span>
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-zinc-200 hover:bg-zinc-800"
                onClick={() => {
                  void handleArchiveToggle(menuCustomer, !Boolean(menuCustomer.archived));
                  setActionMenuState(null);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  {menuCustomer.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}
                  {menuCustomer.archived ? 'Restore' : 'Archive'}
                </span>
              </button>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-red-300 hover:bg-zinc-800"
                onClick={() => {
                  openDeleteModal(menuCustomer);
                  setActionMenuState(null);
                }}
              >
                <span className="inline-flex items-center gap-2">
                  <Trash2 size={14} />
                  Delete
                </span>
              </button>
            </div>
          </>
        );
      })()}
    </div>
  );
}
