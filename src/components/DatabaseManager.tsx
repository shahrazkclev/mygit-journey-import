import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Database, 
  Download, 
  Upload, 
  Trash2, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ExportProgress {
  table: string;
  status: 'pending' | 'exporting' | 'completed' | 'error';
  records: number;
  error?: string;
}

interface ImportProgress {
  table: string;
  status: 'pending' | 'importing' | 'completed' | 'error';
  records: number;
  error?: string;
}

export function DatabaseManager() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<ExportProgress[]>([]);
  const [importProgress, setImportProgress] = useState<ImportProgress[]>([]);
  const [exportData, setExportData] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Define all tables to export/import
  const tables = [
    'campaigns',
    'contacts', 
    'email_lists',
    'contact_lists',
    'campaign_sends',
    'tag_rules',
    'tag_rule_executions',
    'user_settings',
    'products',
    'reviews',
    'unsubscribes'
  ];

  const exportTable = async (tableName: string): Promise<ExportProgress> => {
    try {
      setExportProgress(prev => prev.map(p => 
        p.table === tableName ? { ...p, status: 'exporting' } : p
      ));

      const { data, error } = await supabase
        .from(tableName)
        .select('*');

      if (error) throw error;

      return {
        table: tableName,
        status: 'completed',
        records: data?.length || 0
      };
    } catch (error) {
      return {
        table: tableName,
        status: 'error',
        records: 0,
        error: error.message
      };
    }
  };

  const exportAllData = async () => {
    setIsExporting(true);
    setExportProgress(tables.map(table => ({
      table,
      status: 'pending' as const,
      records: 0
    })));

    const exportResults: any = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

    try {
      // Export each table
      for (const table of tables) {
        const result = await exportTable(table);
        setExportProgress(prev => prev.map(p => 
          p.table === table ? result : p
        ));
        
        if (result.status === 'completed') {
          const { data } = await supabase.from(table).select('*');
          exportResults[table] = data || [];
        }
      }

      // Add metadata
      exportResults._metadata = {
        exported_at: new Date().toISOString(),
        exported_by: user?.id,
        version: '1.0',
        tables: tables,
        total_tables: tables.length
      };

      setExportData(exportResults);

      // Create downloadable file
      const blob = new Blob([JSON.stringify(exportResults, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Database exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const importTable = async (tableName: string, data: any[]): Promise<ImportProgress> => {
    try {
      setImportProgress(prev => prev.map(p => 
        p.table === tableName ? { ...p, status: 'importing' } : p
      ));

      if (data.length === 0) {
        return {
          table: tableName,
          status: 'completed',
          records: 0
        };
      }

      // Clear existing data first
      const { error: deleteError } = await supabase
        .from(tableName)
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all records

      if (deleteError) throw deleteError;

      // Insert new data
      const { error: insertError } = await supabase
        .from(tableName)
        .insert(data);

      if (insertError) throw insertError;

      return {
        table: tableName,
        status: 'completed',
        records: data.length
      };
    } catch (error) {
      return {
        table: tableName,
        status: 'error',
        records: 0,
        error: error.message
      };
    }
  };

  const importAllData = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to import');
      return;
    }

    setIsImporting(true);
    setImportProgress(tables.map(table => ({
      table,
      status: 'pending' as const,
      records: 0
    })));

    try {
      const text = await selectedFile.text();
      const importData = JSON.parse(text);

      if (!importData._metadata) {
        throw new Error('Invalid backup file - missing metadata');
      }

      // Import each table
      for (const table of tables) {
        const tableData = importData[table] || [];
        const result = await importTable(table, tableData);
        setImportProgress(prev => prev.map(p => 
          p.table === table ? result : p
        ));
      }

      toast.success('Database imported successfully!');
      setSelectedFile(null);
    } catch (error) {
      console.error('Import failed:', error);
      toast.error('Import failed: ' + error.message);
    } finally {
      setIsImporting(false);
    }
  };

  const clearAllData = async () => {
    if (!confirm('⚠️ This will DELETE ALL DATA from your database. Are you sure?')) {
      return;
    }

    if (!confirm('This action cannot be undone. Type "DELETE ALL" to confirm:')) {
      return;
    }

    try {
      // Clear all tables in reverse order (to handle foreign keys)
      const tablesToClear = [...tables].reverse();
      
      for (const table of tablesToClear) {
        const { error } = await supabase
          .from(table)
          .delete()
          .neq('id', '00000000-0000-0000-0000-000000000000');
        
        if (error) {
          console.warn(`Failed to clear ${table}:`, error);
        }
      }

      toast.success('All data cleared successfully');
    } catch (error) {
      console.error('Clear failed:', error);
      toast.error('Clear failed: ' + error.message);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'exporting':
      case 'importing':
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'exporting':
      case 'importing':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Database Manager
          </h2>
          <p className="text-muted-foreground">
            Export, import, and manage your complete database
          </p>
        </div>
      </div>

      {/* Export Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Database
          </CardTitle>
          <CardDescription>
            Create a complete backup of all your data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Button 
              onClick={exportAllData}
              disabled={isExporting}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              {isExporting ? 'Exporting...' : 'Export All Data'}
            </Button>
            {exportData && (
              <Badge variant="outline" className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                Ready for download
              </Badge>
            )}
          </div>

          {/* Export Progress */}
          {exportProgress.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Export Progress</h4>
              <div className="space-y-1">
                {exportProgress.map((progress) => (
                  <div key={progress.table} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(progress.status)}
                      <span className="font-medium">{progress.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(progress.status)}>
                        {progress.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {progress.records} records
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Import Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Import Database
          </CardTitle>
          <CardDescription>
            Restore data from a backup file
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Select Backup File
              </label>
              <input
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              />
              {selectedFile && (
                <p className="text-sm text-green-600 mt-1">
                  Selected: {selectedFile.name}
                </p>
              )}
            </div>

            <div className="flex items-center gap-4">
              <Button 
                onClick={importAllData}
                disabled={isImporting || !selectedFile}
                className="flex items-center gap-2"
              >
                <Upload className="h-4 w-4" />
                {isImporting ? 'Importing...' : 'Import Data'}
              </Button>
            </div>
          </div>

          {/* Import Progress */}
          {importProgress.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Import Progress</h4>
              <div className="space-y-1">
                {importProgress.map((progress) => (
                  <div key={progress.table} className="flex items-center justify-between p-2 border rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(progress.status)}
                      <span className="font-medium">{progress.table}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStatusColor(progress.status)}>
                        {progress.status}
                      </Badge>
                      <span className="text-sm text-muted-foreground">
                        {progress.records} records
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Irreversible actions that will permanently delete data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Button 
              variant="destructive"
              onClick={clearAllData}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Data
            </Button>
            <p className="text-sm text-muted-foreground">
              This will delete all data from all tables
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Tables Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5" />
            Managed Tables
          </CardTitle>
          <CardDescription>
            All tables included in export/import operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {tables.map((table) => (
              <Badge key={table} variant="outline" className="justify-center">
                {table}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
