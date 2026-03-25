import { useEffect, useMemo, useRef, useState } from "react";
import { X, Upload, FileText, Trash2, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";
import { forumService } from "@/integration/forum_service";

interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (post: {
    title: string;
    content: string;
    category: string;
    file?: File;
  }) => void | Promise<void>;
  initialData?: {
    title: string;
    content: string;
    category: string;
    fileName?: string;
  };
  mode?: "create" | "edit";
  forumId?: string;
  onSuccess?: () => void | Promise<void>;
}

interface Subject {
  id: string;
  name: string;
}

const normalizeSubject = (value: string) => value.trim().replace(/\s+/g, " ");

const extractFilenameFromUrl = (url: string): string => {
  try {
    const parsed = new URL(url);
    let path = parsed.pathname;
    path = path.replace(/\/+$/, "");
    const segments = path.split("/");
    const lastSegment = segments[segments.length - 1];
    if (lastSegment) {
      return decodeURIComponent(lastSegment);
    }
    return "";
  } catch {
    const parts = url.split("/");
    const lastPart = parts[parts.length - 1];
    const cleaned = lastPart.split(/[?#]/)[0];
    return cleaned || "";
  }
};

const formatDocumentName = (rawName: string): string => {
  let name = rawName.replace(/\.(pdf|docx?|txt|jpg|png|gif|zip)$/i, "");
  name = name.replace(/^[\d\-_]+/, "");
  name = name.replace(/[-_]/g, " ");
  name = name.replace(/\b\w/g, (char) => char.toUpperCase());
  return name || rawName;
};

const CreatePostModal = ({
  open,
  onClose,
  onSubmit,
  initialData,
  mode = "create",
  forumId,
  onSuccess,
}: CreatePostModalProps) => {
  const [title, setTitle] = useState(initialData?.title || "");
  const [content, setContent] = useState(initialData?.content || "");
  const [category, setCategory] = useState(initialData?.category || "");
  const [fileName, setFileName] = useState(initialData?.fileName || "");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [showSubjectDropdown, setShowSubjectDropdown] = useState(false);
  const [removeFile, setRemoveFile] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Add this useMemo after all state declarations
  const displayFileName = useMemo(() => {
    if (!fileName) return "";
    const isUrl =
      fileName.startsWith("http://") || fileName.startsWith("https://");
    const rawName = isUrl ? extractFilenameFromUrl(fileName) : fileName;
    return formatDocumentName(rawName);
  }, [fileName]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setTitle(initialData?.title || "");
    setContent(initialData?.content || "");
    setCategory(initialData?.category || "");
    setFileName(initialData?.fileName || "");
    setSelectedFile(null);
    setRemoveFile(false); // reset removal flag
  }, [open, initialData]);

  useEffect(() => {
    if (!open) return;

    const fetchSubjects = async () => {
      try {
        setLoadingSubjects(true);
        const res = await axiosInstance.get("/subjects");
        setSubjects(res.data?.subjects || []);
      } catch (err) {
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
        description: "Please upload a PDF, DOC, or DOCX file.",
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
        normalizeSubject(subject.name).toLowerCase() ===
        normalized.toLowerCase(),
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

      if (mode === "edit") {
        if (!forumId) throw new Error("Forum ID is required for editing");

        await forumService.updateForum(forumId, {
          title: title.trim(),
          content: content.trim(),
          subject: normalizedCategory,
          file: selectedFile || undefined,
          removeAttachment: removeFile,
        });

        setRemoveFile(false);
      } else {
        if (!onSubmit) {
          throw new Error("onSubmit is required for create mode");
        }

        await onSubmit({
          title: title.trim(),
          content: content.trim(),
          category: normalizedCategory,
          file: selectedFile || undefined,
        });
      }

      toast({
        title: mode === "create" ? "Post published!" : "Post updated!",
        description:
          mode === "create"
            ? "Your discussion has been posted."
            : "Your changes have been saved.",
      });

      await onSuccess?.();
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
        title:
          err?.response?.data?.error || err?.message || "Failed to submit post",
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

            <div className="space-y-5 px-5 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter your post title"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              <div className="space-y-2" ref={subjectBoxRef}>
                <label className="text-sm font-medium text-foreground">
                  Subject
                </label>

                <div className="relative">
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowSubjectDropdown(true);
                    }}
                    onFocus={() => setShowSubjectDropdown(true)}
                    placeholder="Enter or select a subject"
                    className="w-full rounded-lg border border-border bg-background px-3 py-2 pr-10 text-sm outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSubjectDropdown((prev) => !prev)}
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>

                {showSubjectDropdown && (
                  <div className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-border bg-popover shadow-md">
                    {loadingSubjects ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
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
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary"
                        >
                          {subject.name}
                        </button>
                      ))
                    ) : category.trim() !== "" ? (
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(category.trim());
                          setShowSubjectDropdown(false);
                        }}
                        className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-secondary"
                      >
                        Create "{category.trim()}"
                      </button>
                    ) : (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        No matching subjects found
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Content
                </label>
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Write your discussion here..."
                  rows={7}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Attachment
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {!fileName ? (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                  >
                    <Upload className="h-4 w-4" />
                    Upload PDF, DOC, or DOCX
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-foreground">
                        {displayFileName} {/* ← changed */}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:underline"
                      >
                        Change
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-secondary transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition"
              >
                {submitting
                  ? mode === "create"
                    ? "Posting..."
                    : "Saving..."
                  : mode === "create"
                    ? "Post"
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
