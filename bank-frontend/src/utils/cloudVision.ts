/**
 * Google Cloud Vision API Utility
 * Uses backend proxy (service account) with fallback to direct API key
 */

const getApiKey = () => import.meta.env.VITE_GOOGLE_API_KEY || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

const VISION_API_URL = 'https://vision.googleapis.com/v1/images:annotate';

export interface OCRResult {
  fullText: string;
  extractedFields: Record<string, string>;
  confidence: number;
  documentType: string;
  blocks: Array<{
    text: string;
    confidence: number;
    boundingBox?: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * Convert a File to base64.
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // remove data:image/...;base64, prefix
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Call Google Cloud Vision OCR on an image file.
 * Tries backend proxy (service account) first, falls back to API key.
 */
export async function performOCR(file: File): Promise<OCRResult> {
  const base64 = await fileToBase64(file);

  // Try backend proxy first
  try {
    const proxyRes = await fetch(`${BACKEND_URL}/api/vision/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      const annotations = data.responses?.[0];
      if (annotations) {
        return processVisionResponse(annotations);
      }
    }
  } catch {
    // Backend not available, fall back
  }

  // Fallback: direct API key
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set and backend proxy unavailable');

  const payload = {
    requests: [
      {
        image: { content: base64 },
        features: [
          { type: 'TEXT_DETECTION', maxResults: 50 },
          { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 },
        ],
      },
    ],
  };

  const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cloud Vision API error ${res.status}: ${errText}`);
  }

  const data = await res.json();
  const annotations = data.responses?.[0];

  if (!annotations) {
    return {
      fullText: '',
      extractedFields: {},
      confidence: 0,
      documentType: 'Unknown',
      blocks: [],
    };
  }

  return processVisionResponse(annotations);
}

/**
 * Process Vision API response annotations into an OCRResult.
 */
function processVisionResponse(annotations: Record<string, unknown>): OCRResult {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ann = annotations as any;
  const fullText: string = ann.fullTextAnnotation?.text || ann.textAnnotations?.[0]?.description || '';
  const pages = ann.fullTextAnnotation?.pages || [];

  let totalConfidence = 0;
  let blockCount = 0;
  const blocks: OCRResult['blocks'] = [];

  for (const page of pages) {
    for (const block of page.blocks || []) {
      const blockText = (block.paragraphs || [])
        .flatMap((p: { words?: Array<{ symbols?: Array<{ text?: string }> }> }) =>
          (p.words || []).map((w: { symbols?: Array<{ text?: string }> }) =>
            (w.symbols || []).map((s: { text?: string }) => s.text || '').join('')
          ).join(' ')
        ).join('\n');

      const conf = block.confidence || 0;
      totalConfidence += conf;
      blockCount++;

      blocks.push({ text: blockText, confidence: conf });
    }
  }

  const avgConfidence = blockCount > 0 ? totalConfidence / blockCount : 0.5;
  const { documentType, extractedFields } = parseDocument(fullText);

  return { fullText, extractedFields, confidence: avgConfidence, documentType, blocks };
}

/**
 * Parse OCR text to identify document type and extract structured fields.
 */
function parseDocument(text: string): { documentType: string; extractedFields: Record<string, string> } {
  const upperText = text.toUpperCase();
  const fields: Record<string, string> = {};

  // ---- Aadhaar Card Detection ----
  if (upperText.includes('AADHAAR') || upperText.includes('UNIQUE IDENTIFICATION') || upperText.includes('UIDAI')) {
    // Extract Aadhaar number (12 digits, possibly with spaces)
    const aadhaarMatch = text.match(/\b\d{4}\s?\d{4}\s?\d{4}\b/);
    if (aadhaarMatch) fields['Aadhaar Number'] = aadhaarMatch[0];

    // Extract DOB
    const dobMatch = text.match(/\b(\d{2}[/.-]\d{2}[/.-]\d{4})\b/);
    if (dobMatch) fields['Date of Birth'] = dobMatch[1];

    // Extract gender
    if (upperText.includes('MALE') && !upperText.includes('FEMALE')) fields['Gender'] = 'Male';
    else if (upperText.includes('FEMALE')) fields['Gender'] = 'Female';

    // Extract name (usually above the Aadhaar number, first line of text)
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length > 0) {
      // Look for a line that looks like a name (only letters and spaces)
      for (const line of lines) {
        if (/^[A-Za-z\s]{3,40}$/.test(line.trim()) && !line.toUpperCase().includes('AADHAAR') && !line.toUpperCase().includes('GOVERNMENT')) {
          fields['Full Name'] = line.trim();
          break;
        }
      }
    }

    // Extract address (look for lines after "Address:" or containing PIN code)
    const addressMatch = text.match(/Address[:\s]*([\s\S]{10,100})/i);
    if (addressMatch) fields['Address'] = addressMatch[1].trim().split('\n')[0];
    
    const pinMatch = text.match(/\b\d{6}\b/);
    if (pinMatch && !fields['Address']) fields['PIN Code'] = pinMatch[0];

    return { documentType: 'Aadhaar Card', extractedFields: fields };
  }

  // ---- PAN Card Detection ----
  if (upperText.includes('INCOME TAX') || upperText.includes('PERMANENT ACCOUNT') || /[A-Z]{5}\d{4}[A-Z]/.test(text)) {
    const panMatch = text.match(/[A-Z]{5}\d{4}[A-Z]/);
    if (panMatch) fields['PAN Number'] = panMatch[0];

    const dobMatch = text.match(/\b(\d{2}[/.-]\d{2}[/.-]\d{4})\b/);
    if (dobMatch) fields['Date of Birth'] = dobMatch[1];

    // Extract name
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    for (const line of lines) {
      if (/^[A-Z\s]{5,40}$/.test(line.trim()) && !line.includes('INCOME') && !line.includes('PERMANENT') && !line.includes('INDIA') && !line.includes('GOVT')) {
        if (!fields['Full Name']) fields['Full Name'] = line.trim();
        else if (!fields["Father's Name"]) fields["Father's Name"] = line.trim();
      }
    }

    return { documentType: 'PAN Card', extractedFields: fields };
  }

  // ---- Salary Slip Detection ----
  if (upperText.includes('SALARY') || upperText.includes('PAY SLIP') || upperText.includes('GROSS PAY') || upperText.includes('NET PAY')) {
    const grossMatch = text.match(/(?:Gross|Total)\s*(?:Pay|Salary|Earnings)[:\s]*[₹Rs.\s]*([0-9,]+)/i);
    if (grossMatch) fields['Gross Salary'] = `₹${grossMatch[1]}`;

    const netMatch = text.match(/(?:Net|Take[\s-]?Home)\s*(?:Pay|Salary)[:\s]*[₹Rs.\s]*([0-9,]+)/i);
    if (netMatch) fields['Net Salary'] = `₹${netMatch[1]}`;

    const nameMatch = text.match(/(?:Employee|Name)[:\s]*([A-Za-z\s]{3,40})/i);
    if (nameMatch) fields['Employee Name'] = nameMatch[1].trim();

    const empIdMatch = text.match(/(?:Emp|Employee)\s*(?:ID|No|Number)[:\s]*([A-Z0-9-]+)/i);
    if (empIdMatch) fields['Employee ID'] = empIdMatch[1];

    const monthMatch = text.match(/(?:Month|Period|For)[:\s]*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s-]*\d{4})/i);
    if (monthMatch) fields['Month/Year'] = monthMatch[1];

