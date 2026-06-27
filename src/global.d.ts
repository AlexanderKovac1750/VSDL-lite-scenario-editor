interface Window {
  showSaveFilePicker?: (options?: SaveFilePickerOptions) => Promise<FileSystemFileHandle>;
}

interface FileSystemFileHandle {
  createWritable: (options?: FileSystemCreateWritableOptions | undefined) => Promise<FileSystemWritableFileStream>;
}

interface FileSystemWritableFileStream {
  write: (data: FileSystemWriteChunkType) => Promise<void>;
  close: () => Promise<void>;
}

interface SaveFilePickerOptions {
  suggestedName?: string;
  types?: {
    description?: string;
    accept: Record<string, string[]>;
  }[];
}