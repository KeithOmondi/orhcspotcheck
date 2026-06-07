// src/components/super-admin/SuperAdminComponents.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  fetchMasterComponents,
  fetchMasterComponentSections,
  createMasterComponent,
  updateMasterComponent,
  deleteMasterComponent,
  clearSuperAdminError,
  resetSuperAdminSuccess,
  type MasterComponent,
  type FormField,
} from '../../store/slices/superAdminSlice';
import type { AppDispatch, RootState } from '../../store/store';
import { Plus, Pencil, Trash2, X, Loader2, Eye, ChevronDown, ChevronRight } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────

interface ComponentFormData {
  name: string;
  section: string;
  form_json: { fields: FormField[] };
}

interface ComponentCardProps {
  component: MasterComponent;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}

interface ComponentFormModalProps {
  isOpen: boolean;
  component?: MasterComponent | null;
  onClose: () => void;
  onSave: (data: ComponentFormData) => Promise<boolean>;
  isLoading: boolean;
}

interface DeleteConfirmModalProps {
  isOpen: boolean;
  componentName: string;
  onConfirm: () => Promise<void>;
  onCancel: () => void;
  isLoading: boolean;
}

interface ViewDetailsModalProps {
  isOpen: boolean;
  component: MasterComponent | null;
  onClose: () => void;
}

const emptyForm: ComponentFormData = {
  name: '',
  section: '',
  form_json: { fields: [] },
};

// ─── Helpers ────────────────────────────────────────────────────────────

const formatJsonPreview = (formJson: unknown): string => {
  try {
    return JSON.stringify(formJson, null, 2);
  } catch {
    return 'Invalid JSON structure';
  }
};

// ─── Component Card ─────────────────────────────────────────────────────

