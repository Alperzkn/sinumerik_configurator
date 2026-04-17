"use client";

import { motion } from "framer-motion";

const machineTypes = [
  { name: "3-Axis Mill", icon: "🏭", axes: "X, Y, Z + Spindle" },
  { name: "5-Axis Center", icon: "⚙️", axes: "X, Y, Z, A, C + Spindle" },
  { name: "CNC Lathe", icon: "🔧", axes: "X, Z + Spindle" },
  { name: "Mill-Turn", icon: "🔩", axes: "Multi-axis + Multi-spindle" },
  { name: "Grinding", icon: "💎", axes: "X, Y, Z + Wheel" },
  { name: "Laser Cutting", icon: "⚡", axes: "X, Y, Z + Laser" },
  { name: "Punching", icon: "🔨", axes: "X, Y + Tool" },
  { name: "Robot Cell", icon: "🤖", axes: "6-axis articulated" },
];

export function MachineTypePreview() {
  return (
    <section className="py-24 px-6 bg-muted/50">
      <div className="mx-auto max-w-7xl">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Configure Any Machine Type
          </h2>
          <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
            Pre-built templates for common machine tools, or describe your custom machine
          </p>
        </motion.div>

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4">
          {machineTypes.map((machine, index) => (
            <motion.div
              key={machine.name}
              className="group relative flex flex-col items-center rounded-xl border bg-card p-6 text-center transition-all hover:shadow-md hover:border-primary/30 hover:bg-primary/5 cursor-default"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <span className="text-3xl mb-3">{machine.icon}</span>
              <h3 className="font-semibold text-sm">{machine.name}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {machine.axes}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
