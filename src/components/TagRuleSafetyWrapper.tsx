import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Shield, Lock } from 'lucide-react';
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

interface TagRuleSafetyWrapperProps {
  children: React.ReactNode;
  action: 'delete' | 'disable' | 'enable' | 'edit';
  ruleName: string;
  onConfirm: () => void;
  disabled?: boolean;
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

const actionConfig = {
  delete: {
    title: 'Delete Tag Rule',
    description: 'This will permanently delete the tag rule and all its execution history.',
    confirmText: 'DELETE',
    buttonText: 'Delete Rule',
    icon: AlertTriangle,
    variant: 'destructive' as const,
  },
  disable: {
    title: 'Disable Tag Rule',
    description: 'This will stop the rule from automatically processing new contacts.',
    confirmText: 'DISABLE',
    buttonText: 'Disable Rule',
    icon: Lock,
    variant: 'secondary' as const,
  },
  enable: {
    title: 'Enable Tag Rule',
    description: 'This will activate the rule to automatically process contacts.',
    confirmText: 'ENABLE',
    buttonText: 'Enable Rule',
    icon: Shield,
    variant: 'default' as const,
  },
  edit: {
    title: 'Edit Tag Rule',
    description: 'This will open the rule editor. Changes will take effect immediately.',
    confirmText: 'EDIT',
    buttonText: 'Edit Rule',
    icon: Shield,
    variant: 'outline' as const,
  },
};

export function TagRuleSafetyWrapper({
  children,
  action,
  ruleName,
  onConfirm,
  disabled = false,
  variant,
  size,
  className,
}: TagRuleSafetyWrapperProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const config = actionConfig[action];
  const Icon = config.icon;

  const handleConfirm = async () => {
    if (confirmText !== config.confirmText) {
      alert(`Please type "${config.confirmText}" to confirm`);
      return;
    }

    try {
      setIsLoading(true);
      await onConfirm();
      setShowConfirmDialog(false);
      setConfirmText('');
    } catch (error) {
      console.error(`${action} failed:`, error);
      alert(`${action} failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
      <AlertDialogTrigger asChild>
        {children}
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-orange-500" />
            {config.title}
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              You are about to <strong>{action}</strong> the tag rule "{ruleName}".
            </p>
            
            <div className="p-3 bg-orange-50 border border-orange-200 rounded">
              <p className="text-sm text-orange-800">
                {config.description}
              </p>
            </div>
            
            {action === 'delete' && (
              <div className="p-3 bg-red-50 border border-red-200 rounded">
                <p className="text-sm font-medium text-red-800">
                  ⚠️ This action cannot be undone
                </p>
                <p className="text-xs text-red-600 mt-1">
                  All execution history will be permanently deleted
                </p>
              </div>
            )}
            
            {action === 'disable' && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-sm text-yellow-800">
                  ⚠️ Contacts will no longer be automatically processed by this rule
                </p>
              </div>
            )}
            
            {action === 'enable' && (
              <div className="p-3 bg-green-50 border border-green-200 rounded">
                <p className="text-sm text-green-800">
                  ✅ Rule will start processing contacts immediately
                </p>
              </div>
            )}
            
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Type <code className="bg-muted px-1 rounded">{config.confirmText}</code> to confirm:
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={`Type ${config.confirmText} here`}
                className="w-full px-3 py-2 border rounded-md text-sm"
                disabled={isLoading}
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel 
            onClick={() => {
              setShowConfirmDialog(false);
              setConfirmText('');
            }}
            disabled={isLoading}
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={confirmText !== config.confirmText || isLoading}
            className={
              action === 'delete' 
                ? "bg-destructive hover:bg-destructive/90" 
                : action === 'disable'
                ? "bg-yellow-600 hover:bg-yellow-700"
                : undefined
            }
          >
            {isLoading ? 'Processing...' : config.buttonText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
