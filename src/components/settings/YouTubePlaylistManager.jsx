import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Trash2, Plus, Youtube, Save, X, ExternalLink, Link as LinkIcon } from 'lucide-react';
import { toast } from "sonner";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function YouTubePlaylistManager({ playlists = [], onSave }) {
    const [localPlaylists, setLocalPlaylists] = useState(playlists);
    const [isEditing, setIsEditing] = useState(false);
    const [editItem, setEditItem] = useState(null); // If null, means creating new

    // Form State
    const [formName, setFormName] = useState('');
    const [formId, setFormId] = useState('');
    const [formDesc, setFormDesc] = useState('');
    const [formActive, setFormActive] = useState(true);

    const [deleteId, setDeleteId] = useState(null);

    // Sync with props whenever parent updates (or on mount)
    React.useEffect(() => {
        setLocalPlaylists(playlists || []);
    }, [playlists]);

    const handleStartAdd = () => {
        setEditItem(null);
        setFormName('');
        setFormId('');
        setFormDesc('');
        setFormActive(true);
        setIsEditing(true);
    };

    const handleStartEdit = (playlist) => {
        setEditItem(playlist.id);
        setFormName(playlist.name);
        setFormId(playlist.yt_playlist_id);
        setFormDesc(playlist.yt_description || '');
        setFormActive(playlist.is_active !== false); // default to true
        setIsEditing(true);
    };

    const handleSmartPaste = (e) => {
        const val = e.target.value;
        setFormId(val);

        // Regex Logic: Extract 'list=...'
        if (val && val.includes('list=')) {
            const match = val.match(/list=([^&]*)/);
            if (match && match[1]) {
                const extracted = match[1];
                setFormId(extracted);
                toast.info("Smart ID Extracted", {
                    description: `Found Playlist ID: ${extracted}`
                });
            }
        }
    };

    const handleSaveForm = () => {
        if (!formName.trim() || !formId.trim()) {
            toast.error("Missing Required Fields", { description: "Name and Playlist ID are required." });
            return;
        }

        // Duplicate Check (ID)
        const isDuplicate = localPlaylists.some(p =>
            p.yt_playlist_id === formId.trim() && p.id !== editItem
        );

        if (isDuplicate) {
            toast.error("Duplicate Playlist ID", { description: "This YouTube Playlist ID is already configured." });
            return;
        }

        let newList;

        if (editItem) {
            // Update Existing
            newList = localPlaylists.map(p =>
                p.id === editItem
                    ? { ...p, name: formName, yt_playlist_id: formId, yt_description: formDesc, is_active: formActive }
                    : p
            );
            toast.success("Playlist Updated");
        } else {
            // Create New
            const newPlaylist = {
                id: `playlist-${Date.now()}`,
                name: formName,
                yt_playlist_id: formId,
                yt_description: formDesc,
                is_active: formActive
            };
            newList = [...localPlaylists, newPlaylist];
            toast.success("Playlist Added");
        }

        setLocalPlaylists(newList);
        onSave(newList); // Propagate up immediately or defer? Spec implies "Saves playlist"
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (!deleteId) return;
        const newList = localPlaylists.filter(p => p.id !== deleteId);
        setLocalPlaylists(newList);
        onSave(newList);
        setDeleteId(null);
        toast.success("Playlist Removed");
    };

    const handleToggleActive = (id, currentStatus) => {
        const newList = localPlaylists.map(p =>
            p.id === id ? { ...p, is_active: !currentStatus } : p
        );
        setLocalPlaylists(newList);
        onSave(newList);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                        <Youtube className="w-5 h-5 text-red-600" />
                        YouTube Playlists
                    </h3>
                    <p className="text-sm text-muted-foreground">Manage your channel's playlists for quick post assignment.</p>
                </div>
                {!isEditing && (
                    <Button onClick={handleStartAdd} size="sm" className="gap-2">
                        <Plus className="w-4 h-4" /> Add Playlist
                    </Button>
                )}
            </div>

            {isEditing ? (
                <div className="p-4 border rounded-lg bg-card shadow-sm animate-in slide-in-from-top-2">
                    <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-sm">{editItem ? 'Edit Playlist' : 'New Playlist'}</h4>
                        <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                            <X className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="grid gap-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Playlist Name <span className="text-red-500">*</span></Label>
                                <Input
                                    placeholder="e.g. Creator Strategy"
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>YouTube Playlist ID (or URL) <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Input
                                        placeholder="Paste URL or ID..."
                                        value={formId}
                                        onChange={handleSmartPaste}
                                        className="pl-9"
                                    />
                                    <LinkIcon className="w-4 h-4 text-muted-foreground absolute left-3 top-2.5" />
                                </div>
                                {formId && !formId.startsWith('PL') && (
                                    <p className="text-[10px] text-amber-500 mt-1">Warning: IDs usually start with 'PL'</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Description <span className="text-muted-foreground font-normal">(Internal Note)</span></Label>
                            <Textarea
                                placeholder="What is this playlist for?"
                                className="h-20"
                                value={formDesc}
                                onChange={e => setFormDesc(e.target.value)}
                            />
                        </div>

                        <div className="flex items-center justify-between pt-2">
                            <div className="flex items-center gap-2">
                                <Switch
                                    checked={formActive}
                                    onCheckedChange={setFormActive}
                                />
                                <Label>Active (Available for Posts)</Label>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setIsEditing(false)}>Cancel</Button>
                                <Button onClick={handleSaveForm} className="gap-2">
                                    <Save className="w-4 h-4" /> Save Playlist
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="grid gap-3">
                    {localPlaylists.length === 0 ? (
                        <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground bg-muted/20">
                            <Youtube className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">No playlists configured yet.</p>
                            <Button variant="link" onClick={handleStartAdd} className="text-xs">Create your first one</Button>
                        </div>
                    ) : (
                        localPlaylists.map(playlist => (
                            <div key={playlist.id} className="flex items-start justify-between p-3 border rounded-lg bg-card hover:border-primary/20 transition-colors group">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium text-sm">{playlist.name}</h4>
                                        {!playlist.is_active && <Badge variant="secondary" className="text-[10px] h-5">Inactive</Badge>}
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono">
                                        <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] select-all">{playlist.yt_playlist_id}</span>
                                        {playlist.yt_playlist_id && (
                                            <a
                                                href={`https://www.youtube.com/playlist?list=${playlist.yt_playlist_id}`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="hover:text-red-500 transition-colors"
                                                title="Verify on YouTube"
                                            >
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        )}
                                    </div>
                                    {playlist.yt_description && (
                                        <p className="text-xs text-muted-foreground mt-1 max-w-lg truncate">{playlist.yt_description}</p>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Switch
                                        checked={playlist.is_active !== false}
                                        onCheckedChange={() => handleToggleActive(playlist.id, playlist.is_active !== false)}
                                        className="scale-75 mr-2"
                                        title="Toggle Active Status"
                                    />
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => handleStartEdit(playlist)}>
                                        <span className="sr-only">Edit</span>
                                        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11.8536 1.14645C11.6583 0.951184 11.3417 0.951184 11.1465 1.14645L3.71455 8.57836C3.62459 8.66832 3.55263 8.77461 3.50251 8.89291L2.10251 12.1929C2.03068 12.3621 2.07895 12.5592 2.22657 12.7068C2.37419 12.8544 2.57125 12.9027 2.74051 12.8309L6.04051 11.4309C6.15881 11.3808 6.2651 11.3088 6.35505 11.2189L13.787 3.78696C13.9822 3.5917 13.9822 3.27512 13.787 3.07985L11.8536 1.14645ZM11.5 2.20711L12.7929 3.5L11.5 4.79289L10.2071 3.5L11.5 2.20711ZM10.7929 5.5L9.5 4.20711L4.04294 9.66417C4.03233 9.67478 4.02353 9.68669 4.01666 9.69963L3.19796 11.6294L5.12773 10.8107C5.14068 10.8038 5.15259 10.795 5.16319 10.7844L10.7929 5.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path></svg>
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(playlist.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Playlist?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will remove the playlist from your configuration. Existing posts may still reference this ID but will lose their label association.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
