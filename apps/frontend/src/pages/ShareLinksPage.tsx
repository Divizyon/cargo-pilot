import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ShareLinksManager } from '@/features/platform/components/ShareLinksManager';

export function ShareLinksPage() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 pt-5 pb-0 bg-zinc-50">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 text-zinc-500 hover:text-zinc-900"
          onClick={() => navigate('/planning')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Planlara Dön
        </Button>
      </div>
      <ShareLinksManager />
    </div>
  );
}
