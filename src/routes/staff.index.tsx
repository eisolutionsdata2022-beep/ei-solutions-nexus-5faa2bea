import { createFileRoute, Link } from "@tanstack/react-router";
import { CRMDashboard } from "@/components/crm/CRMDashboard";
import { Card, CardContent } from "@/components/ui/card";
import { UserPlus, Users, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/staff/")({
  ssr: false,
  component: StaffHome,
});

function StaffHome() {
  return (
    <div className="space-y-6 md:space-y-8">
      {/* Mobile-friendly Quick Actions — visible on every screen size */}
      <section>
        <h2 className="text-lg font-bold text-foreground mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link to="/staff/create-user" className="block">
            <Card className="hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/40 active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0">
                  <UserPlus className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground">Create User</div>
                  <div className="text-xs text-muted-foreground truncate">
                    Register a new retailer / user
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>

          <Link to="/staff/create-user" className="block" search={{} as any}>
            <Card className="hover:shadow-lg transition-all border-2 border-transparent hover:border-primary/40 active:scale-[0.99]">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-foreground">My Created Users</div>
                  <div className="text-xs text-muted-foreground truncate">
                    View users you registered
                  </div>
                </div>
                <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0" />
              </CardContent>
            </Card>
          </Link>
        </div>
      </section>

      <CRMDashboard />
    </div>
  );
}
