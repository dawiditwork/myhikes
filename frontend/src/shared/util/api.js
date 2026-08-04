export const API_URL = (process.env.REACT_APP_API_URL || 'http://localhost:5000').replace(/\/$/, '');

export const getAssetUrl = value => {
  if (!value || value === 'uploads/images/default-avatar.png') {
    return `${process.env.PUBLIC_URL || ''}/matterhorn_6022774.png`;
  }
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return `${API_URL}/${value.replace(/^\/+/, '')}`;
};
