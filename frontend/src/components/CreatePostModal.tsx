import { useState, useRef } from "react";
import { X, Upload, FileText, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (post: { title: string; content: string; category: string; fileName?: string }) => void;
  initialData?: { title: string; content: string; category: string; fileName?: string };
  mode?: "create" | "edit";
}

const categories = [
  "Deep Learning", "Computer Science", "Medicine", "Economics",
  "Engineering", "Business", "Mathematics", "Physics", "Biology",
];

const CreatePostModal = ({ open, onClose, onSubmit, initialData, mode = "create" }: CreatePostModalProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [fileName, setFileName] = useState(initialData?.fileName || "");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a PDF or DOC file.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "File too large", description: "Maximum file size is 20MB.", variant: "destructive" });
      return;
    }
    setFileName(file.name);
  };

  const handleSubmit = () => {
    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }
    if (!content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Please select a category", variant: "destructive" });
      return;
    }
    onSubmit({ title: title.trim(), content: content.trim(), category, fileName: fileName || undefined });
    toast({ title: mode === "create" ? "Post published!" : "Post updated!", description: mode === "create" ? "Your discussion has been posted." : "Your changes have been saved." });
    onClose();
    if (mode === "create") {
      setTitle(""); setContent(""); setCategory(""); setFileName("");
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {mode === "create" ? "Create New Post" : "Edit Post"}
              </h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-5 space-y-4">
              {/* Title */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Title *</label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{title.length}/200</p>
              </div>

              {/* Category */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                >
                  <option value="">Select a category...</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Content */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Content *</label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your research, findings, or questions..."
                  rows={6}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">{content.length}/5000</p>
              </div>

              {/* File Upload */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Attach Notes <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {fileName ? (
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/30 px-3 py-2.5">
                    <FileText className="h-4 w-4 text-destructive shrink-0" />
                    <span className="text-sm text-foreground truncate flex-1">{fileName}</span>
                    <button
                      onClick={() => { setFileName(""); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload PDF or DOC file
                  </button>
                )}
                <p className="text-xs text-muted-foreground mt-1">Max 20MB · PDF, DOC, DOCX</p>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              >
                {mode === "create" ? "Publish Post" : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;
