import { useEffect, useState } from 'react';
import { verifySignatures, type SignatureVerificationResponse } from '../../services/signatureVerificationApi';

type UploadBoxProps = {
  title: string;
  file: File | null;
  onFileChange: (file: File | null) => void;
};

function UploadBox({ title, file, onFileChange }: UploadBoxProps) {
  const [preview, setPreview] = useState('');

  useEffect(() => {
    if (!file) {
      setPreview('');
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [file]);

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
      <p className="text-sm font-semibold text-slate-100">{title}</p>
      <label className="mt-3 flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-600 bg-slate-950/40 p-4 transition hover:border-cyan-400/70">
        <input
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={(event) => onFileChange(event.target.files?.[0] || null)}
        />
        {preview ? (
          <img src={preview} alt={title} className="max-h-36 rounded-md object-contain" />
        ) : (
          <div className="text-center">
            <p className="text-sm text-slate-300">Click to upload signature</p>
            <p className="mt-1 text-xs text-slate-500">PNG, JPG, JPEG</p>
          </div>
        )}
      </label>
      {file ? <p className="mt-2 truncate text-xs text-slate-400">{file.name}</p> : null}
    </div>
  );
}

export default function SignatureVerification() {
  const [referenceFile, setReferenceFile] = useState<File | null>(null);
  const [testFile, setTestFile] = useState<File | null>(null);
  const [threshold, setThreshold] = useState(70);
  const [result, setResult] = useState<SignatureVerificationResponse | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const canVerify = Boolean(referenceFile && testFile && !loading);

  const runVerification = async () => {
    if (!referenceFile || !testFile) return;

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const response = await verifySignatures(referenceFile, testFile, threshold);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to verify signatures');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 md:p-8">
      <div className="mx-auto max-w-5xl">
        <div className="rounded-2xl border border-cyan-900/50 bg-slate-900/80 p-6 shadow-2xl shadow-cyan-950/40 md:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-white md:text-3xl">Signature Verification</h1>
              <p className="mt-2 text-sm text-slate-300">
                Upload a reference signature and a test signature to compare authenticity.
              </p>
            </div>
            <div className="w-full max-w-xs rounded-lg border border-slate-700 bg-slate-950/50 p-3">
              <label className="block text-xs uppercase tracking-wide text-slate-400">Threshold ({threshold}%)</label>
              <input
                type="range"
                min={40}
                max={95}
                step={1}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="mt-2 w-full accent-cyan-400"
              />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <UploadBox title="Reference Signature" file={referenceFile} onFileChange={setReferenceFile} />
            <UploadBox title="Test Signature" file={testFile} onFileChange={setTestFile} />
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runVerification}
              disabled={!canVerify}
              className="rounded-lg bg-cyan-500 px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
            >
              {loading ? 'Verifying...' : 'Verify Signatures'}
            </button>
            <button
              type="button"
              onClick={() => {
                setReferenceFile(null);
                setTestFile(null);
                setResult(null);
                setError('');
              }}
              className="rounded-lg border border-slate-600 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:border-slate-400"
            >
              Reset
            </button>
          </div>

          {error ? (
            <div className="mt-5 rounded-lg border border-rose-700/60 bg-rose-950/40 p-3 text-sm text-rose-200">{error}</div>
          ) : null}

          {result ? (
            <div className="mt-6 grid gap-4 rounded-xl border border-slate-700 bg-slate-950/50 p-4 md:grid-cols-4">
              <div>
                <p className="text-xs uppercase text-slate-400">Verdict</p>
                <p className={`mt-1 text-lg font-bold ${result.is_genuine ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {result.verdict}
                </p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Similarity</p>
                <p className="mt-1 text-lg font-bold text-white">{result.similarity.toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Distance</p>
                <p className="mt-1 text-lg font-bold text-white">{result.distance.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-xs uppercase text-slate-400">Confidence</p>
                <p className="mt-1 text-lg font-bold text-white">{result.confidence.toFixed(2)}%</p>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
