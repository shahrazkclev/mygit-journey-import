import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RotateCcw, Shield, CheckCircle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';

interface TagRuleDesinfectButtonProps {
  ruleId: string;
  ruleName: string;
  onDesinfectComplete?: (result: any) => void;
}

interface RuleStats {
  success: boolean;
  rule_name: string;
  total_executions: number;
  unique_contacts_affected: number;
  recent_executions_7_days: number;
  rule_enabled: boolean;
  trigger_match_type: string;
  trigger_tags: string[];
  add_tags: string[];
  remove_tags: string[];
}

export function TagRuleDesinfectButton({ 
  ruleId, 
  ruleName, 
  onDesinfectComplete 
}: TagRuleDesinfectButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [stats, setStats] = useState<RuleStats | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<any>(null);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('get-tag-rule-stats', {
        body: { rule_id: ruleId }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      setStats(data);
    } catch (error) {
      console.error('Failed to load rule stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesinfect = async () => {
    if (confirmText !== 'DESINFECT') {
      alert('Please type "DESINFECT" to confirm');
      return;
    }

    try {
      setIsLoading(true);
      const { data, error } = await supabase.functions.invoke('desinfect-tag-rule', {
        body: { 
          rule_id: ruleId,
          confirm: true 
        }
      });

      if (error) throw error;
      if (!data.success) throw new Error(data.message);

      setResult(data);
      onDesinfectComplete?.(data);
      setShowConfirmDialog(false);
      setConfirmText('');
    } catch (error) {
      console.error('Desinfect failed:', error);
      alert(`Desinfect failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats Display */}
      {stats && (
        <div className="p-4 border rounded-lg bg-muted/50">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="h-4 w-4 text-blue-500" />
            <h4 className="font-medium">Rule Impact Analysis</h4>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Total Executions:</span>
              <span className="ml-2 font-medium">{stats.total_executions}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Contacts Affected:</span>
              <span className="ml-2 font-medium">{stats.unique_contacts_affected}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Recent (7 days):</span>
              <span className="ml-2 font-medium">{stats.recent_executions_7_days}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <Badge variant={stats.rule_enabled ? "default" : "secondary"} className="ml-2">
                {stats.rule_enabled ? "Active" : "Disabled"}
              </Badge>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t">
            <div className="text-sm">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-muted-foreground">Trigger:</span>
                <Badge variant="outline">{stats.trigger_match_type}</Badge>
                <span className="text-xs">{stats.trigger_tags.join(', ')}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Action:</span>
                <span className="text-xs">
                  Add: {stats.add_tags.join(', ')} | Remove: {stats.remove_tags.join(', ')}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desinfect Button */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogTrigger asChild>
          <Button 
            variant="destructive" 
            size="sm"
            onClick={loadStats}
            disabled={isLoading}
            className="w-full"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            {isLoading ? 'Loading...' : 'Desinfect Contacts'}
          </Button>
        </AlertDialogTrigger>
        
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Desinfect Tag Rule
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                This will <strong>reverse all changes</strong> made by the rule "{ruleName}".
              </p>
              
              {stats && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded">
                  <p className="text-sm font-medium text-destructive">
                    ⚠️ This will affect {stats.unique_contacts_affected} contacts
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.total_executions} total executions will be reversed
                  </p>
                </div>
              )}
              
              <div className="space-y-2">
                <p className="text-sm font-medium">What will happen:</p>
                <ul className="text-xs space-y-1 ml-4">
                  <li>• Remove tags that were added by this rule</li>
                  <li>• Restore tags that were removed by this rule</li>
                  <li>• Log all desinfect actions for audit trail</li>
                </ul>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Type <code className="bg-muted px-1 rounded">DESINFECT</code> to confirm:
                </label>
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="Type DESINFECT here"
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowConfirmDialog(false);
              setConfirmText('');
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDesinfect}
              disabled={confirmText !== 'DESINFECT' || isLoading}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isLoading ? 'Processing...' : 'Desinfect Now'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Result Display */}
      {result && (
        <div className="p-4 border rounded-lg bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="font-medium text-green-800">Desinfect Completed</span>
          </div>
          <div className="text-sm text-green-700 space-y-1">
            <p>Updated {result.updated_contacts} contacts</p>
            {result.errors > 0 && (
              <p className="text-orange-600">{result.errors} errors occurred</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
