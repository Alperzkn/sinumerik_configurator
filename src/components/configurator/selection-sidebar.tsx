"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useConfiguratorStore } from "@/store/configurator-store";
import { cn } from "@/lib/utils";

interface SidebarItem {
  label: string;
  articleNumber?: string;
  orderCode?: string;
  quantity: number;
  category: string;
  isNew?: boolean;
}

function buildSidebarItems(
  config: ReturnType<typeof useConfiguratorStore.getState>["configuration"]
): { category: string; items: SidebarItem[] }[] {
  if (!config) return [];

  const groups: { category: string; items: SidebarItem[] }[] = [];

  // Control Unit
  groups.push({
    category: "Control Unit",
    items: [
      {
        label: config.controlUnit.name,
        articleNumber: config.controlUnit.articleNumber,
        quantity: 1,
        category: "Control Unit",
      },
    ],
  });

  // CNC Software
  groups.push({
    category: "CNC Software",
    items: [
      {
        label: `CNC SW ${config.softwareVariant === "export" ? "Export" : "Full"} ${config.cncSoftware.swVersion}`,
        articleNumber: config.cncSoftware.articleNumber,
        quantity: 1,
        category: "CNC Software",
      },
    ],
  });

  // Technology Packages
  if (config.technologyPackages.length > 0) {
    groups.push({
      category: "Technology Packages",
      items: config.technologyPackages.map((pkg) => ({
        label: pkg.name,
        articleNumber: pkg.articleNumber,
        orderCode: pkg.orderCode,
        quantity: 1,
        category: "Technology Package",
      })),
    });
  }

  // Software Options
  if (config.softwareOptions.length > 0) {
    groups.push({
      category: "Software Options",
      items: config.softwareOptions.map((opt) => ({
        label: opt.name,
        articleNumber: opt.articleNumber,
        orderCode: opt.orderCode,
        quantity: config.optionQuantities[opt.id] || 1,
        category: "Option",
      })),
    });
  }

  // Drives
  if (config.drives.length > 0) {
    groups.push({
      category: "Drives",
      items: config.drives.map((d) => ({
        label: d.name,
        articleNumber: d.articleNumber,
        quantity: config.driveQuantities[d.id] || 1,
        category: "Drive",
      })),
    });
  }

  // Motors
  if (config.motors.length > 0) {
    groups.push({
      category: "Motors",
      items: config.motors.map((m) => ({
        label: m.name,
        quantity: config.motorQuantities[m.id] || 1,
        category: "Motor",
      })),
    });
  }

  // HMI
  if (config.hmiComponents.length > 0) {
    groups.push({
      category: "HMI",
      items: config.hmiComponents.map((h) => ({
        label: h.name,
        articleNumber: h.articleNumber,
        quantity: 1,
        category: "HMI",
        isNew: h.isNew,
      })),
    });
  }

  // Safety (non-basic)
  const safetyItems = config.safetyFunctions.filter((sf) => !sf.isBasicScope);
  if (safetyItems.length > 0) {
    groups.push({
      category: "Safety",
      items: safetyItems.map((sf) => ({
        label: sf.name,
        articleNumber: sf.articleNumber,
        orderCode: sf.orderCode,
        quantity: 1,
        category: "Safety",
      })),
    });
  }

  // Cables
  if (config.cables && config.cables.length > 0) {
    groups.push({
      category: "Cables",
      items: config.cables
        .filter((c) => c.quantity > 0)
        .map((c) => ({
          label: c.name,
          articleNumber: c.articleNumber,
          quantity: c.quantity,
          category: "Cable",
        })),
    });
  }

  return groups;
}

export function SelectionSidebar() {
  const { configuration, selectedTemplate, currentStep } =
    useConfiguratorStore();
  const [collapsed, setCollapsed] = useState(false);

  const groups = buildSidebarItems(configuration);
  const totalItems = groups.reduce(
    (sum, g) => sum + g.items.reduce((s, i) => s + i.quantity, 0),
    0
  );

  const hasContent = configuration || selectedTemplate;

  return (
    <motion.aside
      className={cn(
        "fixed right-0 top-0 z-40 h-screen border-l bg-card/95 backdrop-blur-sm flex flex-col",
        "transition-[width] duration-300 ease-in-out",
        collapsed ? "w-12" : "w-72"
      )}
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {/* Toggle button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-b hover:bg-muted/50 transition-colors shrink-0"
        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-0.5">
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 19.5 8.25 12l7.5-7.5"
              />
            </svg>
            {totalItems > 0 && (
              <Badge className="text-[9px] px-1 py-0 h-4 min-w-4">
                {totalItems}
              </Badge>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between w-full px-3">
            <div className="flex items-center gap-2">
              <svg
                className="h-4 w-4 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                />
              </svg>
              <span className="text-xs font-semibold">Selected Products</span>
              {totalItems > 0 && (
                <Badge variant="secondary" className="text-[10px] h-5">
                  {totalItems}
                </Badge>
              )}
            </div>
            <svg
              className="h-4 w-4 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m8.25 4.5 7.5 7.5-7.5 7.5"
              />
            </svg>
          </div>
        )}
      </button>

      {/* Content */}
      {!collapsed && (
        <ScrollArea className="flex-1">
          <div className="p-3">
            {!hasContent ? (
              <div className="text-center py-8">
                <p className="text-xs text-muted-foreground">
                  Select a machine type to see components here
                </p>
              </div>
            ) : !configuration ? (
              // Pre-configuration: show selected template
              <div className="space-y-3">
                {selectedTemplate && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                      Selected Template
                    </div>
                    <div className="text-sm font-medium">
                      {selectedTemplate.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                    </div>
                  </div>
                )}
                <p className="text-[11px] text-muted-foreground text-center">
                  Components will appear after AI analysis
                </p>
              </div>
            ) : (
              // Post-configuration: show all selected products
              <div className="space-y-1">
                {/* Summary badges */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1"
                  >
                    <span className="text-primary font-bold">
                      {configuration.totalAxes}
                    </span>{" "}
                    axes
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1"
                  >
                    <span className="text-primary font-bold">
                      {configuration.totalChannels}
                    </span>{" "}
                    ch
                  </Badge>
                  <Badge
                    variant="outline"
                    className="text-[10px] gap-1 capitalize"
                  >
                    {configuration.estimatedComplexity}
                  </Badge>
                </div>

                <Separator className="my-2" />

                {/* Grouped items */}
                <AnimatePresence>
                  {groups.map((group) => (
                    <motion.div
                      key={group.category}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mb-3"
                    >
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 flex items-center justify-between">
                        <span>{group.category}</span>
                        <span className="text-primary">
                          {group.items.length}
                        </span>
                      </div>
                      <div className="space-y-1">
                        {group.items.map((item, idx) => (
                          <div
                            key={`${group.category}-${idx}`}
                            className="rounded border bg-background/50 px-2 py-1.5 text-[11px] hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-1">
                              <span className="font-medium leading-tight line-clamp-2">
                                {item.label}
                              </span>
                              {item.quantity > 1 && (
                                <Badge
                                  variant="secondary"
                                  className="text-[9px] px-1 py-0 h-4 shrink-0"
                                >
                                  x{item.quantity}
                                </Badge>
                              )}
                            </div>
                            {item.articleNumber && (
                              <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                                {item.articleNumber}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Step indicator at bottom */}
                <Separator className="my-2" />
                <div className="text-center text-[10px] text-muted-foreground">
                  Step: {currentStep.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      )}
    </motion.aside>
  );
}
