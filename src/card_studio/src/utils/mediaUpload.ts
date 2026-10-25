export interface UploadBatchProgress {
  completed: number;
  total: number;
  currentFileName: string;
}

export async function uploadMediaFile(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('file', file, file.name);
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      body: formData,
    });
    if (res.ok) {
      const json = await res.json();
      if (json && json.url) {
        return json.url;
      }
    }
  } catch {
    // Fallback below
  }

  return new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(typeof reader.result === 'string' ? reader.result : URL.createObjectURL(file));
    };
    reader.onerror = () => {
      resolve(URL.createObjectURL(file));
    };
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFilesBatch(
  files: File[],
  onProgress?: (progress: UploadBatchProgress) => void,
  concurrency: number = 4
): Promise<Array<{ file: File; url: string }>> {
  const results: Array<{ file: File; url: string }> = new Array(files.length);
  let completed = 0;
  let currentIndex = 0;

  const worker = async () => {
    while (currentIndex < files.length) {
      const idx = currentIndex++;
      const file = files[idx];
      onProgress?.({
        completed,
        total: files.length,
        currentFileName: file.name,
      });
      const url = await uploadMediaFile(file);
      results[idx] = { file, url };
      completed++;
      onProgress?.({
        completed,
        total: files.length,
        currentFileName: file.name,
      });
    }
  };

  const workers = Array.from(
    { length: Math.min(concurrency, Math.max(1, files.length)) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}
