import { apiClient } from './apiClient';

// GET /get-all-tasks/:workerId
export async function getTasksByWorker(workerId) {
  if (!workerId) throw new Error('workerId is required');
  const res = await apiClient.get(`/get-all-tasks/${encodeURIComponent(workerId)}`);
  // Normalize shapes: array, {tasks: []}, {data: []}, {data: {tasks: []}}
  if (Array.isArray(res)) return res;
  // API returns { success, workerId, history: [...] }
  if (Array.isArray(res?.history)) return res.history;
  if (Array.isArray(res?.tasks)) return res.tasks;
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res?.data?.tasks)) return res.data.tasks;
  return [];
}

// Start a task history record
export async function updateTaskHistory(historyId, details) {
  if (!historyId) throw new Error('historyId is required');
  
  console.log('=== updateTaskHistory API Call ===');
  console.log('[TaskService] History ID:', historyId);
  console.log('[TaskService] Details received:', details);
  
  const payload = { details: { ...details } };
  console.log('[TaskService] Payload to send:', JSON.stringify(payload, null, 2));
  console.log('[TaskService] API Endpoint:', `/updateTaskHistory/${encodeURIComponent(historyId)}`);
  console.log('[TaskService] Full URL will be:', `https://backendaimaintenance.deepvox.ai/api/v1/updateTaskHistory/${encodeURIComponent(historyId)}`);
  
  // Validate payload before sending
  console.log('[TaskService] Payload validation:');
  console.log('[TaskService] - status:', payload.details.status);
  console.log('[TaskService] - startTime:', payload.details.startTime);
  console.log('[TaskService] - endTime:', payload.details.endTime);
  console.log('[TaskService] - note:', payload.details.note);
  console.log('[TaskService] - voiceText:', payload.details.voiceText);
  console.log('[TaskService] - image:', payload.details.image);
  console.log('[TaskService] - image type:', typeof payload.details.image);
  console.log('[TaskService] - image length:', payload.details.image?.length || 0);
  
  try {
    console.log('[TaskService] Making API call...');
    const result = await apiClient.put(`/updateTaskHistory/${encodeURIComponent(historyId)}`, payload);
    
    console.log('[TaskService] ===== API RESPONSE RECEIVED =====');
    console.log('[TaskService] Response type:', typeof result);
    console.log('[TaskService] Response keys:', Object.keys(result || {}));
    console.log('[TaskService] Full response:', JSON.stringify(result, null, 2));
    
    // Check if response indicates success
    if (result?.success === true) {
      console.log('[TaskService] ✅ API returned success: true');
    } else if (result?.success === false) {
      console.log('[TaskService] ❌ API returned success: false');
      console.log('[TaskService] Error message:', result?.message);
    } else {
      console.log('[TaskService] ⚠️ API response has no success field');
    }
    
    console.log('=== END updateTaskHistory API Call ===');
    return result;
  } catch (error) {
    console.error('=== updateTaskHistory API Error ===');
    console.error('[TaskService] Error type:', typeof error);
    console.error('[TaskService] Error message:', error.message);
    console.error('[TaskService] Error status:', error.status);
    console.error('[TaskService] Error response:', error.response);
    console.error('[TaskService] Error data:', error.data);
    console.error('[TaskService] Full error object:', JSON.stringify(error, null, 2));
    console.error('=== END updateTaskHistory API Error ===');
    throw error;
  }
}


