import { apiClient } from './apiClient';

export async function getMachinesByUser(userId) {
  if (!userId) throw new Error('userId is required');
  const res = await apiClient.get(`/get-machines-byuser/${encodeURIComponent(userId)}`);
  // Normalize various backend shapes
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.machines)) return res.machines;
  if (Array.isArray(res?.data?.machines)) return res.data.machines;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}


