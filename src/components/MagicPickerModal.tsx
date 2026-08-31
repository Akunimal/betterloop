import React, { useEffect, useState } from 'react';
import { pickerState } from '../state/pickerState';
import { DropZone } from './DropZone';
import { FileResult } from '../webmcp-types';

export const MagicPickerModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<Record<string, unknown>>({});

  useEffect(() => {
    const unsubscribe = pickerState.subscribe((state) => {
      setIsOpen(state.isOpen);
      setOptions(state.options as Record<string, unknown>);
    });

    return unsubscribe;
  }, []);

  const handleFilesSelected = (results: FileResult[]) => {
    const result = results[0] || {
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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        maxWidth: '500px',
        width: '90%',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ margin: 0, fontSize: '20px', color: '#1F2937' }}>
            🪄 Magic Picker
          </h2>
          <button
            onClick={handleCancel}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6B7280'
            }}
          >
            ×
          </button>
        </div>

        {options.prompt && (
          <p style={{
            color: '#4B5563',
            fontSize: '14px',
            backgroundColor: '#F3F4F6',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px'
          }}>
            💬 {options.prompt as string}
          </p>
        )}

        <DropZone
          accept={(options.accept as string) || '*'}
          multiple={(options.multiple as boolean) || false}
          maxSizeMB={(options.maxSizeMB as number) || 10}
          onFilesSelected={handleFilesSelected}
        />

        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: '#F3F4F6',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              color: '#4B5563',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
