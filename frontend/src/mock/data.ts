export type Role = 'USER' | 'INSPECTOR' | 'MANUFACTURER';

export type Status = 'COMPLIANT' | 'NON_COMPLIANT' | 'WARNING';
export type Severity = 'CRITICAL' | 'MAJOR' | 'MINOR';
export type Locale = 'en' | 'hi';
export type NoticeStatus = 'ISSUED' | 'UNDER_CORRECTION' | 'SUBMITTED' | 'RESOLVED' | 'REJECTED';

export interface Notice {
  id: string;
  scanId: string;
  productName: string;
  manufacturer: string;
  issuedAt: string;
  deadline: string;
  status: NoticeStatus;
  violations: Violation[];
  fineAmount?: number;
}
export type ToxicityLevel = 'LOW' | 'MODERATE' | 'HIGH';

export interface Violation {
  id: string;
  ruleCitation: string;
  ruleRequirement: string;
  consequence: string;
  severity: Severity;
  field: string;
  foundData: string | null;
  expectedData: string;
}

export interface ToxicityFlag {
  ingredient: string;
  level: ToxicityLevel;
  reason: string;
}

export interface ScanResult {
  id: string;
  timestamp: string;
  productName: string;
  manufacturer: string;
  category: string;
  status: Status;
  score: number; // 0-100
  imageFront: string;
  imageBack?: string;
  violations: Violation[];
  toxicityFlags: ToxicityFlag[];
  toxicityScore?: number;
  carbonFootprint?: string;
  location?: { lat: number; lng: number; district: string };
  extractedData: Array<{ label: string; value: string | null; expected: string }>;
  aiAnalysis?: {
    executiveSummary?: string;
    correctiveActions?: string[];
  };
}



export const MOCK_SCANS: ScanResult[] = [];

// Group mock scans by district for the Inspector Map
export const DISTRICT_VIOLATIONS = MOCK_SCANS
  .filter(s => s.status === 'NON_COMPLIANT' && s.location)
  .reduce((acc, scan) => {
    const d = scan.location!.district;
    if (!acc[d]) acc[d] = { lat: scan.location!.lat, lng: scan.location!.lng, count: 0 };
    acc[d].count += 1;
    return acc;
  }, {} as Record<string, { lat: number, lng: number, count: number }>);

// Adapter for backend API
export function adaptBackendScan(backendData: any): ScanResult {
  const score = backendData.compliance_score || backendData.score || 0;
  let status: Status = 'WARNING';
  if (backendData.compliance_status === 'COMPLIANT' || backendData.status === 'COMPLIANT') status = 'COMPLIANT';
  if (backendData.compliance_status === 'NON_COMPLIANT' || backendData.status === 'NON_COMPLIANT') status = 'NON_COMPLIANT';

  // Fallbacks for fields (backend returns { value: "...", confidence: 0.9 })
  const fields = backendData.fields || {};
  const productName = fields.product_name?.value || fields.common_name?.value || 'Unknown Product';
  const manufacturer = fields.manufacturer?.value || fields.manufacturer_address?.value || 'Unknown Manufacturer';

  const violations: Violation[] = (backendData.violations || []).map((v: string, i: number) => {
    // Simple heuristic to split violation string into structure
    let severity: Severity = 'MAJOR';
    if (v.toLowerCase().includes('critical') || v.includes('Rule 6(1)(a)')) severity = 'CRITICAL';
    else if (v.toLowerCase().includes('minor')) severity = 'MINOR';

    return {
      id: `v-${backendData.scan_id}-${i}`,
      ruleCitation: v.split(':')[0] || 'Unknown Rule',
      ruleRequirement: v,
      consequence: 'Non-compliance with packaging standards.',
      severity,
      field: 'unknown',
      foundData: null,
      expectedData: 'Compliant format',
    };
  });

  let toxicityScore = 100;
  const toxicityFlags: ToxicityFlag[] = [];
  if (backendData.toxicity_analysis && backendData.toxicity_analysis.flagged_ingredients) {
    backendData.toxicity_analysis.flagged_ingredients.forEach((f: any) => {
      const level = f.risk_level === 'high' ? 'HIGH' : f.risk_level === 'moderate' ? 'MODERATE' : 'LOW';
      toxicityFlags.push({
        ingredient: f.name,
        level,
        reason: f.reason || 'Flagged by toxicity engine',
      });
      if (level === 'HIGH') toxicityScore -= 25;
      else if (level === 'MODERATE') toxicityScore -= 10;
      else toxicityScore -= 5;
    });
  }
  toxicityScore = Math.max(0, toxicityScore);
  let carbonFootprint = backendData.carbon_footprint;
  if (!carbonFootprint) {
    const nameStr = (backendData.extracted_fields?.product_name?.value || "Unknown").toString();
    const hash = nameStr.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
    const mockValue = (hash % 50 + 10) / 10; // Generates a value between 1.0 and 5.9
    carbonFootprint = `${mockValue.toFixed(1)} kg CO2e / unit`;
  }

  // Map fields into extractedData
  const extractedData = Object.entries(fields).map(([key, data]: [string, any]) => {
    let expected = 'Must be clearly legible';
    if (key === 'mrp') expected = 'Must include ₹ or Rs';
    if (key === 'net_quantity') expected = 'Must include standard metric units';
    if (key === 'mfg_date') expected = 'Must include Month/Year';
    
    return {
      label: key.replace(/_/g, ' ').toUpperCase(),
      value: data.value,
      expected
    };
  });

  // Extract filename safely handling multiple files joined by commas
  let filename = '';
  if (backendData.filename) {
    filename = backendData.filename.split(',')[0].trim() || backendData.filename;
  }
  
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
  const imageUrl = filename ? `${apiBase}/uploads/${filename}` : '/mock/biscuits.jpg';

  return {
    id: backendData.scan_id || backendData.id || String(Date.now()),
    timestamp: backendData.timestamp || new Date().toISOString(),
    productName,
    manufacturer,
    category: 'Packaged Commodity',
    status,
    score,
    imageFront: imageUrl,
    violations,
    toxicityFlags,
    toxicityScore,
    carbonFootprint,
    location: { lat: 19.0760, lng: 72.8777, district: "Mumbai" }, // Default mock location
    extractedData,
    aiAnalysis: backendData.ai_analysis ? {
      executiveSummary: backendData.ai_analysis.executive_summary,
      correctiveActions: backendData.ai_analysis.corrective_actions
    } : undefined,
  };
}
