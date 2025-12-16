import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle data-testid="text-welcome-title">Welcome</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground" data-testid="text-welcome-message">
            Your application is ready. Start building something amazing.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
