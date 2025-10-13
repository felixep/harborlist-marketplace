import { useState, useRef, useEffect } from 'react';

interface MediaItem {
  id: string;
  type: 'file' | 'existing';
  file?: File;
  url?: string;
  isMain?: boolean;
}

interface MediaUploadProps {
  onUpload: (files: File[], type: 'images' | 'videos') => void;
  existingImages: string[];
  existingVideos: string[];
  uploading?: boolean;
  uploadProgress?: number;
}

export default function MediaUpload({ onUpload, existingImages, existingVideos, uploading = false, uploadProgress = 0 }: MediaUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_IMAGES = 10;

  // Initialize media items from existing images
  useEffect(() => {
    const existingItems: MediaItem[] = existingImages.map((url, index) => ({
      id: `existing-${index}`,
      type: 'existing',
      url,
      isMain: index === 0
    }));
    setMediaItems(existingItems);
  }, [existingImages]);

  const handleFiles = (files: FileList) => {
    const validFiles: File[] = [];
    const currentImageCount = mediaItems.filter(item => 
      item.type === 'file' ? item.file?.type.startsWith('image/') : true
    ).length;
    
    Array.from(files).forEach(file => {
      if (file.type.startsWith('image/')) {
        if (currentImageCount + validFiles.filter(f => f.type.startsWith('image/')).length >= MAX_IMAGES) {
          alert(`Maximum ${MAX_IMAGES} images allowed. Please remove some images first.`);
          return;
        }
        if (file.size <= 50 * 1024 * 1024) { // 50MB limit
          validFiles.push(file);
        } else {
          alert(`${file.name} is too large. Maximum file size is 50MB.`);
        }
      } else if (file.type.startsWith('video/')) {
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
      const newMediaItems: MediaItem[] = validFiles.map((file, index) => ({
        id: `file-${Date.now()}-${index}`,
        type: 'file',
        file,
        isMain: mediaItems.length === 0 && index === 0 && file.type.startsWith('image/')
      }));

      setMediaItems(prev => [...prev, ...newMediaItems]);
      
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

  const handleFileDrop = (e: React.DragEvent) => {
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

  const removeMediaItem = (id: string) => {
    setMediaItems(prev => {
      const filtered = prev.filter(item => item.id !== id);
      // If we removed the main image, make the first remaining image the main
      if (filtered.length > 0 && !filtered.some(item => item.isMain)) {
        const firstImage = filtered.find(item => 
          item.type === 'file' ? item.file?.type.startsWith('image/') : true
        );
        if (firstImage) {
          firstImage.isMain = true;
        }
      }
      return filtered;
    });
  };

  const setAsMain = (id: string) => {
    setMediaItems(prev => prev.map(item => ({
      ...item,
      isMain: item.id === id
    })));
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleReorderDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    setMediaItems(prev => {
      const newItems = [...prev];
      const draggedItem = newItems[draggedIndex];
      newItems.splice(draggedIndex, 1);
      newItems.splice(dropIndex, 0, draggedItem);
      return newItems;
    });
    
    setDraggedIndex(null);
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
        onDrop={handleFileDrop}
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

      {/* Media Gallery */}
      {mediaItems.length > 0 && (
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="font-medium text-gray-900">
              Images ({mediaItems.filter(item => item.type === 'file' ? item.file?.type.startsWith('image/') : true).length}/{MAX_IMAGES})
            </h4>
            <p className="text-sm text-gray-500">Drag to reorder</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {mediaItems.map((item, index) => {
              const isImage = item.type === 'file' ? item.file?.type.startsWith('image/') : true;
              if (!isImage) return null;
              
              return (
                <div 
                  key={item.id} 
                  className="relative group cursor-move"
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleReorderDrop(e, index)}
                >
                  {item.type === 'file' && item.file ? (
                    <img
                      src={URL.createObjectURL(item.file)}
                      alt={item.file.name}
                      className="w-full h-24 object-cover rounded-lg border-2 border-transparent hover:border-blue-300 transition-colors"
                    />
                  ) : (
                    <img
                      src={item.url}
                      alt={`Image ${index + 1}`}
                      className="w-full h-24 object-cover rounded-lg border-2 border-transparent hover:border-blue-300 transition-colors"
                    />
                  )}
                  
                  {/* Remove button */}
                  <button
                    type="button"
                    onClick={() => removeMediaItem(item.id)}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ×
                  </button>
                  
                  {/* File name for new uploads */}
                  {item.type === 'file' && item.file && (
                    <div className="absolute bottom-1 left-1 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                      {item.file.name.length > 15 ? `${item.file.name.substring(0, 15)}...` : item.file.name}
                    </div>
                  )}
                  
                  {/* Main image indicator */}
                  {item.isMain && (
                    <div className="absolute top-1 left-1 bg-blue-500 text-white text-xs px-2 py-1 rounded">
                      Main
                    </div>
                  )}
                  
                  {/* Set as main button */}
                  {!item.isMain && (
                    <button
                      type="button"
                      onClick={() => setAsMain(item.id)}
                      className="absolute bottom-1 right-1 bg-gray-800 bg-opacity-75 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      Set as Main
                    </button>
                  )}
                  
                  {/* Drag handle */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-white bg-black bg-opacity-50 rounded p-1" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                    </svg>
                  </div>
                </div>
              );
            })}
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
                  onClick={() => console.log('Remove video:', url)}
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
          <li>• Maximum {MAX_IMAGES} images allowed</li>
          <li>• Drag images to reorder them</li>
          <li>• Click "Set as Main" to choose your primary listing photo</li>
          <li>• Include exterior shots from multiple angles</li>
          <li>• Show interior spaces, engine compartment, and electronics</li>
          <li>• Use good lighting and avoid blurry images</li>
        </ul>
      </div>
    </div>
  );
}
