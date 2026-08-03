import { useState } from 'react';
import { Share2, Link, Download, Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useDownloadPlanPdf } from '@/lib/api/useReports';
import { ShareLinkDialog } from './ShareLinkDialog';
import { EmailShareDialog } from './EmailShareDialog';

interface SharePlanDropdownProps {
  planId: string;
  planName: string;
}

export function SharePlanDropdown({ planId, planName }: SharePlanDropdownProps) {
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [emailDialogOpen, setEmailDialogOpen] = useState(false);
  const { mutate: downloadPdf, isPending } = useDownloadPlanPdf();

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Share2 className="w-4 h-4" />
            Paylaş
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setLinkDialogOpen(true)}>
            <Link className="w-4 h-4 mr-2" />
            Link Kopyala
          </DropdownMenuItem>
          <DropdownMenuItem
            disabled={isPending}
            onClick={() => downloadPdf({ id: planId, planName })}
          >
            {isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            PDF İndir
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEmailDialogOpen(true)}>
            <Mail className="w-4 h-4 mr-2" />
            E-posta Gönder
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ShareLinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        planId={planId}
        planName={planName}
      />
      <EmailShareDialog
        open={emailDialogOpen}
        onOpenChange={setEmailDialogOpen}
        planId={planId}
        planName={planName}
      />
    </>
  );
}
