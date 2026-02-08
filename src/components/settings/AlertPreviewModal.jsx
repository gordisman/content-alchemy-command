import React from 'react';
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { X, Mail, Copy } from 'lucide-react';

export default function AlertPreviewModal({
    isOpen,
    onClose,
    htmlContent,
    stats,
    onSendReal,
    isSending
}) {
    if (!isOpen) return null;

    const handleCopy = () => {
        // Create a temporary text area to copy the HTML
        const el = document.createElement('textarea');
        el.value = htmlContent;
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        toast.success("HTML copied to clipboard!");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-background w-full max-w-4xl h-[85vh] rounded-lg shadow-xl border border-border flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-muted/30">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-purple-100 rounded-full text-purple-600">
                            <Mail className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-lg">Daily Alert Preview</h3>
                            <div className="text-xs text-muted-foreground flex gap-3">
                                <span>Posts Found: <strong>{stats?.count || 0}</strong></span>
                                <span>•</span>
                                <span>Simulated Time: <strong>{stats?.time || 'Now'}</strong></span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={handleCopy}>
                            <Copy className="w-4 h-4 mr-2" />
                            Copy HTML
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose}>
                            <X className="w-5 h-5" />
                        </Button>
                    </div>
                </div>

                {/* Content Preview */}
                <div className="flex-1 overflow-auto p-0 bg-slate-50 relative">
                    {/* We use an iframe or shadow DOM to isolate the email styles, 
               but for simplicity regular div with dangerous HTML works 
               if we are careful about global styles leaking. 
               Email HTML is usually inline-styled anyway. */}
                    <div
                        className="w-full h-full min-h-[500px] p-8 bg-white shadow-sm mx-auto max-w-[800px] my-8"
                        dangerouslySetInnerHTML={{ __html: htmlContent }}
                    />
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-muted/10 flex items-center justify-between">
                    <div className="text-xs text-muted-foreground">
                        Simulation Preview (Frontend).
                    </div>
                    {onSendReal && (
                        <Button
                            onClick={onSendReal}
                            disabled={isSending}
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                        >
                            {isSending ? (
                                <>Sending... (may take a moment)</>
                            ) : (
                                <><Mail className="w-4 h-4 mr-2" /> Send Real Email</>
                            )}
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}
