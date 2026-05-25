import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/payments")({
  head: () => ({ meta: [{ title: "Payments — SIKOn ERP" }] }),
  component: () => (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Payments</h1>
        <p className="text-sm text-muted-foreground">DP & full payment tracking.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Coming soon</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Payment list and process payment form will live here.
        </CardContent>
      </Card>
    </div>
  ),
});
