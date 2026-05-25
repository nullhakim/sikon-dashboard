import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/bank-accounts")({
  head: () => ({ meta: [{ title: "Bank Accounts — SIKOn ERP" }] }),
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Bank Accounts</h1>
        <p className="text-sm text-muted-foreground">
          Company and sales bank accounts.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Bank account CRUD will live here.
        </CardContent>
      </Card>
    </div>
  ),
});
