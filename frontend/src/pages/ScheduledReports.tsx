import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { Panel } from '../components/ui/Panel';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { ScheduleDialog } from '../components/report/ScheduleDialog';
import { useApp } from '../contexts/AppContext';
import { fixedTemplates } from '../data/templates';
import { selectClass } from '../utils/ui';

export function ScheduledReports() {
  const { schedules, addSchedule, toggleSchedule, savedReports } = useApp();
  const [open, setOpen] = useState(false);
  const [reportName, setReportName] = useState(fixedTemplates[0].name);

  const options = [...fixedTemplates, ...savedReports];

  return (
    <div className="pb-8">
      <PageHeader
        title="Scheduled Reports"
        subtitle="Automated delivery of saved reports to mailboxes, with the filters and formatting preserved."
        actions={
        <div className="flex items-center gap-2">
            <select
            className={`${selectClass} w-[260px]`}
            value={reportName}
            onChange={(e) => setReportName(e.target.value)}
            aria-label="Report to schedule">
            
              {options.map((r) =>
            <option key={r.id}>{r.name}</option>
            )}
            </select>
            <Button
            variant="primary"
            icon={<PlusIcon className="h-3.5 w-3.5" />}
            onClick={() => setOpen(true)}>
            
              New schedule
            </Button>
          </div>
        } />
      

      <div className="px-5 py-4">
        <Panel title="Active schedules">
          <table className="w-full">
            <thead>
              <tr className="border-b border-line bg-surface-muted text-left text-2xs uppercase tracking-wide text-ink-500">
                <th scope="col" className="px-3 py-1.5 font-semibold">Report</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Schedule</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Time</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Recipients</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Format</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Next run</th>
                <th scope="col" className="px-3 py-1.5 font-semibold">Status</th>
                <th scope="col" className="px-3 py-1.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.map((schedule) =>
              <tr
                key={schedule.id}
                className="border-b border-line/70 text-[13px] hover:bg-accent-50/40">
                
                  <td className="px-3 py-1.5 font-medium text-ink-900">
                    {schedule.reportName}
                  </td>
                  <td className="px-3 py-1.5 text-ink-700">{schedule.frequency}</td>
                  <td className="tabular px-3 py-1.5 text-ink-700">{schedule.time}</td>
                  <td className="px-3 py-1.5 text-ink-500">
                    {schedule.recipients.join(', ')}
                  </td>
                  <td className="px-3 py-1.5 text-ink-700">{schedule.format}</td>
                  <td className="px-3 py-1.5 text-ink-500">{schedule.nextRun}</td>
                  <td className="px-3 py-1.5">
                    <Badge tone={schedule.status === 'Active' ? 'green' : 'amber'}>
                      {schedule.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <Button
                    size="sm"
                    onClick={() => {
                      toggleSchedule(schedule.id);
                      toast.success(
                        schedule.status === 'Active' ? 'Schedule paused' : 'Schedule resumed'
                      );
                    }}>
                    
                      {schedule.status === 'Active' ? 'Pause' : 'Resume'}
                    </Button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Panel>
      </div>

      <ScheduleDialog
        open={open}
        onClose={() => setOpen(false)}
        reportName={reportName}
        onSchedule={(schedule) => {
          addSchedule(schedule);
          toast.success('Schedule created');
        }} />
      
    </div>);

}