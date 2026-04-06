import React, { useState, useEffect } from "react";
import { X, Plus, Paperclip, FileText, ChevronDown } from "lucide-react";
import { BrutalButton } from "@/components/ui/BrutalButton";
import { BrutalInput } from "@/components/ui/BrutalInput";
import { BrutalTag } from "@/components/ui/BrutalTag";
import axiosInstance from "@/integration/axiosInstance";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (post: {
    title: string;
    subject: string;
    content: string;
    tags: string[];
    attachments?: UploadedFile[];
  }) => void;
}

interface Subject {
  id: string;
  name: string;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [content, setContent] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [allSubjects, setAllSubjects] = useState<Subject[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);

  useEffect(() => {
    const fetchSubjects = async () => {
      try {
        setIsLoadingSubjects(true);
        const res = await axiosInstance.get("/subjects");
        setAllSubjects(res.data.subjects || []);
      } catch (err) {
        console.error("Failed to fetch subjects:", err);
      } finally {
        setIsLoadingSubjects(false);
      }
    };

    if (isOpen) fetchSubjects();
  }, [isOpen]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".subject-dropdown")) setShowDropdown(false);
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showDropdown]);

  const filteredSubjects = allSubjects.filter((s) =>
    s.name.toLowerCase().includes(subject.toLowerCase()),
  );

  const handleSelectSubject = (subj: Subject) => {
    setSelectedSubject(subj);
    setSubject(subj.name);
    setShowDropdown(false);
  };

  const handleSubjectInputChange = (value: string) => {
    setSubject(value);
    setSelectedSubject(null);
    setShowDropdown(true);
  };

  const canCreateNewSubject =
    subject.trim() &&
    !selectedSubject &&
    !filteredSubjects.some(
      (s) => s.name.toLowerCase() === subject.toLowerCase(),
    );

  const handleAddTag = () => {
    const t = tagInput.trim();
    if (t && !tags.includes(t)) {
      setTags([...tags, t]);
      setTagInput("");
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newFiles: UploadedFile[] = Array.from(files).map((file) => ({
        name: file.name,
        size: file.size,
        type: file.type,
      }));
      setAttachments([...attachments, ...newFiles]);
    }
    e.target.value = "";
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments(attachments.filter((f) => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const handleSubmit = async () => {
    if (!title || !subject || !content) return;

    if (!selectedSubject && !canCreateNewSubject) {
      alert("Please select or create a subject");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        title,
        subject: selectedSubject?.name || subject,
        content,
        tags,
        attachments,
      });
      setTitle("");
      setSubject("");
      setContent("");
      setSelectedSubject(null);
      setTags([]);
      setAttachments([]);
      setShowDropdown(false);
      onClose();
    } catch (err) {
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-foreground/50" onClick={onClose} />

      <div className="relative bg-card border-[4px] border-foreground rounded-xl shadow-brutal-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        <div className="bg-primary p-4 flex items-center justify-between border-b-[4px] border-foreground">
          <h2 className="text-2xl font-bold text-primary-foreground">
            Create New Post
          </h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="relative subject-dropdown">
            <label className="block text-lg font-bold mb-2">Subject</label>
            <div className="relative">
              <input
                type="text"
                value={subject}
                onChange={(e) => handleSubjectInputChange(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type to search or create a subject..."
                className="w-full px-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <ChevronDown
                className={`absolute right-3 top-3 w-5 h-5 text-foreground transition-transform ${showDropdown ? "rotate-180" : ""}`}
              />
            </div>

            {showDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-card border-[3px] border-foreground rounded-lg shadow-brutal-lg z-10 max-h-48 overflow-y-auto">
                {isLoadingSubjects ? (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    Loading subjects...
                  </div>
                ) : filteredSubjects.length > 0 ? (
                  <>
                    {filteredSubjects.map((subj) => (
                      <button
                        key={subj.id}
                        onClick={() => handleSelectSubject(subj)}
                        className="w-full text-left px-4 py-2.5 hover:bg-primary hover:text-primary-foreground transition-colors border-b-[2px] border-foreground/30 font-medium last:border-b-0">
                        {subj.name}
                      </button>
                    ))}
                    {canCreateNewSubject && (
                      <>
                        <div className="border-t-[2px] border-foreground/50" />
                        <button
                          onClick={async () => {
                            try {
                              const res = await axiosInstance.post(
                                "/subjects",
                                {
                                  name: subject,
                                },
                              );
                              const newSubject = res.data.subject;
                              handleSelectSubject(newSubject);
                              setAllSubjects([...allSubjects, newSubject]);
                            } catch (err) {
                              console.error("Failed to create subject:", err);
                            }
                          }}
                          className="w-full text-left px-4 py-2.5 hover:bg-green-500 hover:text-green-foreground transition-colors font-bold text-green-700">
                          + Create &quot;{subject}&quot;
                        </button>
                      </>
                    )}
                  </>
                ) : canCreateNewSubject ? (
                  <button
                    onClick={async () => {
                      try {
                        const res = await axiosInstance.post("/subjects", {
                          name: subject,
                        });
                        const newSubject = res.data.subject;
                        handleSelectSubject(newSubject);
                        setAllSubjects([...allSubjects, newSubject]);
                      } catch (err) {
                        console.error("Failed to create subject:", err);
                      }
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-green-500 hover:text-green-foreground transition-colors font-bold text-green-700">
                    + Create &quot;{subject}&quot;
                  </button>
                ) : (
                  <div className="p-3 text-center text-sm text-muted-foreground">
                    No subjects found
                  </div>
                )}
              </div>
            )}

            {selectedSubject && (
              <div className="mt-2 text-sm text-green-700 font-medium">
                ✓ Selected: {selectedSubject.name}
              </div>
            )}
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">Title</label>
            <BrutalInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a compelling title..."
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">Content</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your thoughts, questions, or research..."
              rows={6}
              className="w-full px-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">Tags</label>
            <div className="flex gap-2">
              <BrutalInput
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Add a tag..."
                className="flex-1"
              />
              <BrutalButton
                type="button"
                variant="secondary"
                onClick={handleAddTag}>
                <Plus className="w-5 h-5" />
              </BrutalButton>
            </div>

            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <BrutalTag
                    key={tag}
                    color="teal"
                    className="cursor-pointer"
                    onClick={() => handleRemoveTag(tag)}>
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </BrutalTag>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-lg font-bold mb-2">Attachments</label>
            <label className="flex items-center justify-center gap-2 p-4 bg-background border-[3px] border-dashed border-foreground rounded-lg cursor-pointer hover:bg-muted transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.zip"
                onChange={handleFileUpload}
                className="hidden"
              />
              <Paperclip className="w-5 h-5" />
              <span className="font-medium">
                Click to upload documents, images, or files
              </span>
            </label>

            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 bg-muted border-[2px] border-foreground rounded-lg">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium truncate max-w-[200px]">
                        {file.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        ({formatFileSize(file.size)})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.name)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t-[3px] border-foreground bg-muted flex justify-end gap-3">
          <BrutalButton
            variant="outline"
            onClick={onClose}
            disabled={isSubmitting}>
            Cancel
          </BrutalButton>
          <BrutalButton
            variant="default"
            onClick={handleSubmit}
            disabled={isSubmitting || !title || !subject || !content}>
            {isSubmitting ? "Posting..." : "Post Discussion"}
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
