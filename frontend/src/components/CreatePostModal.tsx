import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, FileText, Trash2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (post: {
    title: string;
    content: string;
    category: string;
    file?: File;
    fileName?: string;
  }) => void | Promise<void>;
  initialData?: {
    title: string;
    content: string;
    category: string;
    fileName?: string;
  };
  mode?: "create" | "edit";
}

interface Subject {
  id: string;
  name: string;
}

const normalizeSubject = (value: string) => value.trim().replace(/\s+/g, " ");

const CreatePostModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
}: CreatePostModalProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [fileName, setFileName] = useState(initialData?.fileName || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    setTitle(initialData?.title || "");
    setContent(initialData?.content || "");
    setCategory(initialData?.category || "");
    setFileName(initialData?.fileName || "");
    setSelectedFile(null);
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const res = await axiosInstance.get("/subjects");
        setSubjects(res.data?.subjects || []);
      } catch (err: any) {
        console.error("Fetch subjects error:", err);
        toast({
          title: "Failed to load subjects",
          variant: "destructive",
        });
      } finally {
        setLoadingSubjects(false);
      }
    };

    fetchSubjects();
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        subjectBoxRef.current &&
        !subjectBoxRef.current.contains(event.target as Node)
      ) {
        setShowSubjectDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredSubjects = useMemo(() => {
    const query = normalizeSubject(category).toLowerCase();
    if (!query) return subjects.slice(0, 8);

    return subjects
      .filter((subject) => subject.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [subjects, category]);

  const exactSubjectExists = useMemo(() => {
    const normalized = normalizeSubject(category).toLowerCase();
    return subjects.some(
      (subject) => normalizeSubject(subject.name).toLowerCase() === normalized,
    );
  }, [subjects, category]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ];

    if (!allowed.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or DOC file.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB.",
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setFileName(file.name);
  };

  const ensureSubjectExists = async (subjectName: string) => {
    const normalized = normalizeSubject(subjectName);
    if (!normalized) return null;

    const existing = subjects.find(
      (subject) =>
        normalizeSubject(subject.name).toLowerCase() === normalized.toLowerCase(),
    );

    if (existing) return existing;

    const res = await axiosInstance.post("/subjects", { name: normalized });
    const createdSubject = res.data?.subject;

    if (createdSubject) {
      setSubjects((prev) => {
        const found = prev.some((s) => s.id === createdSubject.id);
        if (found) return prev;
        return [...prev, createdSubject].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
      });
    }

    return createdSubject;
  };

  const handleSubmit = async () => {
    const normalizedCategory = normalizeSubject(category);

    if (!title.trim()) {
      toast({ title: "Title is required", variant: "destructive" });
      return;
    }

    if (!content.trim()) {
      toast({ title: "Content is required", variant: "destructive" });
      return;
    }

    if (!normalizedCategory) {
      toast({ title: "Please enter a subject", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);

      await ensureSubjectExists(normalizedCategory);

      await onSubmit({
        title: title.trim(),
        content: content.trim(),
        category: normalizedCategory,
        file: selectedFile || undefined,
        fileName: fileName || undefined,
      });

      toast({
        title: mode === "create" ? "Post published!" : "Post updated!",
        description:
          mode === "create"
            ? "Your discussion has been posted."
            : "Your changes have been saved.",
      });

      onClose();

      if (mode === "create") {
        setTitle("");
        setContent("");
        setCategory("");
        setFileName("");
        setSelectedFile(null);
      }
    } catch (err: any) {
      console.error("Create/Edit post modal submit error:", err);
      toast({
        title: err?.response?.data?.error || "Failed to submit post",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
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
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {mode === "create" ? "Create New Post" : "Edit Post"}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Title *
                </label>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter a descriptive title..."
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  maxLength={200}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {title.length}/200
                </p>
              </div>

              <div ref={subjectBoxRef}>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Subject *
                </label>

                <div className="relative">
                  <input
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowSubjectDropdown(true);
                    }}
                    onFocus={() => setShowSubjectDropdown(true)}
                    placeholder="Type a subject..."
                    className="w-full rounded-lg border border-input bg-background px-3 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30"
                  />
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />

                  {showSubjectDropdown && (
                    <div className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg overflow-hidden">
                      <div className="max-h-56 overflow-y-auto">
                        {loadingSubjects ? (
                          <div className="px-3 py-2.5 text-sm text-muted-foreground">
                            Loading subjects...
                          </div>
                        ) : filteredSubjects.length > 0 ? (
                          filteredSubjects.map((subject) => (
                            <button
                              key={subject.id}
                              type="button"
                              onClick={() => {
                                setCategory(subject.name);
                                setShowSubjectDropdown(false);
                              }}
                              className="w-full px-3 py-2.5 text-left text-sm text-foreground hover:bg-secondary transition-colors"
                            >
                              {subject.name}
                            </button>
                          ))
                        ) : normalizeSubject(category) ? (
                          <div className="px-3 py-2.5 text-sm text-muted-foreground">
                            No matching subject found.
                          </div>
                        ) : (
                          <div className="px-3 py-2.5 text-sm text-muted-foreground">
                            Start typing to search subjects.
                          </div>
                        )}

                        {normalizeSubject(category) && !exactSubjectExists && (
                          <button
                            type="button"
                            onClick={() => setShowSubjectDropdown(false)}
                            className="w-full border-t border-border px-3 py-2.5 text-left text-sm text-primary hover:bg-primary/5 transition-colors"
                          >
                            Use "{normalizeSubject(category)}" as a new subject
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <p className="text-xs text-muted-foreground mt-1">
                  Type to search existing subjects. New subjects will be added automatically when you publish.
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Content *
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Share your research, findings, or questions..."
                  rows={6}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 resize-none"
                  maxLength={5000}
                />
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {content.length}/5000
                </p>
              </div>

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
                    <span className="text-sm text-foreground truncate flex-1">
                      {fileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setFileName("");
                        setSelectedFile(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="rounded p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/20 px-3 py-4 text-sm text-muted-foreground hover:text-foreground hover:border-primary/20 hover:bg-secondary/40 transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload PDF or DOC file
                  </button>
                )}
                <p className="text-xs text-muted-foreground mt-1">
                  Max 20MB · PDF, DOC, DOCX
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                onClick={onClose}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
                disabled={submitting}
                type="button"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg px-5 py-2 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
                type="button"
              >
                {submitting
                  ? mode === "create"
                    ? "Publishing..."
                    : "Saving..."
                  : mode === "create"
                    ? "Publish Post"
                    : "Save Changes"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CreatePostModal;