import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useCreateFamilyMember } from "@/hooks/use-family";
import { useToast } from "@/hooks/use-toast";

export function CreateRootDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const createMutation = useCreateFamilyMember();
  const [formData, setFormData] = useState({
    name: "",
    motherName: "",
    phoneNumber: "",
    isDeceased: false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMutation.mutateAsync({
        name: formData.name,
        parentId: null, // Root node
        motherName: formData.motherName || null,
        phoneNumber: formData.phoneNumber || null,
        isDeceased: formData.isDeceased,
      });
      toast({ title: "Family Started!", description: `Added ${formData.name} as a root ancestor.` });
      setOpen(false);
      setFormData({ name: "", motherName: "", phoneNumber: "", isDeceased: false });
    } catch (error) {
      toast({ 
        variant: "destructive",
        title: "Error", 
        description: error instanceof Error ? error.message : "Something went wrong" 
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="rounded-xl shadow-lg shadow-primary/20 bg-primary hover:bg-primary/90 text-white font-semibold px-6">
          <UserPlus className="w-5 h-5 mr-2" />
          Add Grandparent (Root)
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-2xl bg-white/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl text-primary">Add Family Root</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="root-name">Full Name</Label>
            <Input
              id="root-name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Great Grandpa Joe"
              className="rounded-xl"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="root-mother">Mother/Father Name (Optional)</Label>
            <Input
              id="root-mother"
              value={formData.motherName}
              onChange={(e) => setFormData({ ...formData, motherName: e.target.value })}
              placeholder="e.g. Mary or John Johnson"
              className="rounded-xl"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="root-phone">Phone Number (Optional)</Label>
            <Input
              id="root-phone"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              placeholder="e.g. +1 (555) 000-0000"
              className="rounded-xl"
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

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={createMutation.isPending} className="bg-primary hover:bg-primary/90">
              {createMutation.isPending ? "Creating..." : "Create Root"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
