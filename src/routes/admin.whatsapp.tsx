import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MessageCircle, QrCode, Inbox } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WhatsAppConnectionPanel } from "@/components/whatsapp/WhatsAppConnectionPanel";
import { WhatsAppInbox } from "@/components/whatsapp/WhatsAppInbox";

export const Route = createFileRoute("/admin/whatsapp")({
  ssr: false,
  component: AdminWhatsAppPage,
});

function AdminWhatsAppPage() {
  const [tab, setTab] = useState("connection");

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageCircle className="h-6 w-6 text-emerald-600" />
          WhatsApp
        </h1>
        <p className="text-sm text-muted-foreground">
          Connect your WhatsApp Business number, manage the unified inbox, and assign chats to staff.
        </p>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="connection"><QrCode className="h-4 w-4 mr-1.5" />Connection</TabsTrigger>
          <TabsTrigger value="inbox"><Inbox className="h-4 w-4 mr-1.5" />Inbox</TabsTrigger>
        </TabsList>

        <TabsContent value="connection"><WhatsAppConnectionPanel /></TabsContent>
        <TabsContent value="inbox"><WhatsAppInbox scope="admin" /></TabsContent>
      </Tabs>
    </div>
  );
}
