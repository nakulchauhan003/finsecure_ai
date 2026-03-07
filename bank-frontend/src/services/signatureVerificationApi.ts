const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3002';

export interface SignatureVerificationResponse {
  distance: number;
  similarity: number;
  threshold: number;
  is_genuine: boolean;
  confidence: number;
  verdict: 'GENUINE' | 'FORGED';
  method?: string;
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export async function verifySignatures(
  referenceFile: File,
  testFile: File,
  threshold = 70,
): Promise<SignatureVerificationResponse> {
  const [reference_image, test_image] = await Promise.all([
    fileToDataUrl(referenceFile),
    fileToDataUrl(testFile),
  ]);

  const res = await fetch(`${API_BASE}/api/signature/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reference_image, test_image, threshold }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error || `Signature verification failed (${res.status})`);
  }

  return res.json();
}
