import { FamilyMemberResponse } from "@shared/routes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState, useEffect } from "react";
import { UserPlus, Edit2, Trash2, Phone, Heart } from "lucide-react";
import { useCreateFamilyMember, useUpdateFamilyMember, useDeleteFamilyMember, useFamilyMembers } from "@/hooks/use-family";
import { useToast } from "@/hooks/use-toast";

interface MemberDialogProps {
  member: FamilyMemberResponse | null;
  isOpen: boolean;
  onClose: () => void;
  allMembers: FamilyMemberResponse[];
}

export function MemberDialog({ member, isOpen, onClose, allMembers }: MemberDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateFamilyMember();
  const updateMutation = useUpdateFamilyMember();
  const deleteMutation = useDeleteFamilyMember();

  const [mode, setMode] = useState<"view" | "edit" | "add_child" | "add_parent">("view");
  const [formData, setFormData] = useState({
    name: "",
    motherName: "",
    phoneNumber: "",
    isDeceased: false,
    position: 0,
  });

  // Reset state when dialog opens or member changes
  useEffect(() => {
    if (isOpen) {
      setMode("view");
      if (member) {
        setFormData({
          name: member.name,
          motherName: member.motherName || "",
          phoneNumber: member.phoneNumber || "",
          isDeceased: member.isDeceased,
          position: member.position ?? 0,
        });
      }
    }
  }, [isOpen, member]);

  // Handle transitions to Add Child/Parent mode
  useEffect(() => {
    if (mode === "add_child" || mode === "add_parent") {
      setFormData({
        name: "",
        motherName: "",
        phoneNumber: "",
        isDeceased: false,
        position: 0,
      });
    }
  }, [mode]);

  const parent = member?.parentId 
    ? allMembers.find(m => m.id === member.parentId)
    : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === "edit" && member) {
        await updateMutation.mutateAsync({
          id: member.id,
          name: formData.name,
          motherName: formData.motherName || null,
          phoneNumber: formData.phoneNumber || null,
          isDeceased: formData.isDeceased,
          position: formData.position,
        });
        toast({ title: "Updated successfully", description: `${formData.name} has been updated.` });
      } else if (mode === "add_child" && member) {
        await createMutation.mutateAsync({
          name: formData.name,
          parentId: member.id,
          motherName: formData.motherName || null,
          phoneNumber: formData.phoneNumber || null,
          isDeceased: formData.isDeceased,
          position: formData.position,
        });
        toast({ title: "Child added", description: `Added ${formData.name} to the family.` });
      } else if (mode === "add_parent" && member) {
        const parent = await createMutation.mutateAsync({
          name: formData.name,
          parentId: null,
          motherName: formData.motherName || null,
          phoneNumber: formData.phoneNumber || null,
          isDeceased: formData.isDeceased,
          position: formData.position,
        });
        await updateMutation.mutateAsync({
          id: member.id,
          parentId: parent.id,
        });
        toast({ title: "Parent added", description: `Added ${formData.name} as ${member.name}'s parent.` });
      }
      onClose();
    } catch (error) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error instanceof Error ? error.message : "Something went wrong" 
      });
    }
  };

  const handleDelete = async () => {
    if (!member || !confirm(`Are you sure you want to remove ${member.name} from the tree? This cannot be undone.`)) return;
    try {
      await deleteMutation.mutateAsync(member.id);
      toast({ title: "Member removed", description: `${member.name} has been removed.` });
      onClose();
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to delete member." });
    }
  };

  if (!member) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md rounded-2xl overflow-hidden border-none shadow-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader className="bg-gradient-to-r from-primary/10 to-transparent p-6 -mx-6 -mt-6 mb-4 border-b border-primary/10">
          <DialogTitle className="font-display text-2xl text-primary flex items-center gap-2">
            {mode === "add_child" ? "Add New Family Member" : mode === "add_parent" ? "Add Parent" : member.name}
            {member.isDeceased && mode === "view" && <span className="text-xs font-sans font-normal bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">Deceased</span>}
          </DialogTitle>
          {mode === "view" && parent && (
            <p className="text-sm text-muted-foreground mt-1">
              Child of <span className="font-semibold text-foreground">{parent.name}</span>
            </p>
          )}
          {mode === "add_child" && (
            <p className="text-sm text-muted-foreground mt-1">
              Adding child to <span className="font-semibold text-foreground">{member.name}</span>
            </p>
          )}
          {mode === "add_parent" && (
            <p className="text-sm text-muted-foreground mt-1">
              Adding parent to <span className="font-semibold text-foreground">{member.name}</span>
            </p>
          )}
        </DialogHeader>

        {mode === "view" ? (
          <div className="space-y-6">
            <div className="space-y-4">
              {member.motherName && (
                <div className="flex items-center gap-3 text-muted-foreground bg-muted/50 p-4 rounded-xl">
                  <Heart className="w-5 h-5 text-rose-500" />
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground uppercase font-semibold">Mother/Father</span>
                    <span className="font-medium text-foreground">{member.motherName}</span>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-3 text-muted-foreground bg-muted/50 p-4 rounded-xl">
                <Phone className="w-5 h-5 text-primary" />
                <span className="font-medium text-foreground">{member.phoneNumber || "No phone number listed"}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button 
                variant="outline" 
                className="h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
                onClick={() => setMode("edit")}
              >
                <Edit2 className="w-5 h-5" />
                <span>Edit Details</span>
              </Button>
              <Button 
                className="h-auto py-4 flex flex-col gap-2 bg-gradient-to-br from-primary to-orange-600 hover:opacity-90 transition-all shadow-lg shadow-primary/20"
                onClick={() => setMode("add_child")}
              >
                <UserPlus className="w-5 h-5" />
                <span>Add Child</span>
              </Button>
              {!member.parentId && (
                <Button 
                  variant="outline"
                  className="col-span-2 h-auto py-4 flex flex-col gap-2 hover:bg-primary/5 hover:border-primary/20 hover:text-primary transition-all"
                  onClick={() => setMode("add_parent")}
                >
                  <UserPlus className="w-5 h-5" />
                  <span>Add Parent</span>
                </Button>
              )}
            </div>
            
            <div className="border-t border-border pt-4">
              <Button 
                variant="ghost" 
                className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={handleDelete}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remove from Tree
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Jane Doe"
                className="rounded-xl border-border bg-background focus:ring-primary/20"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mother">Mother/Father Name (Optional)</Label>
              <Input
                id="mother"
                value={formData.motherName}
                onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
                placeholder="e.g. Sarah or John Smith"
                className="rounded-xl border-border bg-background focus:ring-primary/20"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (Optional)</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                placeholder="e.g. +1 (555) 000-0000"
                className="rounded-xl border-border bg-background focus:ring-primary/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Sibling Order (Position)</Label>
              <Input
                id="position"
                type="number"
                min={0}
                value={formData.position}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    position: Number.isNaN(Number(e.target.value)) ? 0 : Number(e.target.value),
                  })
                }
                className="rounded-xl border-border bg-background focus:ring-primary/20"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
              <div className="space-y-0.5">
                <Label className="text-base">Deceased</Label>
                <p className="text-xs text-muted-foreground">Mark if this person has passed away</p>
              </div>
              <Switch
                checked={formData.isDeceased}
                onCheckedChange={(checked) => setFormData({ ...formData, isDeceased: checked })}
              />
            </div>

            <DialogFooter className="gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => setMode("view")}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending} className="bg-primary hover:bg-primary/90">
                {createMutation.isPending || updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
