import { useEffect, useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { ReportDefinition, Visibility } from '../../types/erp';
import { inputClass, selectClass } from '../../utils/ui';

interface SaveAsDialogProps {
  open: boolean;
  onClose: () => void;
  definition: ReportDefinition;
  owner: string;
  onSave: (meta: {
    name: string;
    description: string;
    category: string;
    visibility: Visibility;
  }) => void;
}

const categories = ['Sales', 'Receivables', 'Management', 'Inventory', 'Finance', 'Ad hoc'];

export function SaveAsDialog({
  open,
  onClose,
  definition,
  owner,
  onSave
}: SaveAsDialogProps) {
  const [name, setName] = useState(definition.name);
  const [description, setDescription] = useState(definition.description);
  const [category, setCategory] = useState(definition.category);
  const [visibility, setVisibility] = useState<Visibility>('Private');

  useEffect(() => {
    if (open) {
      setName(
        definition.type === 'Fixed Template' ?
        `${definition.name} – My View` :
        definition.name
      );
      setDescription(definition.description);
      setCategory(definition.category);
      setVisibility(definition.visibility === 'Shared with Company' ? 'Private' : definition.visibility);
    }
  }, [open, definition]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Save report as"
      description="The original fixed template is never overwritten."
      footer={
      <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
          variant="primary"
          disabled={!name.trim()}
          onClick={() => {
            onSave({ name: name.trim(), description, category, visibility });
            onClose();
          }}>
          
            Save report
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <Field label="Report name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Monthly Customer Sales Analysis" />
          
        </Field>
        <Field label="Description">
          <textarea
            className={`${inputClass} h-16 resize-none py-1.5`}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Customer sales grouped by month and representative." />
          
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}>
              
              {categories.map((c) =>
              <option key={c}>{c}</option>
              )}
            </select>
          </Field>
          <Field label="Owner">
            <input className={`${inputClass} bg-surface-muted`} value={owner} readOnly />
          </Field>
        </div>
        <Field label="Visibility" hint="Sharing respects the viewer's role permissions.">
          <select
            className={selectClass}
            value={visibility}
            onChange={(e) => setVisibility(e.target.value as Visibility)}>
            
            <option>Private</option>
            <option>Shared with Department</option>
            <option>Shared with Company</option>
          </select>
        </Field>
        <div className="rounded border border-line bg-surface-muted px-3 py-2 text-2xs text-ink-500">
          Saved definition keeps {definition.columns.filter((c) => c.visible).length} columns,{' '}
          {definition.filters.length} filter{definition.filters.length === 1 ? '' : 's'},{' '}
          {definition.groupBy ? 'grouping' : 'no grouping'} and current formatting.
        </div>
      </div>
    </Modal>);

}