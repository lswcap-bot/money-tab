import { Construction } from 'lucide-react';

export default function PlaceholderTab({ label }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-slate-400 gap-4">
      <Construction size={48} strokeWidth={1.5} className="text-brand-200" />
      <p className="text-lg font-medium text-slate-500">{label} 계산기</p>
      <p className="text-sm">준비 중입니다. 곧 업데이트될 예정입니다.</p>
    </div>
  );
}
