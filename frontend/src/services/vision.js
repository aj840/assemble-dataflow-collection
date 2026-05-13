/**
 * vision.js — Image scan service
 * Calls our own backend /api/vision endpoint, which securely calls Cohere.
 * The API key is NEVER stored in frontend code.
 */

const BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000');

/**
 * Sends an image to our backend, which calls Cohere Command-A Vision
 * and returns extracted production plan rows.
 */
export async function extractPlanDataFromImage(imageFile) {
  const formData = new FormData();
  formData.append('image', imageFile);

  const res = await fetch(`${BASE_URL}/api/vision/extract`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    const msg = errData?.message || `Vision API error ${res.status}`;
    throw new Error(msg);
  }

  const data = await res.json();
  return data.rows || [];
}
