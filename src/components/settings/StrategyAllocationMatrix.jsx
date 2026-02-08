import React, { useState, useEffect } from 'react';
import { useAllocationData } from '../../hooks/useAllocationData';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, Loader2, Save, AlertCircle, Target } from 'lucide-react';
import { toast } from "sonner";

export default function StrategyAllocationMatrix({ pillars }) {
    const { sets, targets, loading, saveTargets, setActiveSet } = useAllocationData();
    const [localTargets, setLocalTargets] = useState({});
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Initialize local state when DB data loads
    useEffect(() => {
        if (targets && Object.keys(targets).length > 0) {
            setLocalTargets(targets);
        }
    }, [targets]);

    if (loading) return <div className="text-sm text-muted-foreground p-4">Loading Matrix...</div>;

    // Filter out Pillar 1 (Anchor) for the Rows
    const activePillars = pillars.filter(p => !p.name.startsWith('!'));

    // Calculate Totals per Set (Column)
    const getColumnTotal = (setId) => {
        let total = 0;
        activePillars.forEach(p => {
            const tid = `${setId}_${p.id}`;
            // Use local state, fallback to 0
            const val = localTargets[tid]?.target_percentage || 0;
            total += val;
        });
        return total;
    };

    // Validation Check: All columns must equal 100
    const isValid = sets.every(set => getColumnTotal(set.id) === 100);

    const handleInputChange = (setId, pillarId, value) => {
        let cleanVal = parseInt(value, 10);
        if (isNaN(cleanVal)) cleanVal = 0;
        if (cleanVal < 0) cleanVal = 0;
        if (cleanVal > 150) cleanVal = 150; // Max changed to 150 as per instruction

        const compositeId = `${setId}_${pillarId}`;

        setLocalTargets(prev => ({
            ...prev,
            [compositeId]: {
                ...prev[compositeId],
                target_percentage: cleanVal,
                allocation_set_id: setId, // Ensure these exist for new entries
                pillar_id: pillarId
            }
        }));
        setHasChanges(true);
        setSaveSuccess(false);
    };

    const handleCancel = () => {
        if (targets && Object.keys(targets).length > 0) {
            setLocalTargets(targets);
            setHasChanges(false);
            setSaveSuccess(false);
            toast.info("Changes Discarded", { description: "Matrix reset to last saved state." });
        }
    };

    const handleSave = async () => {
        if (!isValid) return;
        setIsSaving(true);
        try {
            await saveTargets(localTargets);
            setSaveSuccess(true);
            setHasChanges(false);

            setTimeout(() => setSaveSuccess(false), 3000);
        } catch (error) {
            toast.error("Failed to save strategy", { description: error.message });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-4">
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        <Target className="w-5 h-5 text-primary" />
                        Strategy Allocation Matrix
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                        Define percentage targets for each strategic mode. Each column must total exactly 100%.
                    </p>
                </div>

                {/* Actions Row */}
                <div className="flex items-center justify-end gap-3">
                    {/* Cancel Button */}
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={!hasChanges || isSaving}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        Cancel
                    </Button>

                    {/* Manual Save Button */}
                    <Button
                        onClick={handleSave}
                        disabled={!isValid || isSaving || (!hasChanges && !saveSuccess)}
                        className={`min-w-[200px] transition-all duration-300 ${saveSuccess
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : isValid && hasChanges
                                ? "bg-primary hover:bg-primary/90 shadow-md animate-pulse"
                                : "bg-muted text-muted-foreground opacity-50 cursor-not-allowed"
                            } `}
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Saving Strategy...
                            </>
                        ) : saveSuccess ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Strategy Secured
                            </>
                        ) : !isValid ? (
                            <>
                                <AlertCircle className="w-4 h-4 mr-2" />
                                Fix Totals (Must be 100%)
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4 mr-2" />
                                Save Strategy Configuration
                            </>
                        )}
                    </Button>
                </div>
            </div>

            <div className="overflow-x-auto rounded-md border border-border shadow-sm">
                <table className="w-full text-sm text-left">
                    <thead className="text-xs text-muted-foreground uppercase bg-muted/30">
                        <tr>
                            <th className="px-6 py-6 font-black tracking-widest border-b border-border w-1/3">Pillar</th>
                            {sets.map(set => (
                                <th key={set.id} className="px-4 py-6 border-b border-border min-w-[140px]">
                                    <div className="flex flex-col items-center gap-2">
                                        <span className={`text-[11px] font-black uppercase tracking-tight transition-colors ${set.is_active ? "text-white" : "text-muted-foreground"
                                            }`}>
                                            {set.name}
                                        </span>
                                        <button
                                            onClick={() => setActiveSet(set.id)}
                                            className="group flex items-center justify-center cursor-pointer outline-none"
                                        >
                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${set.is_active
                                                ? "border-primary bg-primary/20"
                                                : "border-muted-foreground/30 hover:border-muted-foreground/50"
                                                }`}>
                                                {set.is_active && <div className="w-2.5 h-2.5 rounded-full bg-primary" />}
                                            </div>
                                        </button>

                                        {set.is_active && (
                                            <Badge variant="secondary" className="bg-primary text-white text-[9px] font-black h-5 px-2 uppercase shadow-lg shadow-primary/20 border-none">
                                                Active
                                            </Badge>
                                        )}
                                        {!set.is_active && <div className="h-5" />} {/* Spacer */}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border bg-card">
                        {activePillars.map((pillar) => (
                            <tr key={pillar.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-6 py-4 font-medium">
                                    <div className="flex items-center gap-3">
                                        <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: pillar.color }} />
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-white tracking-tight">{pillar.name}</span>
                                            {pillar.description && (
                                                <span className="text-[10px] text-muted-foreground leading-tight mt-0.5 line-clamp-2 hidden md:block">
                                                    {pillar.description}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </td>
                                {sets.map(set => {
                                    const targetId = `${set.id}_${pillar.id}`;
                                    // Read from local state
                                    const value = localTargets[targetId]?.target_percentage ?? 0;

                                    return (
                                        <td key={set.id} className="px-4 py-2 text-center">
                                            <input
                                                type="number"
                                                min="0"
                                                max="150"
                                                value={value}
                                                onChange={(e) => handleInputChange(set.id, pillar.id, e.target.value)}
                                                className="w-16 text-center bg-input border border-input rounded-md py-1 px-2 focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all font-medium"
                                            />
                                            <span className="ml-1 text-muted-foreground text-xs">%</span>
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}

                        {/* Totals Row */}
                        <tr className="bg-muted/5 font-bold border-t border-border">
                            <td className="px-6 py-6 text-left font-black uppercase text-[11px] tracking-widest text-muted-foreground">Total Allocation</td>
                            {sets.map(set => {
                                const total = getColumnTotal(set.id);
                                const isTotalValid = total === 100;
                                return (
                                    <td key={set.id} className="px-4 py-6 text-center">
                                        <div className={`text-xl font-black ${isTotalValid ? "text-emerald-400" : "text-red-500 animate-pulse"
                                            }`}>
                                            {total}%
                                        </div>
                                    </td>
                                );
                            })}
                        </tr>
                    </tbody>
                </table>
            </div>

            <div className="text-xs text-muted-foreground text-right italic">
                * All allocation columns must sum to exactly 100% to enable saving.
            </div>
        </div>
    );
}
