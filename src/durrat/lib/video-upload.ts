import { getDownloadURL, ref as storageRef, uploadBytesResumable } from 'firebase/storage';
import { storage } from '@/durrat/lib/firebase';

export function videoUploadErrorMessage(error: unknown) {
  const code = error && typeof error === 'object' && 'code' in error
    ? String((error as { code?: unknown }).code ?? '')
    : '';
  if (code.includes('unauthorized') || code.includes('permission-denied')) {
    return 'تعذر رفع الفيديو: صلاحية Firebase Storage لا تسمح بهذا الحساب. راجع قواعد التخزين ثم أعد المحاولة.';
  }
  if (code.includes('canceled')) return 'تم إلغاء رفع الفيديو قبل اكتماله.';
  if (code.includes('quota') || code.includes('retry-limit-exceeded')) {
    return 'تعذر إكمال رفع الفيديو بسبب الاتصال أو حد التخزين. حاول مرة أخرى.';
  }
  return 'فشل رفع الفيديو إلى التخزين، ولم يُحفظ الملف داخل بيانات العقار. يمكنك المحاولة مرة أخرى.';
}

/** Uploads the binary file to Storage and returns only the download URL. */
export function uploadPropertyVideo(
  propertyId: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<string> {
  const extension = file.name.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase() || 'mp4';
  const videoRef = storageRef(storage, `property-videos/${propertyId}/${Date.now()}.${extension}`);
  const task = uploadBytesResumable(videoRef, file, { contentType: file.type || 'video/mp4' });

  return new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (snapshot) => {
        if (!snapshot.totalBytes) return;
        onProgress(Math.min(100, Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)));
      },
      (error) => reject(error),
      () => {
        getDownloadURL(task.snapshot.ref).then(resolve).catch(reject);
      },
    );
  });
}
