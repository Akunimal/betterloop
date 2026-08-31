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

      const validation = validateFile(file, maxSizeMB);
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
  }, [maxSizeMB, onFilesSelected]);

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
  }, [processFiles]);

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div
      className={`dropzone ${isDragging ? 'dragging' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onClick={openFileDialog}
      style={{
        border: `2px dashed ${isDragging ? '#4F46E5' : '#D1D5DB'}`,
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        cursor: 'pointer',
        backgroundColor: isDragging ? '#EEF2FF' : '#F9FAFB',
        transition: 'all 0.2s ease'
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleFileInput}
        style={{ display: 'none' }}
      />

      <div style={{ fontSize: '48px', marginBottom: '16px' }}>🪄</div>

      <h3 style={{ margin: '0 0 8px 0', color: '#1F2937' }}>
        Drop files here or click to select
      </h3>

      <p style={{ margin: '0 0 16px 0', color: '#6B7280', fontSize: '14px' }}>
        {accept !== '*' ? `Accepted: ${accept}` : 'All file types accepted'}
        {multiple ? ' • Multiple files allowed' : ' • Single file'}
        {` • Max ${formatFileSize(maxSizeMB * 1024 * 1024)}`}
      </p>

      {error && (
        <div style={{
          color: '#EF4444',
          backgroundColor: '#FEF2F2',
          padding: '8px 12px',
          borderRadius: '6px',
          fontSize: '14px',
          marginTop: '12px'
        }}>
          ⚠️ {error}
        </div>
      )}
    </div>
  );
};
