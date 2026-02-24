import React, { useState } from 'react';
import { X, Plus, Paperclip, FileText } from 'lucide-react';
import { BrutalButton } from '@/components/ui/BrutalButton';
import { BrutalInput } from '@/components/ui/BrutalInput';
import { BrutalTag } from '@/components/ui/BrutalTag';

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

const subjects = [
  'Computer Science',
  'Biology',
  'Philosophy',
  'Research Methods',
  'Environmental Science',
  'Mathematics',
  'Physics',
  'Psychology',
  'Other',
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags([...tags, tagInput.trim()]);
      setTagInput('');
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
    e.target.value = '';
  };

  const handleRemoveAttachment = (fileName: string) => {
    setAttachments(attachments.filter((f) => f.name !== fileName));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleSubmit = () => {
    if (title && subject && content) {
      onSubmit({ title, subject, content, tags, attachments });
      setTitle('');
      setSubject('');
      setContent('');
      setTags([]);
      setAttachments([]);
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-foreground/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-card border-[4px] border-foreground rounded-xl shadow-brutal-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-primary p-4 flex items-center justify-between border-b-[4px] border-foreground">
          <h2 className="text-2xl font-bold text-primary-foreground">Create New Post</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 bg-background border-[2px] border-foreground rounded-lg shadow-brutal-sm flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Subject */}
          <div>
            <label className="block text-lg font-bold mb-2">Subject</label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full px-4 py-3 bg-background border-[3px] border-foreground rounded-lg font-medium shadow-brutal-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="">Select a subject...</option>
              {subjects.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div>
            <label className="block text-lg font-bold mb-2">Title</label>
            <BrutalInput
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter a compelling title..."
            />
          </div>

          {/* Content */}
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

          {/* Tags */}
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
              <BrutalButton type="button" variant="secondary" onClick={handleAddTag}>
                <Plus className="w-5 h-5" />
              </BrutalButton>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-3">
                {tags.map((tag) => (
                  <BrutalTag key={tag} color="teal" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                    {tag}
                    <X className="w-3 h-3 ml-1" />
                  </BrutalTag>
                ))}
              </div>
            )}
          </div>

          {/* Attachments */}
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
              <span className="font-medium">Click to upload documents, images, or files</span>
            </label>
            {attachments.length > 0 && (
              <div className="mt-3 space-y-2">
                {attachments.map((file) => (
                  <div
                    key={file.name}
                    className="flex items-center justify-between p-3 bg-muted border-[2px] border-foreground rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                      <span className="text-sm text-muted-foreground">({formatFileSize(file.size)})</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAttachment(file.name)}
                      className="w-6 h-6 flex items-center justify-center rounded hover:bg-destructive hover:text-destructive-foreground transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-foreground bg-muted flex justify-end gap-3">
          <BrutalButton variant="outline" onClick={onClose}>
            Cancel
          </BrutalButton>
          <BrutalButton variant="primary" onClick={handleSubmit}>
            Post Discussion
          </BrutalButton>
        </div>
      </div>
    </div>
  );
};
