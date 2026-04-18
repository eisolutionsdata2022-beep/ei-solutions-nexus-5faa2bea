import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { UserServicePermissionsDialog } from "@/components/admin/UserServicePermissionsDialog";

export const Route = createFileRoute("/admin/users")({
  ssr: false,
  component: AdminUsers,
});

function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [permUser, setPermUser] = useState<{ id: string; name?: string; email?: string } | null>(null);

  useEffect(() => {
    const fetch = async () => {
      const snap = await getDocs(collection(db, "users"));
      const list: any[] = [];
      snap.forEach((d) => list.push({ id: d.id, ...d.data() }));
      setUsers(list);
    };
    fetch();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Users</h1>
        <p className="text-muted-foreground">All registered platform users.</p>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left py-3 px-4 font-medium text-muted-foreground">KYC Status</th>
                  <th className="text-right py-3 px-4 font-medium text-muted-foreground">Permissions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="py-3 px-4 text-foreground">{u.name || "—"}</td>
                    <td className="py-3 px-4 text-foreground">{u.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary" className="capitalize">{u.role}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={
                        u.kycStatus === "approved" ? "default" :
                        u.kycStatus === "rejected" ? "destructive" : "secondary"
                      } className="capitalize">
                        {u.kycStatus || "N/A"}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1"
                        onClick={() => setPermUser({ id: u.id, name: u.name, email: u.email })}
                      >
                        <ShieldCheck className="w-3 h-3" /> Manage Services
                      </Button>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {permUser && (
        <UserServicePermissionsDialog
          open={!!permUser}
          onClose={() => setPermUser(null)}
          user={permUser}
        />
      )}
    </div>
  );
}
