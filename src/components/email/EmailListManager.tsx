import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Upload, Download, Users, Trash2, Plus, FileText } from "lucide-react";
import { toast } from "sonner";

export const EmailListManager = () => {
  const [lists, setLists] = useState([
    { id: 1, name: "Newsletter Subscribers", count: 1250, lastUpdated: "2024-01-15" },
    { id: 2, name: "Customer List", count: 890, lastUpdated: "2024-01-14" },
    { id: 3, name: "Prospects", count: 345, lastUpdated: "2024-01-13" }
  ]);
  const [newListName, setNewListName] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type !== "text/csv") {
        toast.error("Please upload a CSV file");
        return;
      }
      setCsvFile(file);
      toast.success(`Selected: ${file.name}`);
    }
  };

  const handleUploadCSV = () => {
    if (!csvFile) {
      toast.error("Please select a CSV file first");
      return;
    }
    // Simulate CSV processing
    toast.info("CSV processing requires Supabase backend integration");
  };

  const handleCreateList = () => {
    if (!newListName.trim()) {
      toast.error("Please enter a list name");
      return;
    }
    const newList = {
      id: Date.now(),
      name: newListName,
      count: 0,
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    setLists([...lists, newList]);
    setNewListName("");
    toast.success("Email list created successfully!");
  };

  const handleDeleteList = (id: number) => {
    setLists(lists.filter(list => list.id !== id));
    toast.success("Email list deleted");
  };

  return (
    <div className="space-y-6">
      {/* Create New List */}
      <Card className="shadow-soft border-email-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Plus className="h-5 w-5 text-email-primary" />
            <span>Create New List</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="listName">List Name</Label>
              <Input
                id="listName"
                placeholder="Enter list name..."
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="border-email-primary/30 focus:border-email-primary"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleCreateList}
                className="bg-email-primary hover:bg-email-primary/80 text-primary-foreground"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CSV Upload */}
      <Card className="shadow-soft border-email-secondary/20">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Upload className="h-5 w-5 text-email-secondary" />
            <span>Import from CSV</span>
          </CardTitle>
          <CardDescription>
            Upload a CSV file with email addresses. First column should be email, second column name (optional)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="csvFile">Select CSV File</Label>
              <Input
                id="csvFile"
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="border-email-secondary/30 focus:border-email-secondary"
              />
            </div>
            {csvFile && (
              <div className="flex items-center justify-between p-3 bg-email-secondary/10 rounded-lg">
                <div className="flex items-center space-x-2">
                  <FileText className="h-4 w-4 text-email-secondary" />
                  <span className="text-sm">{csvFile.name}</span>
                  <Badge variant="outline" className="border-email-secondary text-email-secondary">
                    {(csvFile.size / 1024).toFixed(1)} KB
                  </Badge>
                </div>
                <Button 
                  onClick={handleUploadCSV}
                  size="sm"
                  className="bg-email-secondary hover:bg-email-secondary/80 text-foreground"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Email Lists */}
      <div className="grid gap-4">
        <h3 className="text-lg font-semibold flex items-center space-x-2">
          <Users className="h-5 w-5 text-email-accent" />
          <span>Your Email Lists</span>
        </h3>
        
        {lists.map((list) => (
          <Card key={list.id} className="shadow-soft border-email-accent/20 hover:shadow-glow transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <h4 className="font-medium">{list.name}</h4>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center space-x-1">
                      <Users className="h-4 w-4" />
                      <span>{list.count.toLocaleString()} subscribers</span>
                    </span>
                    <span>Updated {list.lastUpdated}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="border-email-accent text-email-accent">
                    Active
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-email-secondary hover:bg-email-secondary"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteList(list.id)}
                    className="border-destructive hover:bg-destructive hover:text-destructive-foreground"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};