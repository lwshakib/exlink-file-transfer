import { Minus, Square, X, Download, Send, Settings, Smartphone, Laptop, UserCheck, ArrowDown, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/common/Logo";
import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ReceivePage } from "./components/pages/ReceivePage";
import { SendPage } from "./components/pages/SendPage";
import { SettingsPage } from "./components/pages/SettingsPage";
import { useSelection, SelectedItem } from "./hooks/useSelection";
import { motion, AnimatePresence } from "motion/react";

import { Badge } from "@/components/ui/badge";

function App() {
  const [activeTab, setActiveTab] = useState<"receive" | "send" | "settings">("send");
  const [pendingRequest, setPendingRequest] = useState<{ deviceId: string, name: string, platform: string, brand?: string } | null>(null);
  const [waitingFor, setWaitingFor] = useState<{ 
    deviceId: string, 
    name: string, 
    platform: string, 
    os?: string, 
    brand?: string, 
    ip?: string,
    status?: 'waiting' | 'declined' | 'error'
  } | null>(null);
  const [localInfo, setLocalInfo] = useState<{ name: string, id: string, os: string } | null>(null);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [savePath, setSavePath] = useState('');
  const [transferStartTime, setTransferStartTime] = useState<number | null>(null);
  const [transferDuration, setTransferDuration] = useState(0);
  useEffect(() => {
    window.ipcRenderer.invoke('get-upload-dir').then(setSavePath);
  }, []);

  const [transferData, setTransferData] = useState<{
    type: 'sending' | 'receiving',
    status: 'transferring' | 'completed' | 'error',
    progress: number,
    fileProgress?: number,
    speed: number,
    currentFile: string,
    currentIndex: number,
    totalFiles: number,
    processedBytes: number,
    totalBytes: number,
    items?: SelectedItem[],
    remoteDevice?: {
      name: string,
      platform: string,
      os?: string,
      brand?: string,
      deviceId: string
    }
  } | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState(0);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const lastProcessedRef = useRef(0);
  const prevBytesRef = useRef(0);
  const speedIntervalRef = useRef<any>(null);
  const speedsRef = useRef<number[]>([]); // For moving average
  
  const { selectedItems, clearSelection } = useSelection();

  const formatFileSize = (bytes: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  useEffect(() => {
    let interval: any;
    if (transferData && transferData.status === 'transferring') {
      if (!transferStartTime) {
        setTransferStartTime(Date.now());
      }
      interval = setInterval(() => {
        if (transferStartTime) {
          setTransferDuration(Math.floor((Date.now() - transferStartTime) / 1000));
        }
      }, 1000);

      // Speed calculation with smoothing
      prevBytesRef.current = lastProcessedRef.current;
      speedsRef.current = [];
      speedIntervalRef.current = setInterval(() => {
        const current = lastProcessedRef.current;
        const diff = current - prevBytesRef.current;
        const speed = Math.max(0, diff);
        
        // Moving average of last 3 samples
        speedsRef.current.push(speed);
        if (speedsRef.current.length > 3) speedsRef.current.shift();
        
        const avgSpeed = speedsRef.current.reduce((a, b) => a + b, 0) / speedsRef.current.length;
        setCurrentSpeed(avgSpeed);
        
        prevBytesRef.current = current;
      }, 1000);

    } else if (transferData && transferData.status === 'completed') {
      setCurrentSpeed(0);
    } else {
      setTransferStartTime(null);
      setTransferDuration(0);
      setCurrentSpeed(0);
    }
    return () => {
      clearInterval(interval);
    };
  }, [transferData?.status, transferStartTime]);

  useEffect(() => {
    if (transferData && transferData.status === 'transferring') {
       if (!speedIntervalRef.current) {
          prevBytesRef.current = lastProcessedRef.current;
          speedIntervalRef.current = setInterval(() => {
            const current = lastProcessedRef.current;
            const diff = current - prevBytesRef.current;
            const speed = Math.max(0, diff);
            
            speedsRef.current.push(speed);
            if (speedsRef.current.length > 3) speedsRef.current.shift();
            
            const avgSpeed = speedsRef.current.reduce((a, b) => a + b, 0) / speedsRef.current.length;
            setCurrentSpeed(avgSpeed);
            
            prevBytesRef.current = current;
          }, 1000);
       }
    } else {
       if (speedIntervalRef.current) {
         clearInterval(speedIntervalRef.current);
         speedIntervalRef.current = null;
       }
       setCurrentSpeed(0);
    }
    return () => {
      // Don't clear here, let it run as long as status is transferring
    };
  }, [transferData?.status]);

  const formatDuration = (seconds: number) => {
    const min = Math.floor(seconds / 60);
    const sec = seconds % 60;
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    // Get local info for pairing UI
    window.ipcRenderer.invoke('get-server-info').then(info => {
      setLocalInfo({ 
        name: info.name, 
        id: info.id,
        os: info.os
      });
    });

    const removeReqListener = window.ipcRenderer.on('connection-request', (_event: any, req: any) => {
      setPendingRequest(req);
    });

    const removeResListener = window.ipcRenderer.on('pairing-response', (_event: any, { accepted }: { accepted: boolean }) => {
      if (waitingFor && accepted) {
        // Start transfer
        window.ipcRenderer.invoke('start-transfer', {
            deviceId: waitingFor.deviceId,
            deviceIp: waitingFor.ip,
            platform: waitingFor.platform,
            items: selectedItems
        });
        setTransferData({
            type: 'sending',
            status: 'transferring',
            progress: 0,
            speed: 0,
            currentFile: selectedItems[0]?.name || 'Files',
            currentIndex: 0,
            totalFiles: selectedItems.length,
            processedBytes: 0,
            totalBytes: selectedItems.reduce((acc, i) => acc + (i.size || 0), 0),
            items: selectedItems,
            remoteDevice: {
              name: waitingFor.name,
              platform: waitingFor.platform,
              os: waitingFor.os,
              brand: waitingFor.brand,
              deviceId: waitingFor.deviceId
            }
        });
        setWaitingFor(null);
      } else if (waitingFor && !accepted) {
        setWaitingFor(prev => prev ? { ...prev, status: 'declined' } : null);
      }
    });

    const removeStartListener = window.ipcRenderer.on('pairing-initiated-ui', (_event: any, req: any) => {
      setWaitingFor({ ...req, ip: req.deviceIp });
    });

    const removeProgressListener = window.ipcRenderer.on('transfer-progress', (_event: any, data: any) => {
        lastProcessedRef.current = data.processedBytes;
        setTransferData(prev => ({ 
          ...prev, 
          ...data, 
          type: prev?.type || 'sending',
          status: 'transferring' 
        }));
    });

    const removeIncomingListener = window.ipcRenderer.on('upload-progress', (_event: any, data: any) => {
        lastProcessedRef.current = data.processedBytes;
        setTransferData(prev => ({
            type: 'receiving',
            status: 'transferring',
            progress: data.progress,
            fileProgress: data.progress, // For single file upload, fileProgress = progress
            speed: currentSpeed, // Using the smoothed speed calculated in the effect
            currentFile: data.currentFile || 'Receiving file...',
            currentIndex: data.currentIndex || 1,
            totalFiles: data.totalFiles || 1,
            processedBytes: data.processedBytes,
            totalBytes: data.totalBytes,
            remoteDevice: prev?.remoteDevice || (pendingRequest ? {
               name: pendingRequest.name,
               platform: pendingRequest.platform,
               brand: pendingRequest.brand,
               deviceId: pendingRequest.deviceId
            } : undefined)
        }));
    });

    const removeCompleteListener = window.ipcRenderer.on('transfer-complete', () => {
        setTransferData(prev => prev ? { ...prev, status: 'completed', progress: 1 } : null);
        clearSelection();
    });

    const removeCancelListener = window.ipcRenderer.on('pairing-cancelled', () => {
      setPendingRequest(null);
    });
    
    const removeErrorListener = window.ipcRenderer.on('transfer-error', (_event: any, data: any) => {
        setTransferData(prev => prev ? { ...prev, status: 'error' } : null);
    });

    const removeUploadErrorListener = window.ipcRenderer.on('upload-error', (_event: any, data: any) => {
        setTransferData(prev => prev ? { ...prev, status: 'error' } : null);
    });

    const removeUploadCompleteListener = window.ipcRenderer.on('upload-complete', () => {
        setCurrentSpeed(0);
        setTransferData(prev => prev ? { ...prev, status: 'completed', progress: 1 } : null);
    });

    return () => {
      if (removeReqListener) removeReqListener();
      if (removeResListener) removeResListener();
      if (removeStartListener) removeStartListener();
      if (removeProgressListener) removeProgressListener();
      if (removeIncomingListener) removeIncomingListener();
      if (removeCompleteListener) removeCompleteListener();
      if (removeCancelListener) removeCancelListener();
      if (removeErrorListener) removeErrorListener();
      if (removeUploadErrorListener) removeUploadErrorListener();
      if (removeUploadCompleteListener) removeUploadCompleteListener();
    };
  }, [waitingFor, selectedItems, clearSelection, pendingRequest, transferStartTime]);

  const respondToConnection = (accepted: boolean) => {
    if (pendingRequest) {
      if (accepted) {
        // Immediately switch to receiving state to avoid flickering
        setTransferData({
          type: 'receiving',
          status: 'transferring',
          progress: 0,
          speed: 0,
          currentFile: 'Waiting for files...',
          currentIndex: 0,
          totalFiles: 0,
          processedBytes: 0,
          totalBytes: 0,
          remoteDevice: {
            name: pendingRequest.name,
            platform: pendingRequest.platform,
            brand: pendingRequest.brand,
            deviceId: pendingRequest.deviceId
          }
        });
      }
      window.ipcRenderer.invoke('respond-to-connection', { deviceId: pendingRequest.deviceId, accepted });
      setPendingRequest(null);
    }
  };

  const minimizeWindow = () => {
    window.ipcRenderer.send('window-minimize');
  };

  const maximizeWindow = () => {
    window.ipcRenderer.send('window-maximize');
  };

  const closeWindow = () => {
    window.ipcRenderer.send('window-close');
  };

  const tabs = [
    { id: "receive", label: "Receive", icon: Download },
    { id: "send", label: "Send", icon: Send },
    { id: "settings", label: "Settings", icon: Settings },
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-background text-foreground select-none overflow-hidden">
      {/* Custom TitleBar */}
      <header className="titlebar h-16 flex items-center justify-between bg-background/50 backdrop-blur-md shrink-0">
        <Logo className="px-6" iconSize={24} />
        
        {/* Tabs */}
        <div className="no-drag flex items-center bg-muted/30 rounded-full p-1 border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-6 py-1.5 text-xs font-semibold rounded-full transition-all duration-300",
                activeTab === tab.id 
                  ? "bg-primary text-primary-foreground shadow-md" 
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        <div className="no-drag flex items-center px-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-muted rounded-full"
            onClick={minimizeWindow}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-muted rounded-full"
            onClick={maximizeWindow}
          >
            <Square className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 hover:bg-destructive/10 hover:text-destructive rounded-full transition-colors"
            onClick={closeWindow}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col bg-background relative">
        {activeTab === "receive" && <ReceivePage />}
        {activeTab === "send" && <SendPage />}
        {activeTab === "settings" && <SettingsPage />}

        {/* File Transfer UI matching screenshot */}
        <AnimatePresence>
          {transferData && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background flex flex-col p-8 z-[120]"
            >
              <div className="flex flex-col h-full space-y-8 max-w-5xl w-full mx-auto">
                <header className="flex flex-col gap-1 pt-4">
                   <h1 className="text-xl font-bold text-foreground tracking-tight">
                     {transferData.status === 'completed' ? 'Finished' : (transferData.type === 'sending' ? 'Sending files' : 'Receiving files')}
                   </h1>
                   {transferData.type === 'receiving' && (
                     <p className="text-sm text-[var(--accent-secondary)]">
                       Save to folder: <span onClick={() => window.ipcRenderer.invoke('open-folder')} className="text-[var(--accent-primary)] hover:underline cursor-pointer">{savePath}</span>
                     </p>
                   )}
                </header>

                <div className="flex-1 overflow-y-auto space-y-6 pr-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-track]:bg-transparent">
                   {transferData.type === 'sending' ? (
                     transferData.items?.map((item, idx) => {
                       const isCurrent = idx + 1 === transferData.currentIndex;
                       const isDone = (transferData.status === 'completed') || (idx + 1 < transferData.currentIndex);

                       // Use fileProgress if available for the current item, otherwise fallback to index comparison
                       let progress = 0;
                       if (isDone) {
                         progress = 100;
                       } else if (isCurrent) {
                         progress = (transferData.fileProgress !== undefined ? transferData.fileProgress : transferData.progress) * 100;
                       }

                       return (
                         <div key={item.id} className={cn("flex gap-4 items-start", !isCurrent && !isDone && transferData.status === 'transferring' && "opacity-40")}>
                            <div className="h-11 w-11 bg-muted/50 rounded-lg flex items-center justify-center border border-border shrink-0">
                               <Paperclip size={20} className="text-foreground/80" />
                            </div>
                            <div className="flex-1 space-y-3">
                               <div className="flex flex-col gap-1">
                                 <span className="text-sm text-foreground font-medium tracking-tight">
                                   {item.name} ({ formatFileSize(item.size || 0) })
                                 </span>
                                 {isDone && <span className="text-[11px] text-[var(--accent-primary)] font-semibold uppercase tracking-wider">Done</span>}
                               </div>
                               <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                  <div 
                                    className="h-full bg-[var(--accent-primary)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]" 
                                    style={{ width: `${progress}%` }} 
                                  />
                               </div>
                            </div>
                         </div>
                       );
                     })
                   ) : (
                      <div className="flex gap-4 items-start">
                        <div className="h-11 w-11 bg-muted/50 rounded-lg flex items-center justify-center border border-border shrink-0">
                           <Paperclip size={20} className="text-foreground/80" />
                        </div>
                        <div className="flex-1 space-y-3">
                           <div className="flex flex-col gap-1">
                             <span className="text-sm text-foreground font-medium tracking-tight">
                               {transferData.currentFile} ({formatFileSize(transferData.totalBytes || 0)})
                             </span>
                             {transferData.status === 'completed' && <span className="text-[11px] text-[var(--accent-primary)] font-semibold uppercase tracking-wider">Done</span>}
                           </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               <div 
                                 className="h-full bg-[var(--accent-primary)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]" 
                                 style={{ width: `${transferData.progress * 100}%` }} 
                               />
                            </div>
                        </div>
                      </div>
                   )}
                </div>

                <footer className="space-y-6 pb-4">
                   <div className="flex flex-col gap-4">
                     <div className="space-y-3">
                       <div className="flex justify-between items-end">
                         <span className="text-lg font-bold text-foreground tracking-tight">
                           {transferData.status === 'completed' ? 'Finished' : `Total progress (${formatDuration(transferDuration)})`}
                         </span>
                       </div>
                       <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-[var(--accent-primary)] transition-all duration-300 shadow-[0_0_8px_var(--accent-glow)]" 
                            style={{ width: `${transferData.progress * 100}%` }} 
                          />
                       </div>
                       
                       <AnimatePresence>
                         {showAdvanced && (
                           <motion.div 
                             initial={{ opacity: 0, height: 0 }}
                             animate={{ opacity: 1, height: 'auto' }}
                             exit={{ opacity: 0, height: 0 }}
                             className="overflow-hidden"
                           >
                             <div className="flex justify-between items-center text-[10px] font-medium text-muted-foreground/60 uppercase tracking-widest pt-2">
                                <div className="flex flex-col gap-1">
                                   <span>Files: {transferData.currentIndex} / {transferData.totalFiles}</span>
                                   <span>Size: {formatFileSize(transferData.processedBytes)} / {formatFileSize(transferData.totalBytes)}</span>
                                </div>
                                <div className="bg-[var(--accent-primary)]/10 px-3 py-1 rounded-full border border-[var(--accent-primary)]/20">
                                   <span className="text-[var(--accent-primary)] font-bold">Speed: {formatFileSize(currentSpeed)}/s</span>
                                </div>
                             </div>
                           </motion.div>
                         )}
                       </AnimatePresence>
                     </div>
                   </div>
 
                   <div className="flex justify-end items-center gap-4">
                      {!showAdvanced ? (
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowAdvanced(true)}
                          className="text-foreground/70 hover:text-foreground hover:bg-muted/50 flex gap-2 h-10 px-6 rounded-full text-sm font-bold"
                        >
                           <div className="h-5 w-5 rounded-full border border-foreground/20 flex items-center justify-center">
                             <span className="text-[10px] font-bold">i</span>
                           </div> 
                           Advanced
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          onClick={() => setShowAdvanced(false)}
                          className="text-foreground/70 hover:text-foreground hover:bg-muted/50 flex gap-2 h-10 px-6 rounded-full text-sm font-bold"
                        >
                           <X size={18} className="text-[var(--accent-secondary)] opacity-80" />
                           Hide
                        </Button>
                      )}
                      
                      <Button 
                        variant="ghost" 
                        onClick={() => {
                           if (transferData.status === 'completed') {
                             setTransferData(null);
                             setShowAdvanced(false);
                           } else {
                             setIsCancelConfirmOpen(true);
                           }
                        }}
                        className="text-foreground/70 hover:text-foreground hover:bg-muted/50 flex gap-2 h-10 px-6 rounded-full text-sm font-bold"
                      >
                         {transferData.status === 'completed' ? <UserCheck size={20} className="text-[var(--accent-primary)]" /> : <X size={20} className="text-foreground/40" />} 
                         {transferData.status === 'completed' ? 'Done' : 'Cancel'}
                      </Button>
                   </div>
                </footer>
              </div>

              {isCancelConfirmOpen && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="absolute inset-0 bg-background/80 backdrop-blur-md z-[130] flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.95, y: 10 }}
                    animate={{ scale: 1, y: 0 }}
                    className="max-w-xs w-full bg-card border border-border rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.2)] flex flex-col items-center text-center space-y-6"
                  >
                    <div className="h-16 w-16 bg-destructive/10 rounded-full flex items-center justify-center border border-destructive/20">
                       <X size={32} className="text-destructive" />
                    </div>
                    <div className="space-y-2">
                       <h3 className="text-xl font-bold text-foreground tracking-tight">Cancel transfer?</h3>
                       <p className="text-xs text-muted-foreground leading-relaxed font-medium">
                         Are you sure you want to stop the file transfer? Progress will be lost.
                       </p>
                    </div>
                    
                    <div className="flex flex-col w-full gap-3 pt-2">
                       <Button 
                        onClick={() => {
                          window.ipcRenderer.invoke('cancel-transfer', { deviceId: 'any' });
                          setTransferData(null);
                          setIsCancelConfirmOpen(false);
                        }}
                        variant="destructive"
                        className="font-bold h-11 rounded-xl shadow-lg shadow-destructive/20"
                       >
                         Yes, Cancel
                       </Button>
                       <Button 
                        variant="ghost" 
                        onClick={() => setIsCancelConfirmOpen(false)} 
                        className="text-muted-foreground hover:text-foreground hover:bg-muted font-bold h-11"
                       >
                         No, Continue
                       </Button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {waitingFor && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background flex flex-col items-center justify-center p-0 z-[110]"
            >
              <div className="flex flex-col items-center max-w-sm w-full px-8 space-y-8">
                <div className="w-full p-5 bg-card border border-border rounded-2xl flex items-center gap-4">
                  <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                    <Laptop size={24} className="text-foreground/80" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground font-bold tracking-tight">{localInfo?.name || 'This PC'}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-muted text-muted-foreground border-none">#{localInfo?.id.slice(-3)}</Badge>
                      <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-muted text-muted-foreground border-none uppercase">{localInfo?.os}</Badge>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                   <ArrowDown className="text-zinc-700" size={24} />
                </div>

                <div className="w-full p-5 bg-card border border-border rounded-2xl flex items-center gap-4 shadow-xl shadow-foreground/[0.02]">
                  <div className="h-12 w-12 bg-muted rounded-xl flex items-center justify-center border border-border">
                    {waitingFor.platform === 'mobile' ? <Smartphone size={24} className="text-foreground/80" /> : <Laptop size={24} className="text-foreground/80" />}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-foreground font-bold tracking-tight">{waitingFor.name}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-muted text-muted-foreground border-none">#{waitingFor.deviceId?.slice(-3)}</Badge>
                      <Badge variant="secondary" className="text-[10px] py-0 h-5 bg-muted text-muted-foreground border-none uppercase">{waitingFor.os || waitingFor.brand || 'Mobile'}</Badge>
                      {waitingFor.status === 'declined' && (
                         <Badge variant="destructive" className="text-[10px] py-0 h-5 uppercase transition-all animate-in fade-in zoom-in">Declined</Badge>
                      )}
                    </div>
                  </div>
                </div>

                 <div className="pt-20 flex flex-col items-center gap-8">
                    <span className={cn(
                        "font-bold text-[11px] uppercase tracking-[0.2em]",
                        waitingFor.status === 'declined' ? "text-destructive" : "text-muted-foreground animate-pulse"
                    )}>
                        {waitingFor.status === 'declined' ? "Connection Declined" : "Waiting for response"}
                    </span>
                    <Button 
                     variant="ghost"
                     onClick={() => {
                        if (waitingFor.status !== 'declined') {
                            window.ipcRenderer.invoke('respond-to-connection', { deviceId: waitingFor.deviceId, accepted: false });
                        }
                         setWaitingFor(null);
                     }}
                     className={cn(
                        "h-12 px-10 rounded-full font-bold flex gap-2 transition-all border border-zinc-800",
                        waitingFor.status === 'declined' 
                            ? "bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20" 
                            : "bg-white/5 hover:bg-white/10 text-white"
                     )}
                    >
                      {waitingFor.status === 'declined' ? <><X size={18} /> Close</> : <><X size={18} /> Cancel Request</>}
                    </Button>
                 </div>
               </div>
             </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {pendingRequest && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-background flex flex-col items-center justify-center p-0 z-[100]"
            >
              <div className="flex flex-col items-center max-w-2xl w-full px-8 text-center space-y-12">
                <div className="relative">
                   <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full" />
                   {pendingRequest.platform === 'mobile' ? (
                     <Smartphone size={100} strokeWidth={1.5} className="text-foreground relative z-10" />
                   ) : (
                     <Laptop size={100} strokeWidth={1.5} className="text-foreground relative z-10" />
                   )}
                </div>

                <div className="space-y-4">
                  <h2 className="text-6xl font-black tracking-tighter text-foreground m-0">
                    {pendingRequest.name}
                  </h2>
                  
                  <div className="flex gap-2 justify-center">
                    <Badge variant="secondary" className="px-4 py-1 bg-muted text-muted-foreground font-mono uppercase text-[10px] tracking-widest rounded-lg border border-border">
                      #{pendingRequest.deviceId?.slice(-3)}
                    </Badge>
                    {pendingRequest.brand && (
                      <Badge variant="secondary" className="px-4 py-1 bg-muted text-muted-foreground font-mono uppercase text-[10px] tracking-widest rounded-lg border border-border">
                        {pendingRequest.brand}
                      </Badge>
                    )}
                  </div>
                </div>

                <p className="text-2xl text-muted-foreground font-medium tracking-tight">
                  Wants to share files with you
                </p>

                <div className="flex gap-6 w-full max-sm pt-8">
                  <Button 
                    variant="ghost"
                    onClick={() => respondToConnection(false)}
                    className="flex-1 h-14 rounded-2xl hover:bg-destructive/10 text-destructive font-bold text-lg border border-border transition-all flex gap-2"
                  >
                    <X size={20} /> Decline
                  </Button>
                  <Button 
                    onClick={() => respondToConnection(true)}
                    className="flex-1 h-14 rounded-2xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-lg shadow-xl shadow-primary/30 flex gap-2 transition-all active:scale-95"
                  >
                    <UserCheck size={20} /> Accept
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}

export default App;
