import React, { useCallback, useState, useRef } from 'react';
import { FileResult } from '../webmcp-types';
import { fileToBase64, validateFile, formatFileSize } from '../utils/fileToBase64';

interface DropZoneProps {
  accept: string;
  multiple: boolean;
  maxSizeMB: number;
  onFilesSelected: (files: FileResult[]) => void;
}

export const DropZone: React.FC<DropZoneProps> = ({
  accept,
  multiple,
  maxSizeMB,
  onFilesSelected
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = useCallback(async (files: FileList) => {
    setError(null);
    const results: FileResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      const validation = validateFile(file, maxSizeMB, accept);
      if (!validation.valid) {
        setError(validation.error || 'File validation failed');
        continue;
      }

      try {
        const base64Data = await fileToBase64(file);
        results.push({
          success: true,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          base64Data
        });
      } catch {
        results.push({
          success: false,
          fileName: file.name,
          error: 'Failed to read file'
        });
      }
    }

    if (results.length > 0) {
      onFilesSelected(results);
    }
  }, [accept, maxSizeMB, onFilesSelected]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  }, [processFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
    // Allow selecting the same file again after a validation error or cancel.
    e.target.value = '';
  }, [processFiles]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openFileDialog();
    }
  };

  const acceptedLabel = accept === '*' || accept === '*/*' ? 'All file types' : `Accepted: ${accept}`;

  return (
    <div
      className={`dropzone ${isDragging ? 'dragging' : ''}`}
      role="button"
      tabIndex={0}
      aria-label="Choose a file"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFileDialog}
      onKeyDown={handleKeyDown}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept === '*' || accept === '*/*' ? undefined : accept}
        multiple={multiple}
        onChange={handleFileInput}
        onClick={(event) => event.stopPropagation()}
        style={{ display: 'none' }}
      />

      <div className="dropzone-icon" aria-hidden="true">✦</div>

      <h3>Drop files here or click to select</h3>

      <p className="dropzone-help">
        {acceptedLabel}
        {multiple ? ' • Multiple files allowed' : ' • Single file'}
        {` • Max ${formatFileSize(maxSizeMB * 1024 * 1024)}`}
      </p>

      {error && (
        <p className="dropzone-error" role="alert">⚠️ {error}</p>
      )}
    </div>
  );
};
