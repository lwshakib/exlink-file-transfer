import { File, Folder, Clipboard, RotateCcw, Target, Heart, Settings2, Smartphone, AlignLeft, Laptop, Monitor } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import { motion } from "motion/react";

export function SendPage() {
  const selectionItems = [
    { label: "File", icon: File, delay: 0.1 },
    { label: "Folder", icon: Folder, delay: 0.2 },
    { label: "Text", icon: AlignLeft, delay: 0.3 },
    { label: "Paste", icon: Clipboard, delay: 0.4 },
  ];

  const devices = [
    { name: "Adorable Pear", id: "#100", type: "Tecno", icon: Smartphone, delay: 0.2 },
    { name: "Brave Lion", id: "#102", type: "Windows", icon: Laptop, delay: 0.3 },
    { name: "Calm Ocean", id: "#105", type: "Linux", icon: Monitor, delay: 0.4 },
  ];

  return (
    <div className="flex-1 flex flex-col px-8 py-10 max-w-5xl mx-auto w-full space-y-12">
      {/* File/Folder/Text/Paste selection grid */}
      <section className="space-y-5">
        <motion.h3 
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="text-sm font-semibold px-2 text-foreground/80 tracking-tight"
        >
          Selection
        </motion.h3>
        <div className="flex gap-4">
          {selectionItems.map((item, index) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: item.delay }}
              className="flex-1"
            >
              <Card className="h-full group cursor-pointer hover:bg-muted/50 bg-muted/20 border-border/40 transition-all duration-200 py-6 flex flex-col items-center justify-center gap-3 rounded-2xl min-h-[110px]">
                <item.icon className="h-7 w-7 text-foreground/80 group-hover:text-primary transition-colors" />
                <span className="text-sm font-semibold text-foreground/70">{item.label}</span>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Discovery list of available nodes on the local network */}
      <section className="space-y-5">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="flex items-center justify-between px-2"
        >
          <h3 className="text-sm font-semibold text-foreground/70 tracking-tight">Nearby devices</h3>
          <div className="flex items-center gap-1.5">
            {[RotateCcw, Target, Heart, Settings2].map((Icon, i) => (
              <Button key={i} variant="ghost" size="icon" className="h-8 w-8 rounded-full text-foreground/60 hover:text-foreground hover:bg-muted">
                <Icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </motion.div>

        {/* Device List */}
        <div className="space-y-3">
          {devices.map((device) => (
            <motion.div
              key={device.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: device.delay }}
            >
              <Card className="w-full p-4.5 flex items-center justify-between bg-muted/20 border border-border/40 hover:bg-muted/30 transition-all cursor-pointer group rounded-2xl relative">
                <div className="flex items-center gap-5">
                  <div className="h-[68px] w-[68px] flex items-center justify-center bg-muted/40 rounded-[20px]">
                    <device.icon className="h-9 w-9 text-foreground/90" strokeWidth={1.2} />
                  </div>
                  <div className="flex flex-col gap-1 items-start">
                    <h4 className="text-[22px] font-bold text-foreground leading-tight tracking-tight">{device.name}</h4>
                    <div className="flex gap-2">
                      <Badge variant="secondary" className="bg-muted/60 text-foreground/50 font-mono text-[10px] px-2.5 py-0.5 border-none rounded-[4px] uppercase font-bold">{device.id}</Badge>
                      <Badge variant="secondary" className="bg-muted/60 text-foreground/50 font-mono text-[10px] px-2.5 py-0.5 border-none rounded-[4px] uppercase font-bold">{device.type}</Badge>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center pr-1">
                  <Button variant="ghost" size="icon" className="rounded-full text-foreground/30 hover:text-foreground hover:bg-muted/50 transition-colors h-12 w-12 flex items-center justify-center">
                    <Heart className="h-6.5 w-6.5" strokeWidth={1.5} />
                  </Button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Footer Info */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="flex flex-col items-center gap-6 pt-4 flex-1 justify-end pb-4"
      >
        <Button variant="link" className="text-primary hover:no-underline font-bold text-[13px] tracking-wide h-auto p-0">
          Troubleshoot
        </Button>
        <p className="text-xs text-foreground/40 max-w-xs text-center leading-relaxed">
          Please ensure that the desired target is also on the same Wi-Fi network.
        </p>
      </motion.div>
    </div>
  );
}
