import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/users")({
  head: () => ({ meta: [{ title: "Users & Sales — SIKOn ERP" }] }),
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Users & Sales</h1>
        <p className="text-sm text-muted-foreground">Register and manage sales users.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          User registration and listing will live here.
        </CardContent>
      </Card>
    </div>
  ),
});