const ComponentCard: React.FC<ComponentCardProps> = ({ component, onEdit, onDelete, onView }) => {
  const [expanded, setExpanded] = useState(false);
  const fieldCount = component.form_json?.fields?.length ?? 0;

  return (
    <div
      className="rounded-lg overflow-hidden transition-all"
      style={{ border: '1px solid #e2e8f0', background: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900">{component.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: '#e0e7ff', color: '#3730a3' }}
              >
                {component.section}
              </span>
              <span className="text-xs text-gray-500">
                {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-4">
            <button
              onClick={onView}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded transition-colors"
              title="View details"
              type="button"
            >
              <Eye size={16} />
            </button>
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-green-600 rounded transition-colors"
              title="Edit component"
              type="button"
            >
              <Pencil size={16} />
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded transition-colors"
              title="Delete component"
              type="button"
            >
              <Trash2 size={16} />
            </button>
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded transition-colors"
              type="button"
            >
              {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Fields:</p>
            {component.form_json?.fields?.length > 0 ? (
              <div className="space-y-1">
                {component.form_json.fields.map((field, index) => (
                  <div
                    key={field.id ?? index}
                    className="flex items-center justify-between px-3 py-1.5 rounded text-xs"
                    style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 font-mono">{index + 1}.</span>
                      <span className="font-medium text-gray-700">{field.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {field.required && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{ background: '#fee2e2', color: '#991b1b' }}
                        >
                          required
                        </span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: '#e0e7ff', color: '#3730a3' }}
                      >
                        {field.type}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400">No fields defined.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Component Form Modal ───────────────────────────────────────────────

const ComponentFormModal: React.FC<ComponentFormModalProps> = ({
  isOpen,
  component,
  onClose,
  onSave,
  isLoading,
}) => {
  const [formData, setFormData] = useState<ComponentFormData>(() =>
    component
      ? { name: component.name, section: component.section, form_json: component.form_json }
      : emptyForm
  );
  const [jsonError, setJsonError] = useState<string | null>(null);

  const handleJsonChange = (value: string) => {
    try {
      const parsed = JSON.parse(value) as { fields: FormField[] };
      setFormData((prev) => ({ ...prev, form_json: parsed }));
      setJsonError(null);
    } catch {
      setJsonError('Invalid JSON format');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.section.trim() || jsonError) return;
    await onSave(formData);
  };

  if (!isOpen) return null;

  const isSubmitDisabled = isLoading || !formData.name.trim() || !formData.section.trim() || !!jsonError;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        style={{ background: '#ffffff' }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="text-xl font-semibold text-gray-900">
            {component ? 'Edit Component' : 'Create New Component'}
          </h2>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" type="button">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Component Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#d1d5db' }}
                placeholder="e.g., ACCESS TO JUSTICE"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section *</label>
              <input
                type="text"
                value={formData.section}
                onChange={(e) => setFormData((prev) => ({ ...prev, section: e.target.value }))}
                className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#d1d5db' }}
                placeholder="e.g., ACCESS TO JUSTICE"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Form JSON Structure *</label>
              <textarea
                value={formatJsonPreview(formData.form_json)}
                onChange={(e) => handleJsonChange(e.target.value)}
                rows={15}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                style={{ borderColor: '#d1d5db' }}
                placeholder='{"fields": [...]}'
              />
              {jsonError && <p className="mt-1 text-sm text-red-600">{jsonError}</p>}
              <p className="mt-1 text-xs text-gray-500">
                JSON must contain a "fields" array with form field definitions
              </p>
            </div>
          </div>
        </form>

        <div className="px-6 py-4 border-t flex justify-end gap-2" style={{ borderColor: '#e2e8f0' }}>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitDisabled}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Saving...' : component ? 'Update Component' : 'Create Component'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Delete Confirmation Modal ──────────────────────────────────────────

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  componentName,
  onConfirm,
  onCancel,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg shadow-xl w-full max-w-md" style={{ background: '#ffffff' }}>
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Confirm Delete</h3>
          <p className="text-gray-600">
            Are you sure you want to delete "{componentName}"? This action cannot be undone.
          </p>
          <div className="flex justify-end gap-2 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
              type="button"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isLoading}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors disabled:opacity-50"
              type="button"
            >
              {isLoading ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── View Details Modal ─────────────────────────────────────────────────

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({ isOpen, component, onClose }) => {
  if (!isOpen || !component) return null;

  const fieldCount = component.form_json?.fields?.length ?? 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: 'rgba(0,0,0,0.5)' }}>
      <div
        className="rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col"
        style={{ background: '#ffffff' }}
      >
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{ borderColor: '#e2e8f0' }}>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{component.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: '#e0e7ff', color: '#3730a3' }}
              >
                {component.section}
              </span>
              <span className="text-xs text-gray-500">
                {fieldCount} field{fieldCount !== 1 ? 's' : ''}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded" type="button">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {fieldCount > 0 ? (
            <div className="space-y-2">
              {component.form_json.fields.map((field, index) => (
                <div
                  key={field.id ?? index}
                  className="rounded-lg p-3"
                  style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 font-mono w-5">{index + 1}.</span>
                      <span className="text-sm font-medium text-gray-800">{field.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {field.required && (
                        <span
                          className="px-1.5 py-0.5 rounded text-xs font-medium"
                          style={{ background: '#fee2e2', color: '#991b1b' }}
                        >
                          required
                        </span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded text-xs font-medium"
                        style={{ background: '#e0e7ff', color: '#3730a3' }}
                      >
                        {field.type}
                      </span>
                    </div>
                  </div>
                  {field.dependsOn && (
                    <p className="mt-1 ml-7 text-xs text-gray-400">
                      Depends on <span className="font-medium text-gray-500">{field.dependsOn.field}</span>
                      {' = '}
                      <span className="font-medium text-gray-500">{String(field.dependsOn.value)}</span>
                    </p>
                  )}
                  {field.subFields && field.subFields.length > 0 && (
                    <p className="mt-1 ml-7 text-xs text-gray-400">
                      {field.subFields.length} sub-field{field.subFields.length !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400">No fields defined for this component.</p>
          )}

          <div className="text-xs text-gray-400 mt-4 pt-4 border-t border-gray-100">
            Created: {component.created_at ? new Date(component.created_at).toLocaleString() : 'N/A'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────

const SuperAdminComponents: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { masterComponents, masterSections, isLoading, error, actionSuccess } = useSelector(
    (state: RootState) => state.superAdmin
  );

  const [selectedSection, setSelectedSection] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<MasterComponent | null>(null);

  useEffect(() => {
    dispatch(fetchMasterComponents({}));
    dispatch(fetchMasterComponentSections());
  }, [dispatch]);

  useEffect(() => {
    if (actionSuccess) {
      dispatch(resetSuperAdminSuccess());
    }
  }, [actionSuccess, dispatch]);

  const filteredComponents = masterComponents.filter((c) => {
    const matchesSection = !selectedSection || c.section === selectedSection;
    const matchesSearch =
      !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.section.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const sections = ['All Sections', ...masterSections];

  const handleCreate = useCallback(
    async (data: ComponentFormData): Promise<boolean> => {
      const result = await dispatch(createMasterComponent(data));
      if (createMasterComponent.fulfilled.match(result)) {
        setIsCreateModalOpen(false);
        return true;
      }
      return false;
    },
    [dispatch]
  );

  const handleUpdate = useCallback(
    async (data: ComponentFormData): Promise<boolean> => {
      if (!selectedComponent) return false;
      const result = await dispatch(updateMasterComponent({ id: selectedComponent.id, ...data }));
      if (updateMasterComponent.fulfilled.match(result)) {
        setIsEditModalOpen(false);
        setSelectedComponent(null);
        return true;
      }
      return false;
    },
    [dispatch, selectedComponent]
  );

  const handleDelete = useCallback(async () => {
    if (!selectedComponent) return;
    const result = await dispatch(deleteMasterComponent(selectedComponent.id));
    if (deleteMasterComponent.fulfilled.match(result)) {
      setIsDeleteModalOpen(false);
      setSelectedComponent(null);
    }
  }, [dispatch, selectedComponent]);

  const openEditModal = useCallback((component: MasterComponent) => {
    setSelectedComponent(component);
    setIsEditModalOpen(true);
  }, []);

  const openDeleteModal = useCallback((component: MasterComponent) => {
    setSelectedComponent(component);
    setIsDeleteModalOpen(true);
  }, []);

  const openViewModal = useCallback((component: MasterComponent) => {
    setSelectedComponent(component);
    setIsViewModalOpen(true);
  }, []);

  if (isLoading && masterComponents.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 size={24} className="animate-spin text-blue-600" />
        <span className="ml-2 text-gray-600">Loading components...</span>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ background: '#f9fafb', minHeight: '100vh' }}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Master Components</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage inspection form templates used across all stations
        </p>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex justify-between items-center">
          <span className="text-red-700 text-sm">{error}</span>
          <button onClick={() => dispatch(clearSuperAdminError())} className="text-red-700" type="button">
            <X size={16} />
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <select
            value={selectedSection}
            onChange={(e) => setSelectedSection(e.target.value === 'All Sections' ? '' : e.target.value)}
            className="px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#d1d5db', background: '#ffffff' }}
          >
            {sections.map((section) => (
              <option key={section} value={section === 'All Sections' ? '' : section}>
                {section}
              </option>
            ))}
          </select>

          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name or section..."
            className="px-3 py-2 border rounded-md text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ borderColor: '#d1d5db' }}
          />
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          type="button"
        >
          <Plus size={18} className="mr-2" />
          Create Component
        </button>
      </div>

      {filteredComponents.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <p className="text-gray-500">No components found.</p>
          <p className="text-sm text-gray-400 mt-1">
            Click "Create Component" to add your first inspection form template.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredComponents.map((component) => (
            <ComponentCard
              key={component.id}
              component={component}
              onEdit={() => openEditModal(component)}
              onDelete={() => openDeleteModal(component)}
              onView={() => openViewModal(component)}
            />
          ))}
        </div>
      )}

      {/* key remounts the modal fresh so useState initializes from the new prop */}
      <ComponentFormModal
        key="create"
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreate}
        isLoading={isLoading}
      />

      <ComponentFormModal
        key={selectedComponent?.id ?? 'edit'}
        isOpen={isEditModalOpen}
        component={selectedComponent}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedComponent(null);
        }}
        onSave={handleUpdate}
        isLoading={isLoading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        componentName={selectedComponent?.name ?? ''}
        onConfirm={handleDelete}
        onCancel={() => {
          setIsDeleteModalOpen(false);
          setSelectedComponent(null);
        }}
        isLoading={isLoading}
      />

      <ViewDetailsModal
        isOpen={isViewModalOpen}
        component={selectedComponent}
        onClose={() => {
          setIsViewModalOpen(false);
          setSelectedComponent(null);
        }}
      />
    </div>
  );
};

export default SuperAdminComponents;