    return { documentType: 'Salary Slip / Income Proof', extractedFields: fields };
  }

  // ---- Bank Statement Detection ----
  if (upperText.includes('BANK STATEMENT') || upperText.includes('ACCOUNT STATEMENT') || (upperText.includes('OPENING BALANCE') && upperText.includes('CLOSING BALANCE'))) {
    const acctMatch = text.match(/(?:Account|A\/c)\s*(?:No|Number)[:\s]*([0-9\-X]+)/i);
    if (acctMatch) fields['Account Number'] = acctMatch[1];

    const bankMatch = text.match(/(HDFC|SBI|ICICI|AXIS|KOTAK|YES|INDUSIND|PNB|BOB|CANARA|UNION)\s*BANK/i);
    if (bankMatch) fields['Bank Name'] = bankMatch[0];

    const openMatch = text.match(/Opening\s*Balance[:\s]*[₹Rs.\s]*([0-9,]+)/i);
    if (openMatch) fields['Opening Balance'] = `₹${openMatch[1]}`;

    const closeMatch = text.match(/Closing\s*Balance[:\s]*[₹Rs.\s]*([0-9,]+)/i);
    if (closeMatch) fields['Closing Balance'] = `₹${closeMatch[1]}`;

    return { documentType: 'Bank Statement', extractedFields: fields };
  }

  // ---- Property Document Detection ----
  if (upperText.includes('SALE DEED') || upperText.includes('PROPERTY') || upperText.includes('REGISTRATION')) {
    const regMatch = text.match(/(?:Registration|Reg)\s*(?:No|Number)[:\s]*([A-Z0-9-]+)/i);
    if (regMatch) fields['Registration Number'] = regMatch[1];

    const areaMatch = text.match(/(\d[,.\d]*)\s*(?:sq\.?\s*ft|sqft|square\s*feet)/i);
    if (areaMatch) fields['Built-up Area'] = `${areaMatch[1]} sq ft`;

    return { documentType: 'Property Document / Sale Deed', extractedFields: fields };
  }

  // ---- Loan Application Detection ----
  if (upperText.includes('LOAN APPLICATION') || upperText.includes('LOAN AMOUNT')) {
    const amountMatch = text.match(/(?:Loan)\s*(?:Amount)[:\s]*[₹Rs.\s]*([0-9,]+)/i);
    if (amountMatch) fields['Loan Amount'] = `₹${amountMatch[1]}`;

    return { documentType: 'Loan Application Form', extractedFields: fields };
  }

  // Fallback
  return { documentType: 'Unknown Document', extractedFields: fields };
}

