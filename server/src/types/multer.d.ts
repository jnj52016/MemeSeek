declare module 'multer' {
  type MulterFile = {
    mimetype: string;
    originalname: string;
  };

  type Callback = (error: Error | null, value: string) => void;

  type DiskStorageOptions = {
    destination: (
      request: unknown,
      file: MulterFile,
      callback: Callback,
    ) => void;
    filename: (
      request: unknown,
      file: MulterFile,
      callback: Callback,
    ) => void;
  };

  export function diskStorage(options: DiskStorageOptions): unknown;
}
