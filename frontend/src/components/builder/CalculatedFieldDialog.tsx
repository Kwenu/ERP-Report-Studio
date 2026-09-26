import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import { makeColumn } from '../../data/templates';
import type { CalculatedField, ColumnFormat, ReportColumn } from '../../types/erp';
import { inputClass, selectClass } from '../../utils/ui';

const operands = [
{ key: 'qty', label: 'Quantity' },
{ key: 'salesPrice', label: 'Sales Price' },
{ key: 'amount', label: 'Amount' },
{ key: 'openBalance', label: 'Open Balance' },
{ key: 'paidAmount', label: 'Payment Amount' },
{ key: 'aging', label: 'Aging (days)' },
{ key: 'creditLimit', label: 'Credit Limit' }];


const operators = [
{ op: '*', label: '× multiplied by' },
{ op: '+', label: '+ plus' },
{ op: '-', label: '− minus' },
{ op: '/', label: '÷ divided by' }] as
const;

interface CalculatedFieldDialogProps {
  open: boolean;
  onClose: () => void;
  onCreate: (column: ReportColumn, calculated: CalculatedField) => void;
}

export function CalculatedFieldDialog({
  open,
  onClose,
  onCreate
}: CalculatedFieldDialogProps) {
  const [name, setName] = useState('Gross Sales');
  const [left, setLeft] = useState('qty');
  const [op, setOp] = useState<CalculatedField['op']>('*');
  const [right, setRight] = useState('salesPrice');
  const [format, setFormat] = useState<ColumnFormat>('currency');

  const leftLabel = operands.find((o) => o.key === left)?.label;
  const rightLabel = operands.find((o) => o.key === right)?.label;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create calculated field"
      description="Build a formula from existing ERP measures — no SQL or expressions to learn."
      footer={
      <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
          variant="primary"
          disabled={!name.trim()}
          onClick={() => {
            const key = `calc_${name.trim().replace(/[^a-z0-9]+/gi, '_').toLowerCase()}`;
            const column = makeColumn(`Calculated.${key}`, key, name.trim(), 'currency', {
              aggregation: 'sum',
              format,
              width: 140
            });
            onCreate(column, { key, label: name.trim(), left, op, right });
            onClose();
          }}>
          
            Add calculated field
          </Button>
        </>
      }>
      
      <div className="space-y-3">
        <Field label="Calculated field name">
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)} />
          
        </Field>

        <div className="rounded border border-line bg-surface-muted p-3">
          <p className="mb-2 text-2xs font-semibold uppercase tracking-wide text-ink-500">
            Formula builder
          </p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <select
              aria-label="First value"
              className={selectClass}
              value={left}
              onChange={(e) => setLeft(e.target.value)}>
              
              {operands.map((o) =>
              <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              )}
            </select>
            <select
              aria-label="Operator"
              className={`${selectClass} w-[150px]`}
              value={op}
              onChange={(e) => setOp(e.target.value as CalculatedField['op'])}>
              
              {operators.map((o) =>
              <option key={o.op} value={o.op}>
                  {o.label}
                </option>
              )}
            </select>
            <select
              aria-label="Second value"
              className={selectClass}
              value={right}
              onChange={(e) => setRight(e.target.value)}>
              
              {operands.map((o) =>
              <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              )}
            </select>
          </div>
          <p className="mt-2 rounded border border-line bg-white px-2 py-1.5 text-xs text-ink-700">
            <span className="font-semibold text-ink-900">{name || 'New field'}</span> ={' '}
            {leftLabel} {operators.find((o) => o.op === op)?.label.slice(0, 1)} {rightLabel}
          </p>
        </div>

        <Field label="Display format">
          <select
            className={selectClass}
            value={format}
            onChange={(e) => setFormat(e.target.value as ColumnFormat)}>
            
            <option value="currency">Currency</option>
            <option value="number">Number</option>
            <option value="percent">Percentage</option>
          </select>
        </Field>
      </div>
    </Modal>);

}