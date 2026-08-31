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
    <section className="test-panel" aria-labelledby="test-panel-title">
      <div className="panel-heading">
        <span className="panel-icon" aria-hidden="true">01</span>
        <div>
          <p className="panel-kicker">Interactive test</p>
          <h2 id="test-panel-title">Ask for an image</h2>
        </div>
      </div>
      <p className="panel-description">
        This simulates what an AI agent would do when invoking the magic_picker tool.
      </p>

      <button
        className="button button-primary"
        onClick={testMagicPicker}
        disabled={loading}
      >
        {loading ? 'Waiting for your file…' : 'Open the picker'}
      </button>

      {result && (
        <div className="result-block">
          <p className="result-label">Tool result</p>
          <pre className="result-json">{JSON.stringify(result, null, 2)}</pre>

          {result.success && result.base64Data && (
            <div className="preview-wrap">
              <p className="result-label">Preview</p>
              <img
                src={`data:${result.fileType};base64,${result.base64Data}`}
                alt="Selected file"
                className="preview-image"
              />
            </div>
          )}
        </div>
      )}
    </section>
  );
};
