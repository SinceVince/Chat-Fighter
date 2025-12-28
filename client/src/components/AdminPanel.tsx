import { useState } from "react";
import { useCreateFighter, useDeleteFighter, useFighters } from "@/hooks/use-fighters";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RetroButton } from "./RetroButton";
import { Trash2, Plus, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AdminPanel() {
  const { data: fighters } = useFighters();
  const createFighter = useCreateFighter();
  const deleteFighter = useDeleteFighter();
  const { toast } = useToast();

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !imageUrl) return;

    try {
      await createFighter.mutateAsync({ name, imageUrl, description });
      setName("");
      setImageUrl("");
      setDescription("");
      toast({ title: "Fighter Created", description: `${name} has entered the arena!` });
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Could not create fighter" });
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm("Are you sure you want to remove this fighter?")) {
      await deleteFighter.mutateAsync(id);
      toast({ title: "Fighter Removed", description: "Fighter has been retired." });
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <RetroButton variant="ghost" size="sm" className="absolute top-4 right-4 z-50 opacity-50 hover:opacity-100">
          <Settings className="w-4 h-4 mr-2" /> Config
        </RetroButton>
      </DialogTrigger>
      <DialogContent className="max-w-2xl bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Roster Management</DialogTitle>
        </DialogHeader>

        <div className="grid gap-8 py-4">
          {/* Create Form */}
          <form onSubmit={handleSubmit} className="space-y-4 p-4 border border-border rounded-lg bg-background/50">
            <h3 className="font-arcade text-sm text-secondary mb-4">Add New Challenger</h3>
            <div className="grid gap-2">
              <Label>Fighter Name</Label>
              <Input 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                placeholder="e.g. Cyber Ninja"
                className="font-body"
              />
            </div>
            <div className="grid gap-2">
              <Label>Image URL</Label>
              <Input 
                value={imageUrl} 
                onChange={(e) => setImageUrl(e.target.value)} 
                placeholder="https://..."
                className="font-body"
              />
            </div>
            <div className="grid gap-2">
              <Label>Description/Stats</Label>
              <Input 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="High speed, low defense"
                className="font-body"
              />
            </div>
            <RetroButton type="submit" disabled={createFighter.isPending} className="w-full mt-2">
              {createFighter.isPending ? "Summoning..." : "Add Fighter"}
            </RetroButton>
          </form>

          {/* List */}
          <div className="space-y-2">
            <h3 className="font-arcade text-sm text-muted-foreground mb-4">Active Roster ({fighters?.length || 0})</h3>
            <div className="grid grid-cols-1 gap-2">
              {fighters?.map((fighter) => (
                <div key={fighter.id} className="flex items-center justify-between p-3 border border-border rounded bg-background/30 hover:bg-background/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <img src={fighter.imageUrl} alt={fighter.name} className="w-10 h-10 rounded object-cover border border-white/20" />
                    <div>
                      <div className="font-bold font-display">{fighter.name}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[200px]">{fighter.description}</div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(fighter.id)}
                    disabled={deleteFighter.isPending}
                    className="p-2 text-destructive hover:bg-destructive/10 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
