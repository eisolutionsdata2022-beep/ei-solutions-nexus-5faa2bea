import { createFileRoute } from "@tanstack/react-router";
import { MessageCircle } from "lucide-react";
import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";

export const Route = createFileRoute("/staff/whatsapp")({
  ssr: false,
  component: StaffWhatsAppPage,
});

function StaffWhatsAppPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-emerald-600" />
          WhatsApp Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Conversations assigned to you. Reply directly — messages go out from the company WhatsApp Business number.
        </p>
      </div>

      <WhatsAppInbox scope="staff" />
    </div>
  );
}
