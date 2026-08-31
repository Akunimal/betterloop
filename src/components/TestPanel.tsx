import React, { useState } from 'react';
import { pickerState } from '../state/pickerState';
import { FileResult } from '../webmcp-types';

export const TestPanel: React.FC = () => {
  const [result, setResult] = useState<FileResult | null>(null);
  const [loading, setLoading] = useState(false);

  const testMagicPicker = async () => {
    setLoading(true);
    setResult(null);

    try {
      const fileResult = await pickerState.requestFile({
        accept: "image/*",
        multiple: false,
        maxSizeMB: 5,
        prompt: "Please select an image file for testing"
      });

      setResult(fileResult);
    } catch (error) {
      setResult({
        success: false,
        error: 'Test failed: ' + String(error)
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
      marginBottom: '24px'
    }}>
      <h2 style={{ marginTop: 0, color: '#1F2937' }}>🧪 Test Panel</h2>
      <p style={{ color: '#6B7280' }}>
        This simulates what an AI agent would do when invoking the magic_picker tool.
      </p>

      <button
        onClick={testMagicPicker}
        disabled={loading}
        style={{
          backgroundColor: '#4F46E5',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 24px',
          fontSize: '16px',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1
        }}
      >
        {loading ? 'Waiting for file...' : 'Test: Request Image File'}
      </button>

      {result && (
        <div style={{ marginTop: '20px' }}>
          <h3>Result:</h3>
          <pre style={{
            backgroundColor: '#F3F4F6',
            padding: '16px',
            borderRadius: '8px',
            overflow: 'auto',
            maxHeight: '200px',
            fontSize: '12px'
          }}>
            {JSON.stringify(result, null, 2)}
          </pre>

          {result.success && result.base64Data && (
            <div style={{ marginTop: '16px' }}>
              <h4>Preview:</h4>
              <img
                src={`data:${result.fileType};base64,${result.base64Data}`}
                alt="Selected file"
                style={{ maxWidth: '200px', borderRadius: '8px' }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
