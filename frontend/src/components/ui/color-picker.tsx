import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Palette, Check } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  presets?: string[];
  showPresets?: boolean;
}

const defaultPresets = [
  "#684cff", "#22d3ee", "#34d399", "#fbbf24", "#f87171",
  "#a78bfa", "#60a5fa", "#fb7185", "#fb923c", "#facc15",
  "#10b981", "#8b5cf6", "#06b6d4", "#ef4444", "#6366f1",
  "#3b82f6", "#ec4899", "#f59e0b", "#84cc16", "#06b6d4"
];

const harmonyPalettes = {
  "Professional": ["#1f2937", "#374151", "#6b7280", "#9ca3af", "#d1d5db"],
  "Vibrant": ["#dc2626", "#ea580c", "#ca8a04", "#65a30d", "#059669"],
  "Pastel": ["#fecaca", "#fed7aa", "#fef3c7", "#dcfce7", "#dbeafe"],
  "Ocean": ["#0c4a6e", "#0369a1", "#0284c7", "#0ea5e9", "#38bdf8"],
  "Sunset": ["#7c2d12", "#ea580c", "#f59e0b", "#fbbf24", "#fde047"],
  "Forest": ["#14532d", "#166534", "#16a34a", "#22c55e", "#4ade80"]
};

export const ColorPicker: React.FC<ColorPickerProps> = ({
  value,
  onChange,
  label,
  presets = defaultPresets,
  showPresets = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeHarmony, setActiveHarmony] = useState<string | null>(null);

  const handleColorChange = (color: string) => {
    onChange(color);
  };

  const isValidHex = (color: string) => {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
  };

  const getContrastColor = (hexColor: string) => {
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <div className="flex items-center space-x-3">
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-16 h-10 p-1 border-2 hover:scale-105 transition-transform"
              style={{ backgroundColor: value }}
            >
              <div className="w-full h-full rounded-sm" style={{ backgroundColor: value }}>
                <span className="sr-only">Pick color</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-4">
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Palette className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Color Picker</span>
              </div>
              
              {/* Manual Color Input */}
              <div className="space-y-2">
                <Label className="text-xs">Custom Color</Label>
                <div className="flex space-x-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-12 h-8 rounded border border-border"
                  />
                  <Input
                    value={value}
                    onChange={(e) => {
                      if (isValidHex(e.target.value) || e.target.value === '') {
                        handleColorChange(e.target.value);
                      }
                    }}
                    placeholder="#684cff"
                    className="flex-1 text-sm"
                  />
                </div>
              </div>

              {/* Color Harmony Palettes */}
              <div className="space-y-3">
                <Label className="text-xs">Color Harmonies</Label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(harmonyPalettes).map(([name, colors]) => (
                    <div key={name} className="space-y-1">
                      <div className="text-xs text-muted-foreground">{name}</div>
                      <div className="flex space-x-1">
                        {colors.map((color, index) => (
                          <button
                            key={index}
                            onClick={() => handleColorChange(color)}
                            className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform relative"
                            style={{ backgroundColor: color }}
                          >
                            {value === color && (
                              <Check 
                                className="h-3 w-3 absolute inset-0 m-auto" 
                                style={{ color: getContrastColor(color) }}
                              />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preset Colors */}
              {showPresets && (
                <div className="space-y-2">
                  <Label className="text-xs">Popular Colors</Label>
                  <div className="grid grid-cols-10 gap-1">
                    {presets.map((color, index) => (
                      <button
                        key={index}
                        onClick={() => handleColorChange(color)}
                        className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform relative"
                        style={{ backgroundColor: color }}
                      >
                        {value === color && (
                          <Check 
                            className="h-3 w-3 absolute inset-0 m-auto" 
                            style={{ color: getContrastColor(color) }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Current Color Preview */}
              <div className="p-3 rounded-lg border" style={{ backgroundColor: value }}>
                <div style={{ color: getContrastColor(value) }}>
                  <div className="text-sm font-medium">Preview</div>
                  <div className="text-xs opacity-75">How this color looks in action</div>
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex-1">
          <Input
            value={value}
            onChange={(e) => {
              if (isValidHex(e.target.value) || e.target.value === '') {
                handleColorChange(e.target.value);
              }
            }}
            placeholder="#684cff"
            className="text-sm"
          />
        </div>

        <Badge 
          variant="secondary" 
          className="text-xs"
          style={{ 
            backgroundColor: `${value}20`,
            color: value,
            borderColor: `${value}40`
          }}
        >
          {value}
        </Badge>
      </div>
    </div>
  );
};