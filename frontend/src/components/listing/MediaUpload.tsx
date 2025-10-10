import { useState, useRef } from 'react';

interface MediaUploadProps {
  onUpload: (files: File[], type: 'images' | 'videos') => void;
  existingImages: string[];
  existingVideos: string[];
  uploading?: boolean;
  uploadProgress?: number;
}

export default function MediaUpload({ onUpload, existingImages, existingVideos, uploading = false, uploadProgress = 0 }: MediaUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        if (file.size <= 50 * 1024 * 1024) { // 50MB limit
          validFiles.push(file);
        } else {
          alert(`${file.name} is too large. Maximum file size is 50MB.`);
        }
      } else {
        alert(`${file.name} is not a supported file type. Please upload images or videos.`);
      }
    });

    if (validFiles.length > 0) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
      const images = validFiles.filter(f => f.type.startsWith('image/'));
      const videos = validFiles.filter(f => f.type.startsWith('video/'));
      
      if (images.length > 0) onUpload(images, 'images');
      if (videos.length > 0) onUpload(videos, 'videos');
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeMedia = (url: string, type: 'images' | 'videos') => {
    // This would be handled by parent component for existing media
    console.log('Remove media:', url, type);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-6 text-center ${
          dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*"
          onChange={handleFileInput}
          className="hidden"
        />
        
        <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48">
          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        
        <div className="text-gray-600">
          <p className="text-lg font-medium mb-2">Upload Photos & Videos</p>
          <p className="text-sm">
            Drag and drop files here, or{' '}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              browse
            </button>
          </p>
          <p className="text-xs text-gray-500 mt-2">
            Supports: JPG, PNG, WebP, MP4, MOV (Max 50MB per file)
          </p>
        </div>
      </div>

      {/* Selected Files Preview */}
      {selectedFiles.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Selected Files ({selectedFiles.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {selectedFiles.map((file, index) => (
              <div key={index} className="relative group">
                {file.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                    className="w-full h-24 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                  {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                </div>
                {index === 0 && file.type.startsWith('image/') && (
                  <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Main
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Images */}
      {existingImages.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Images ({existingImages.length})</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {existingImages.map((url, index) => (
              <div key={index} className="relative group">
                <img
                  src={url}
                  alt={`Upload ${index + 1}`}
                  className="w-full h-24 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => removeMedia(url, 'images')}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
                {index === 0 && (
                  <div className="absolute bottom-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                    Main
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Existing Videos */}
      {existingVideos.length > 0 && (
        <div>
          <h4 className="font-medium text-gray-900 mb-3">Videos ({existingVideos.length})</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {existingVideos.map((url, index) => (
              <div key={index} className="relative group">
                <video
                  src={url}
                  className="w-full h-32 object-cover rounded-lg"
                  controls={false}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <svg className="h-8 w-8 text-white bg-black bg-opacity-50 rounded-full p-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <button
                  type="button"
                  onClick={() => removeMedia(url, 'videos')}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Guidelines */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">Photo Guidelines</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• First image will be used as the main listing photo</li>
          <li>• Include exterior shots from multiple angles</li>
          <li>• Show interior spaces, engine compartment, and electronics</li>
          <li>• Highlight unique features and recent upgrades</li>
          <li>• Use good lighting and avoid blurry images</li>
        </ul>
      </div>
    </div>
  );
}
