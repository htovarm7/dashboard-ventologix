import { useState } from "react";

const URL_API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface PhotoUploadResult {
  success: boolean;
  message?: string;
  uploaded_files?: any;
  error?: string;
}

export type UploadStatus = "idle" | "uploading" | "success" | "error";

export const usePhotoUpload = () => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{
    [key: string]: number;
  }>({});
  const [uploadStatus, setUploadStatus] = useState<{
    [key: string]: UploadStatus;
  }>({});

  const uploadPhotos = async (
    folio: string,
    clientName: string,
    category: string,
    files: File[],
  ): Promise<PhotoUploadResult> => {
    if (!files || files.length === 0) {
      console.warn(`⚠️ No files to upload for category: ${category}`);
      return {
        success: false,
        error: "No files selected",
      };
    }

    console.log(
      `📸 Starting upload for ${files.length} file(s) in category: ${category}`
    );
    setUploading(true);
    setUploadProgress((prev) => ({ ...prev, [category]: 0 }));
    setUploadStatus((prev) => ({ ...prev, [category]: "uploading" }));

    try {
      const formData = new FormData();
      formData.append("folio", folio);
      formData.append("client_name", clientName);
      formData.append("category", category);

      // Add all files
      files.forEach((file, index) => {
        console.log(
          `  📄 Adding file ${index + 1}: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`
        );
        formData.append("files", file);
      });

      console.log(
        `🚀 Sending POST request to ${URL_API}/reporte_mtto/upload-photos`
      );
      const response = await fetch(`${URL_API}/reporte_mtto/upload-photos`, {
        method: "POST",
        body: formData,
      });

      console.log(`📥 Response status: ${response.status} ${response.statusText}`);

      const result = await response.json();

      console.log(`📋 Response data:`, result);

      if (result.success) {
        console.log(
          `✅ Upload successful for ${category}:`,
          result.uploaded_files
        );
        setUploadProgress((prev) => ({ ...prev, [category]: 100 }));
        setUploadStatus((prev) => ({ ...prev, [category]: "success" }));
        return result;
      } else {
        const errorMsg = result.error || "Upload failed";
        console.error(`❌ Upload failed: ${errorMsg}`);
        throw new Error(errorMsg);
      }
    } catch (error) {
      const errorMsg =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`❌ Error uploading photos for ${category}:`, error);
      setUploadStatus((prev) => ({ ...prev, [category]: "error" }));
      return {
        success: false,
        error: errorMsg,
      };
    } finally {
      setUploading(false);
    }
  };

  const uploadPhotosByCategory = async (
    folio: string,
    clientName: string,
    photosByCategory: { [category: string]: File[] },
  ): Promise<{ [category: string]: PhotoUploadResult }> => {
    const results: { [category: string]: PhotoUploadResult } = {};

    for (const [category, files] of Object.entries(photosByCategory)) {
      if (files && files.length > 0) {
        const result = await uploadPhotos(folio, clientName, category, files);
        results[category] = result;
      }
    }

    return results;
  };

  const resetUploadStatus = (category: string) => {
    setUploadStatus((prev) => ({ ...prev, [category]: "idle" }));
    setUploadProgress((prev) => ({ ...prev, [category]: 0 }));
  };

  const resetAllUploadStatus = () => {
    setUploadStatus({});
    setUploadProgress({});
  };

  return {
    uploading,
    uploadProgress,
    uploadStatus,
    uploadPhotos,
    uploadPhotosByCategory,
    resetUploadStatus,
    resetAllUploadStatus,
  };
};

export default usePhotoUpload;
