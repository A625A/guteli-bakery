export function validateStorageKey(key: string) {
  if (
    typeof key !== 'string' ||
    !key ||
    Buffer.byteLength(key, 'utf8') > 600 ||
    key.includes('\\') ||
    key.includes('\0') ||
    /^[A-Za-z]:/.test(key) ||
    key.split('/').some((part) => !part || part === '.' || part === '..')
  )
    throw new Error('Invalid storage key.');
  return key;
}

export function storagePublicUrl(key: string) {
  validateStorageKey(key);
  return `/api/media/${key.split('/').map(encodeURIComponent).join('/')}`;
}
