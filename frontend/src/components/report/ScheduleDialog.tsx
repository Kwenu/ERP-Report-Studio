import { useState } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Field } from '../ui/Field';
import type { ScheduledReport } from '../../types/erp';
import { inputClass, selectClass } from '../../utils/ui';

interface ScheduleDialogProps {
  open: boolean;
  onClose: () => void;
  reportName: string;
  onSchedule: (schedule: ScheduledReport) => void;
}

export function ScheduleDialog({
  open,
  onClose,
  reportName,
  onSchedule
}: ScheduleDialogProps) {
  const [frequency, setFrequency] = useState<ScheduledReport['frequency']>('Weekly');
  const [time, setTime] = useState('07:00');
  const [recipients, setRecipients] = useState('finance@polydime.lk');
  const [format, setFormat] = useState<ScheduledReport['format']>('Excel');

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Schedule report"
      description={reportName}
      footer={
      <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
          variant="primary"
          onClick={() => {
            onSchedule({
              id: `s-${Date.now()}`,
              reportName,
              frequency,
              time,
              recipients: recipients.split(',').map((r) => r.trim()).filter(Boolean),
              format,
              nextRun: frequency === 'Daily' ? `Tomorrow, ${time}` : `Next ${frequency.toLowerCase()} run, ${time}`,
              status: 'Active'
            });
            onClose();
          }}>
          
            Create schedule
          </Button>
        </>
      }>
      
      <div className="grid grid-cols-2 gap-3">
        <Field label="Frequency">
          <select
            className={selectClass}
            value={frequency}
            onChange={(e) =>
            setFrequency(e.target.value as ScheduledReport['frequency'])
            }>
            
            <option>Daily</option>
            <option>Weekly</option>
            <option>Monthly</option>
          </select>
        </Field>
        <Field label="Time">
          <input
            type="time"
            className={inputClass}
            value={time}
            onChange={(e) => setTime(e.target.value)} />
          
        </Field>
        <Field label="Recipients" className="col-span-2" hint="Comma separated email addresses.">
          <input
            className={inputClass}
            value={recipients}
            onChange={(e) => setRecipients(e.target.value)} />
          
        </Field>
        <Field label="Format" className="col-span-2">
          <select
            className={selectClass}
            value={format}
            onChange={(e) => setFormat(e.target.value as ScheduledReport['format'])}>
            
            <option>Excel</option>
            <option>PDF</option>
            <option>CSV</option>
          </select>
        </Field>
      </div>
    </Modal>);

}