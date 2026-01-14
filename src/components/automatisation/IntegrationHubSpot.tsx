import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Zap, AlertCircle, CheckCircle2 } from 'lucide-react';

export function IntegrationHubSpot() {
  const { toast } = useToast();
  const [isConfigured, setIsConfigured] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          HubSpot CRM
        </CardTitle>
        <CardDescription>
          Synchronisez vos contacts avec HubSpot
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/50">
          <div className="flex items-center gap-3">
            {isConfigured ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-semibold">Intégration active</p>
                  <p className="text-xs text-muted-foreground">API connectée</p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold">Non configurée</p>
                  <p className="text-xs text-muted-foreground">Configuration requise</p>
                </div>
              </>
            )}
          </div>
          <Badge variant={isConfigured ? 'default' : 'secondary'}>
            {isConfigured ? 'Actif' : 'Inactif'}
          </Badge>
        </div>

        <div className="p-4 rounded-lg border bg-blue-50 dark:bg-blue-950/20">
          <p className="text-sm font-bold text-blue-600 dark:text-blue-400">
            🔧 ECD
          </p>
        </div>

        <Button 
          disabled
          variant="outline"
          className="w-full"
        >
          Configurer HubSpot
        </Button>
      </CardContent>
    </Card>
  );
}