/**
 * Analyze document for potential tampering using image properties.
 */
export async function detectTampering(file: File): Promise<{
  tamperingDetected: boolean;
  flags: string[];
  safeSearchAnnotation: Record<string, string>;
  imageProperties: Record<string, unknown>;
}> {
  const base64 = await fileToBase64(file);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let response: any = {};

  // Try backend proxy first
  try {
    const proxyRes = await fetch(`${BACKEND_URL}/api/vision/ocr`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: base64, mimeType: file.type }),
    });
    if (proxyRes.ok) {
      const data = await proxyRes.json();
      response = data.responses?.[0] || {};
    }
  } catch {
    // Backend not available, fall back to API key
  }

  // Fallback: direct API key if proxy didn't return a response
  if (!response.safeSearchAnnotation && !response.imagePropertiesAnnotation) {
    const apiKey = getApiKey();
    if (!apiKey) throw new Error('VITE_GOOGLE_API_KEY not set and backend proxy unavailable');

    const payload = {
      requests: [
        {
          image: { content: base64 },
          features: [
            { type: 'SAFE_SEARCH_DETECTION' },
            { type: 'IMAGE_PROPERTIES' },
          ],
        },
      ],
    };

    const res = await fetch(`${VISION_API_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`Cloud Vision error ${res.status}`);

    const data = await res.json();
    response = data.responses?.[0] || {};
  }
  const safeSearch = response.safeSearchAnnotation || {};
  const imageProps = response.imagePropertiesAnnotation || {};

  const flags: string[] = [];
  
  // Check for anomalies
  if (safeSearch.spoof === 'VERY_LIKELY' || safeSearch.spoof === 'LIKELY') {
    flags.push('Image appears to be manipulated/spoofed');
  }

  // Check color distribution for potential Photoshop artifacts
  const colors = imageProps.dominantColors?.colors || [];
  if (colors.length < 3) {
    flags.push('Unusually low color diversity — possible digital fabrication');
  }

  // File size check
  if (file.size < 5000) {
    flags.push('Suspiciously small file size for a document scan');
  }

  return {
    tamperingDetected: flags.length > 0,
    flags,
    safeSearchAnnotation: safeSearch,
    imageProperties: imageProps,
  };
}
