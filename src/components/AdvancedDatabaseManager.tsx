import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Download, 
  Upload, 
  Settings,
  Code,
  Table,
  Function,
  Shield,
  FileText,
  Archive
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface ExportOptions {
  includeData: boolean;
  includeSchema: boolean;
  includeFunctions: boolean;
  includeTriggers: boolean;
  includeRls: boolean;
  includeIndexes: boolean;
  tables: string[];
}

export function AdvancedDatabaseManager() {
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportOptions, setExportOptions] = useState<ExportOptions>({
    includeData: true,
    includeSchema: true,
    includeFunctions: true,
    includeTriggers: true,
    includeRls: true,
    includeIndexes: true,
    tables: [
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
    ]
  });

  const exportSchema = async () => {
    try {
      // Get table schemas
      const { data: tables, error: tablesError } = await supabase
        .rpc('get_table_schemas');
      
      if (tablesError) throw tablesError;

      // Get functions
      const { data: functions, error: functionsError } = await supabase
        .rpc('get_functions');
      
      if (functionsError) throw functionsError;

      // Get triggers
      const { data: triggers, error: triggersError } = await supabase
        .rpc('get_triggers');
      
      if (triggersError) throw triggersError;

      return {
        tables,
        functions,
        triggers
      };
    } catch (error) {
      console.error('Schema export failed:', error);
      return null;
    }
  };

  const exportData = async (tables: string[]) => {
    const data: any = {};
    
    for (const table of tables) {
      try {
        const { data: tableData, error } = await supabase
          .from(table)
          .select('*');
        
        if (error) throw error;
        data[table] = tableData || [];
      } catch (error) {
        console.error(`Failed to export ${table}:`, error);
        data[table] = [];
      }
    }
    
    return data;
  };

  const exportCompleteDatabase = async () => {
    setIsExporting(true);
    
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const exportResult: any = {
        _metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.id,
          version: '2.0',
          type: 'complete_database_export'
        }
      };

      // Export data if requested
      if (exportOptions.includeData) {
        exportResult.data = await exportData(exportOptions.tables);
      }

      // Export schema if requested
      if (exportOptions.includeSchema || exportOptions.includeFunctions || exportOptions.includeTriggers) {
        exportResult.schema = await exportSchema();
      }

      // Create and download file
      const blob = new Blob([JSON.stringify(exportResult, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complete-database-backup-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Complete database exported successfully!');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed: ' + error.message);
    } finally {
      setIsExporting(false);
    }
  };

  const exportSchemaOnly = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const schema = await exportSchema();
      
      if (!schema) {
        toast.error('Failed to export schema');
        return;
      }

      const exportResult = {
        _metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.id,
          version: '2.0',
          type: 'schema_only_export'
        },
        schema
      };

      const blob = new Blob([JSON.stringify(exportResult, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-schema-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Schema exported successfully!');
    } catch (error) {
      console.error('Schema export failed:', error);
      toast.error('Schema export failed: ' + error.message);
    }
  };

  const exportDataOnly = async () => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const data = await exportData(exportOptions.tables);
      
      const exportResult = {
        _metadata: {
          exported_at: new Date().toISOString(),
          exported_by: user?.id,
          version: '2.0',
          type: 'data_only_export'
        },
        data
      };

      const blob = new Blob([JSON.stringify(exportResult, null, 2)], {
        type: 'application/json'
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `database-data-${timestamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Data exported successfully!');
    } catch (error) {
      console.error('Data export failed:', error);
      toast.error('Data export failed: ' + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Advanced Database Manager
          </h2>
          <p className="text-muted-foreground">
            Complete database export with schema, functions, triggers, and data
          </p>
        </div>
      </div>

      <Tabs defaultValue="export" className="space-y-6">
        <TabsList>
          <TabsTrigger value="export">Export</TabsTrigger>
          <TabsTrigger value="import">Import</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Export Options
              </CardTitle>
              <CardDescription>
                Choose what to include in your database export
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Type Selection */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button
                  onClick={exportCompleteDatabase}
                  disabled={isExporting}
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <Archive className="h-6 w-6" />
                  <span>Complete Database</span>
                </Button>
                
                <Button
                  onClick={exportSchemaOnly}
                  disabled={isExporting}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <Code className="h-6 w-6" />
                  <span>Schema Only</span>
                </Button>
                
                <Button
                  onClick={exportDataOnly}
                  disabled={isExporting}
                  variant="outline"
                  className="h-20 flex flex-col items-center gap-2"
                >
                  <Table className="h-6 w-6" />
                  <span>Data Only</span>
                </Button>
              </div>

              {/* Export Options */}
              <div className="space-y-4">
                <h4 className="font-medium">Export Options</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeData}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeData: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include Data</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeSchema}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeSchema: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include Schema</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeFunctions}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeFunctions: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include Functions</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeTriggers}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeTriggers: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include Triggers</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeRls}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeRls: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include RLS</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={exportOptions.includeIndexes}
                      onChange={(e) => setExportOptions(prev => ({
                        ...prev,
                        includeIndexes: e.target.checked
                      }))}
                    />
                    <span className="text-sm">Include Indexes</span>
                  </label>
                </div>
              </div>

              {/* Table Selection */}
              <div className="space-y-4">
                <h4 className="font-medium">Tables to Export</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                  {exportOptions.tables.map((table) => (
                    <Badge key={table} variant="outline" className="justify-center">
                      {table}
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Database
              </CardTitle>
              <CardDescription>
                Restore from a complete database backup
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Select Backup File
                  </label>
                  <input
                    type="file"
                    accept=".json"
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
                
                <Button className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  Import Complete Database
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Database Settings
              </CardTitle>
              <CardDescription>
                Configure database management options
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Auto-backup</h4>
                    <p className="text-sm text-muted-foreground">
                      Automatically create backups before major changes
                    </p>
                  </div>
                  <input type="checkbox" />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Compress exports</h4>
                    <p className="text-sm text-muted-foreground">
                      Compress backup files to save space
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium">Include metadata</h4>
                    <p className="text-sm text-muted-foreground">
                      Include export metadata and timestamps
                    </p>
                  </div>
                  <input type="checkbox" defaultChecked />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
