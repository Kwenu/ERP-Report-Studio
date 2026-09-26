import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { FieldsTab } from './FieldsTab';
import type { ReportColumn } from '../../types/erp';

interface ColumnManagerDialogProps {
  open: boolean;
  onClose: () => void;
  columns: ReportColumn[];
  onColumnChange: (id: string, patch: Partial<ReportColumn>) => void;
  onRemove: (id: string) => void;
  onReorder: (fromId: string, toId: string) => void;
  onAddField: () => void;
}

export function ColumnManagerDialog({
  open,
  onClose,
  columns,
  onColumnChange,
  onRemove,
  onReorder,
  onAddField
}: ColumnManagerDialogProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Manage columns"
      description="Drag to reorder, toggle visibility, or open a column to change its formatting."
      footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
      
      <div className="rounded border border-line">
        <FieldsTab
          columns={columns}
          onColumnChange={onColumnChange}
          onRemove={onRemove}
          onReorder={onReorder}
          onAddField={onAddField} />
        
      </div>
    </Modal>);

}