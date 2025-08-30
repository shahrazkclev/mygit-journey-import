import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Tag, List, Users } from "lucide-react";

interface DynamicRule {
  id: string;
  type: 'has_any_tags' | 'has_all_tags' | 'not_has_tags' | 'in_any_lists' | 'in_all_lists' | 'not_in_lists';
  values: string[];
}

interface DynamicListRuleBuilderProps {
  ruleConfig: any;
  onRuleChange: (ruleConfig: any) => void;
  availableTags: string[];
  availableLists: Array<{ id: string; name: string }>;
}

export const DynamicListRuleBuilder = ({ 
  ruleConfig, 
  onRuleChange, 
  availableTags, 
  availableLists 
}: DynamicListRuleBuilderProps) => {
  const [rules, setRules] = useState<DynamicRule[]>(
    ruleConfig?.rules || [{ id: '1', type: 'has_any_tags', values: [] }]
  );
  const [globalOperator, setGlobalOperator] = useState<'and' | 'or'>(
    ruleConfig?.globalOperator || 'and'
  );

  const updateParent = (newRules: DynamicRule[], newOperator: 'and' | 'or') => {
    onRuleChange({
      rules: newRules,
      globalOperator: newOperator,
      // Legacy support for simple tag rules
      requiredTags: newRules
        .filter(r => r.type === 'has_any_tags')
        .flatMap(r => r.values)
    });
  };

  const addRule = () => {
    const newRule: DynamicRule = {
      id: Date.now().toString(),
      type: 'has_any_tags',
      values: []
    };
    const newRules = [...rules, newRule];
    setRules(newRules);
    updateParent(newRules, globalOperator);
  };

  const removeRule = (ruleId: string) => {
    const newRules = rules.filter(r => r.id !== ruleId);
    setRules(newRules);
    updateParent(newRules, globalOperator);
  };

  const updateRule = (ruleId: string, updates: Partial<DynamicRule>) => {
    const newRules = rules.map(r => r.id === ruleId ? { ...r, ...updates } : r);
    setRules(newRules);
    updateParent(newRules, globalOperator);
  };

  const addValueToRule = (ruleId: string, value: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule && !rule.values.includes(value)) {
      updateRule(ruleId, { values: [...rule.values, value] });
    }
  };

  const removeValueFromRule = (ruleId: string, value: string) => {
    const rule = rules.find(r => r.id === ruleId);
    if (rule) {
      updateRule(ruleId, { values: rule.values.filter(v => v !== value) });
    }
  };

  const handleGlobalOperatorChange = (newOperator: 'and' | 'or') => {
    setGlobalOperator(newOperator);
    updateParent(rules, newOperator);
  };

  const getRuleTypeLabel = (type: DynamicRule['type']) => {
    switch (type) {
      case 'has_any_tags': return 'Has any of these tags';
      case 'has_all_tags': return 'Has all of these tags';
      case 'not_has_tags': return 'Does not have any of these tags';
      case 'in_any_lists': return 'Is in any of these lists';
      case 'in_all_lists': return 'Is in all of these lists';
      case 'not_in_lists': return 'Is not in any of these lists';
      default: return type;
    }
  };

  const getEstimatedCount = () => {
    // This is a simplified estimation - in a real implementation,
    // you'd query the database with the actual rules
    return "~50"; // Placeholder
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Dynamic Rules</Label>
        <div className="flex items-center space-x-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          <span>Estimated: {getEstimatedCount()} contacts</span>
        </div>
      </div>

      <div className="text-sm text-muted-foreground">
        Contacts matching these rules will automatically be added to this list
      </div>

      {/* Global Operator */}
      {rules.length > 1 && (
        <Card className="p-3">
          <div className="flex items-center space-x-4">
            <Label>Match:</Label>
            <div className="flex items-center space-x-2">
              <Switch
                checked={globalOperator === 'and'}
                onCheckedChange={(checked) => handleGlobalOperatorChange(checked ? 'and' : 'or')}
              />
              <Label className="text-sm">
                {globalOperator === 'and' ? 'All rules must match' : 'Any rule can match'}
              </Label>
            </div>
          </div>
        </Card>
      )}

      {/* Rules */}
      <div className="space-y-3">
        {rules.map((rule, index) => (
          <Card key={rule.id} className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  Rule {index + 1}
                  {rules.length > 1 && index > 0 && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      {globalOperator.toUpperCase()}
                    </span>
                  )}
                </Label>
                {rules.length > 1 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRule(rule.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Rule Type */}
                <div>
                  <Label className="text-xs">Condition</Label>
                  <Select
                    value={rule.type}
                    onValueChange={(value: DynamicRule['type']) => updateRule(rule.id, { type: value, values: [] })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      <SelectItem value="has_any_tags">Has any of these tags</SelectItem>
                      <SelectItem value="has_all_tags">Has all of these tags</SelectItem>
                      <SelectItem value="not_has_tags">Does not have these tags</SelectItem>
                      <SelectItem value="in_any_lists">Is in any of these lists</SelectItem>
                      <SelectItem value="in_all_lists">Is in all of these lists</SelectItem>
                      <SelectItem value="not_in_lists">Is not in these lists</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Values Selection */}
                <div>
                  <Label className="text-xs">
                    {rule.type.includes('lists') ? 'Select Lists' : 'Select Tags'}
                  </Label>
                  <Select
                    onValueChange={(value) => addValueToRule(rule.id, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Add ${rule.type.includes('lists') ? 'list' : 'tag'}...`} />
                    </SelectTrigger>
                    <SelectContent className="z-[60]">
                      {rule.type.includes('lists') ? (
                        availableLists && availableLists.length > 0 ? (
                          availableLists
                            .filter(list => list && list.id && typeof list.id === 'string' && list.id.trim().length > 0)
                            .map(list => (
                              <SelectItem key={list.id} value={list.id}>
                                <div className="flex items-center space-x-2">
                                  <List className="h-3 w-3" />
                                  <span>{list.name}</span>
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-lists" disabled>No lists available</SelectItem>
                        )
                      ) : (
                        availableTags && availableTags.length > 0 ? (
                          availableTags
                            .filter(tag => tag && typeof tag === 'string' && tag.trim().length > 0)
                            .map(tag => (
                              <SelectItem key={tag} value={tag}>
                                <div className="flex items-center space-x-2">
                                  <Tag className="h-3 w-3" />
                                  <span>{tag}</span>
                                </div>
                              </SelectItem>
                            ))
                        ) : (
                          <SelectItem value="no-tags" disabled>No tags available</SelectItem>
                        )
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Selected Values */}
              {rule.values.length > 0 && (
                <div className="space-y-2">
                  <Label className="text-xs">Selected:</Label>
                  <div className="flex flex-wrap gap-2">
                    {rule.values.map(value => {
                      const displayValue = rule.type.includes('lists') 
                        ? availableLists.find(l => l.id === value)?.name || value
                        : value;
                      
                      return (
                        <Badge
                          key={value}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeValueFromRule(rule.id, value)}
                        >
                          {rule.type.includes('lists') ? (
                            <List className="h-3 w-3 mr-1" />
                          ) : (
                            <Tag className="h-3 w-3 mr-1" />
                          )}
                          {displayValue} <X className="h-3 w-3 ml-1" />
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Rule Description */}
              <div className="text-xs text-muted-foreground p-2 bg-muted rounded">
                {getRuleTypeLabel(rule.type)}
                {rule.values.length > 0 && (
                  <span>: {rule.values.map(v => 
                    rule.type.includes('lists') 
                      ? availableLists.find(l => l.id === v)?.name || v
                      : v
                  ).join(', ')}</span>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Add Rule Button */}
      <Button variant="outline" onClick={addRule} className="w-full">
        <Plus className="h-4 w-4 mr-2" />
        Add Rule
      </Button>

      {/* Quick Templates */}
      <Card className="p-3">
        <Label className="text-sm font-medium mb-2 block">Quick Templates:</Label>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRules = [{ id: '1', type: 'has_any_tags' as const, values: [] }];
              setRules(newRules);
              updateParent(newRules, 'or');
            }}
          >
            Tag-based
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRules = [
                { id: '1', type: 'has_any_tags' as const, values: [] },
                { id: '2', type: 'not_has_tags' as const, values: [] }
              ];
              setRules(newRules);
              setGlobalOperator('and');
              updateParent(newRules, 'and');
            }}
          >
            Include & Exclude
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const newRules = [{ id: '1', type: 'in_any_lists' as const, values: [] }];
              setRules(newRules);
              updateParent(newRules, 'or');
            }}
          >
            List-based
          </Button>
        </div>
      </Card>
    </div>
  );
};