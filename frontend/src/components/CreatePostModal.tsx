import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Upload,
  FileText,
  ChevronDown,
  Plus,
  Tag,
  Hash,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import axiosInstance from "@/integration/axiosInstance";
import { forumService } from "@/integration/forum_service";

// --- Types and helpers (unchanged) ---
interface CreatePostModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit?: (post: {
    title: string;
    content: string;
    category: string;
    tagIds: string[];
    file?: File;
  }) => void | Promise<void>;
  initialData?: {
    title: string;
    content: string;
    category: string;
    fileName?: string;
    tagIds?: string[];
  };
  mode?: "create" | "edit";
  forumId?: string;
  onSuccess?: () => void | Promise<void>;
}

interface Subject {
  id: string;
  name: string;
}

interface Tag {
  id: string;
  name: string;
  usage_count?: number;
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

// --- Main component ---
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

  // Tags state – new design
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    initialData?.tagIds || [],
  );
  const [tagInputValue, setTagInputValue] = useState("");
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);

  const [submitting, setSubmitting] = useState(false);

  // Refs for click‑outside handling
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subjectBoxRef = useRef<HTMLDivElement>(null);
  const tagBoxRef = useRef<HTMLDivElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);

  // Display name for attachment
  const displayFileName = useMemo(() => {
    if (!fileName) return "";
    const isUrl =
      fileName.startsWith("http://") || fileName.startsWith("https://");
    const rawName = isUrl ? extractFilenameFromUrl(fileName) : fileName;
    return formatDocumentName(rawName);
  }, [fileName]);

  // --- Fetch subjects on mount ---
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

  // --- Fetch tags on mount ---
  useEffect(() => {
    if (!open) return;

    const fetchTags = async () => {
      try {
        setLoadingTags(true);
        // Get tags sorted by usage (popular first) to show usage counts
        const res = await axiosInstance.get("/tags?sort=popular");
        setAllTags(res.data?.tags || []);
      } catch (err) {
        console.error("Fetch tags error:", err);
        toast({
          title: "Failed to load tags",
          variant: "destructive",
        });
      } finally {
        setLoadingTags(false);
      }
    };

    fetchTags();
  }, [open]);

  // --- Fetch forum tags on edit ---
  useEffect(() => {
    if (!open || mode !== "edit" || !forumId || initialData?.tagIds) return;

    const fetchForumTags = async () => {
      try {
        const res = await axiosInstance.get(`/forums/${forumId}`);
        const forum = res.data?.forum;
        if (forum && forum.tags) {
          setSelectedTagIds(forum.tags.map((tag: Tag) => tag.id));
        }
      } catch (err) {
        console.error("Fetch forum tags error:", err);
      }
    };

    fetchForumTags();
  }, [open, mode, forumId, initialData]);

  // --- Close dropdowns on outside click ---
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        subjectBoxRef.current &&
        !subjectBoxRef.current.contains(event.target as Node)
      ) {
        setShowSubjectDropdown(false);
      }
      if (
        tagBoxRef.current &&
        !tagBoxRef.current.contains(event.target as Node)
      ) {
        setShowTagDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- Filter subjects ---
  const filteredSubjects = useMemo(() => {
    const query = normalizeSubject(category).toLowerCase();
    if (!query) return subjects.slice(0, 8);
    return subjects
      .filter((subject) => subject.name.toLowerCase().includes(query))
      .slice(0, 8);
  }, [subjects, category]);

  // --- Filter tags for dropdown (based on tagInputValue) ---
  const filteredTags = useMemo(() => {
    const query = tagInputValue.trim().toLowerCase();
    if (!query) return allTags.slice(0, 20);
    return allTags
      .filter((tag) => tag.name.toLowerCase().includes(query))
      .slice(0, 20);
  }, [allTags, tagInputValue]);

  // --- Handlers for subject and file ---
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

  const ensureTagExists = async (tagName: string): Promise<Tag | null> => {
    const normalized = tagName.trim();
    if (!normalized) return null;

    const existing = allTags.find(
      (tag) => tag.name.toLowerCase() === normalized.toLowerCase(),
    );

    if (existing) return existing;

    const res = await axiosInstance.post("/tags", { name: normalized });
    const createdTag = res.data?.tag;

    if (createdTag) {
      setAllTags((prev) =>
        [...prev, createdTag].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }

    return createdTag;
  };

  // --- Tag input handlers ---
  const addTag = async (tagIdOrName: string) => {
    let tagId = tagIdOrName;
    let tag: Tag | null = null;

    // Check if it's an existing tag ID or a new tag name
    const existingTag = allTags.find((t) => t.id === tagIdOrName);
    if (existingTag) {
      tagId = existingTag.id;
    } else {
      // It's a name – create tag
      tag = await ensureTagExists(tagIdOrName);
      if (!tag) return;
      tagId = tag.id;
    }

    if (!selectedTagIds.includes(tagId)) {
      setSelectedTagIds((prev) => [...prev, tagId]);
      toast({
        title: "Tag added",
        description: `${tag ? tag.name : existingTag?.name} has been added.`,
      });
    } else {
      toast({
        title: "Tag already added",
        description: "This tag is already selected.",
      });
    }
    setTagInputValue("");
    setShowTagDropdown(false);
    // Focus the input again
    tagInputRef.current?.focus();
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = tagInputValue.trim();
      if (!trimmed) return;

      // If there's an exact match in filteredTags, add that tag
      const exactMatch = filteredTags.find(
        (t) => t.name.toLowerCase() === trimmed.toLowerCase(),
      );
      if (exactMatch) {
        addTag(exactMatch.id);
      } else {
        // Otherwise create a new tag
        addTag(trimmed);
      }
    }
  };

  const removeTag = (tagId: string) => {
    setSelectedTagIds((prev) => prev.filter((id) => id !== tagId));
    toast({
      title: "Tag removed",
    });
  };

  // --- Form submission ---
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

      // Ensure subject exists
      await ensureSubjectExists(normalizedCategory);

      if (mode === "edit") {
        if (!forumId) throw new Error("Forum ID is required for editing");

        await forumService.updateForum(forumId, {
          title: title.trim(),
          content: content.trim(),
          subject: normalizedCategory,
          tagIds: selectedTagIds,
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
          tagIds: selectedTagIds,
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
        setSelectedTagIds([]);
        setTagInputValue("");
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

  // --- Render ---
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-sm p-4"
          onClick={onClose}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <h2 className="text-lg font-heading font-semibold text-foreground">
                {mode === "create" ? "Create New Post" : "Edit Post"}
              </h2>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-secondary transition-colors"
                type="button">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5 px-5 py-4">
              {/* Title */}
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

              {/* Subject */}
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
                    className="absolute inset-y-0 right-2 flex items-center text-muted-foreground">
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
                          className="block w-full px-3 py-2 text-left text-sm hover:bg-secondary">
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
                        className="block w-full px-3 py-2 text-left text-sm text-primary hover:bg-secondary">
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

              {/* Content */}
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

              {/* Tags (now below content) */}
              <div className="space-y-2" ref={tagBoxRef}>
                <label className="text-sm font-medium text-foreground flex items-center gap-1">
                  <Tag className="h-4 w-4" />
                  Tags (optional)
                </label>
                <div className="relative">
                  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-primary">
                    {/* Selected tags as chips inside the input area */}
                    {selectedTagIds.map((tagId) => {
                      const tag = allTags.find((t) => t.id === tagId);
                      if (!tag) return null;
                      return (
                        <span
                          key={tagId}
                          className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          <Hash className="h-2.5 w-2.5" />
                          {tag.name}
                          <button
                            type="button"
                            onClick={() => removeTag(tagId)}
                            className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5">
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      );
                    })}
                    <input
                      ref={tagInputRef}
                      type="text"
                      value={tagInputValue}
                      onChange={(e) => {
                        setTagInputValue(e.target.value);
                        setShowTagDropdown(true);
                      }}
                      onFocus={() => setShowTagDropdown(true)}
                      onKeyDown={handleTagInputKeyDown}
                      placeholder={
                        selectedTagIds.length === 0
                          ? "Add tags (e.g., Programming, AI)..."
                          : ""
                      }
                      className="flex-1 min-w-[120px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    />
                  </div>

                  {/* Dropdown */}
                  {showTagDropdown &&
                    (tagInputValue.trim() !== "" ||
                      filteredTags.length > 0) && (
                      <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-popover shadow-lg">
                        <div className="max-h-48 overflow-y-auto">
                          {loadingTags ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Loading tags...
                            </div>
                          ) : filteredTags.length > 0 ? (
                            filteredTags.map((tag) => (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => addTag(tag.id)}
                                className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-secondary">
                                <span className="flex items-center gap-1">
                                  <Hash className="h-3 w-3 text-muted-foreground" />
                                  {tag.name}
                                </span>
                                {tag.usage_count !== undefined && (
                                  <span className="text-xs text-muted-foreground">
                                    {tag.usage_count} used
                                  </span>
                                )}
                              </button>
                            ))
                          ) : tagInputValue.trim() !== "" ? (
                            <button
                              type="button"
                              onClick={() => addTag(tagInputValue.trim())}
                              className="flex w-full items-center gap-1 px-3 py-2 text-left text-sm text-primary hover:bg-secondary">
                              <Plus className="h-3 w-3" /> Create "
                              {tagInputValue.trim()}"
                            </button>
                          ) : (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Type to search or create tags
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Press Enter to add a tag. You can add multiple tags.
                </p>
              </div>

              {/* Attachment */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Attachment (optional)
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
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground hover:bg-secondary transition-colors">
                    <Upload className="h-4 w-4" />
                    Upload PDF, DOC, or DOCX
                  </button>
                ) : (
                  <div className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate text-sm text-foreground">
                        {displayFileName}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs text-primary hover:underline">
                        Change
                      </button>
                      {mode === "edit" && (
                        <button
                          type="button"
                          onClick={() => {
                            setRemoveFile(true);
                            setFileName("");
                            setSelectedFile(null);
                          }}
                          className="text-xs text-destructive hover:underline">
                          Remove
                        </button>
                      )}
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
                disabled={submitting}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={submitting}
                className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60 transition">
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
