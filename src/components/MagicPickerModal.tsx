import React, { useEffect, useState } from 'react';
import { pickerState } from '../state/pickerState';
import { DropZone } from './DropZone';
import { FileResult } from '../webmcp-types';

export const MagicPickerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const currentState = pickerState.getState();
    setIsOpen(currentState.isOpen);
    setOptions(currentState.options as Record<string, unknown>);

    const unsubscribe = pickerState.subscribe((state) => {
      setIsOpen(state.isOpen);
      setOptions(state.options as Record<string, unknown>);
    });

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && pickerState.getState().isOpen) {
        pickerState.complete({
          success: false,
          error: 'User cancelled file selection'
        });
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('keydown', handleEscape);
      unsubscribe();
    };
  }, []);

  const handleFilesSelected = (results: FileResult[]) => {
    const successfulFiles = results.filter((result) => result.success && result.fileName && result.fileSize !== undefined && result.fileType !== undefined && result.base64Data);
    const multiple = options.multiple === true;

    if (multiple && successfulFiles.length > 0) {
      pickerState.complete({
        success: true,
        fileCount: successfulFiles.length,
        files: successfulFiles.map((file) => ({
          fileName: file.fileName as string,
          fileSize: file.fileSize as number,
          fileType: file.fileType as string,
          base64Data: file.base64Data as string
        }))
      });
      return;
    }

    const result = successfulFiles[0] || results[0] || {
      success: false,
      error: 'No files selected'
    };

    pickerState.complete(result);
  };

  const handleCancel = () => {
    pickerState.complete({
      success: false,
      error: 'User cancelled file selection'
    });
  };

  const prompt = typeof options.prompt === 'string' ? options.prompt : '';

  if (!isOpen) return null;

  return (
    <div className="picker-overlay" role="presentation">
      <div className="picker-modal" role="dialog" aria-modal="true" aria-labelledby="picker-modal-title">
        <div className="picker-modal-header">
          <h2 className="picker-modal-title" id="picker-modal-title">Choose a file for the agent</h2>
          <button className="icon-button" onClick={handleCancel} aria-label="Cancel file selection">×</button>
        </div>

        {prompt && (
          <p className="picker-prompt">💬 {prompt}</p>
        )}

        <DropZone
          accept={(options.accept as string) || '*'}
          multiple={(options.multiple as boolean) || false}
          maxSizeMB={typeof options.maxSizeMB === 'number' ? options.maxSizeMB : 10}
          onFilesSelected={handleFilesSelected}
        />

        <div className="picker-modal-footer">
          <button className="picker-cancel" onClick={handleCancel}>Cancel</button>
        </div>
      </div>
    </div>
  );
};
