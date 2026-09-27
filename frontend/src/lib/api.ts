import { useAppStore } from '../context/store';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const TIMEOUT_MS = 90000; // 90 seconds to account for EasyOCR model loading

// Helper to get headers with RBAC and JWT
const getHeaders = (extraHeaders: Record<string, string> = {}) => {
  const { role, token } = useAppStore.getState();
  const headers: Record<string, string> = {
    'X-User-Role': role,
    ...extraHeaders
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
};

export async function uploadScan(
  frontImage: File,
  backImage?: File,
  packageShape: string = 'rectangular',
  enableAi: boolean = true
) {
  const formData = new FormData();
  formData.append('images', frontImage);
  if (backImage) {
    formData.append('images', backImage);
  }
  formData.append('package_shape', packageShape);
  formData.append('enable_ai', String(enableAi));

  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE_URL}/scan/`, {
      method: 'POST',
      headers: getHeaders(),
      body: formData,
      signal: controller.signal,
    });
    
    clearTimeout(id);

    if (response.status === 429) {
      throw new Error('Too many requests. Please slow down.');
    }

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to upload scan');
    }

    return await response.json();
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error('Request timed out. Please check your internet connection.');
    }
    throw error;
  }
}

export async function fetchLogs() {
  const response = await fetch(`${API_BASE_URL}/logs/`, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch logs');
  }
  return response.json();
}

export async function getReportPdf(scanId: string) {
  const response = await fetch(`${API_BASE_URL}/report/${scanId}`, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to generate report');
  }
  return response.json();
}

export async function fetchNotices() {
  const response = await fetch(`${API_BASE_URL}/notices/`, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch notices');
  }
  return response.json();
}

export async function issueNotice(scanId: string, payload: any) {
  const response = await fetch(`${API_BASE_URL}/notices/${scanId}`, {
    method: 'POST',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error('Failed to issue notice');
  }
  return response.json();
}

export async function updateNoticeStatus(noticeId: string, status: string) {
  const response = await fetch(`${API_BASE_URL}/notices/${noticeId}/status`, {
    method: 'PUT',
    headers: getHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ status }),
  });
  if (!response.ok) {
    throw new Error('Failed to update notice status');
  }
  return response.json();
}

// Utility to convert base64 data URL to a File object
export async function getIngredientAlternatives(ingredient: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/ingredients/alternatives?ingredient=${encodeURIComponent(ingredient)}`, {
    headers: getHeaders()
  });
  if (!response.ok) {
    throw new Error('Failed to fetch alternatives');
  }
  return response.json();
}

export function dataURLtoFile(dataurl: string, filename: string): File {
  const arr = dataurl.split(',');
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

export async function loginApi(email: string, password: string) {
  const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || 'Login failed');
  }
  return response.json();
}
