import { forwardRef } from 'react';
import type { DragEvent } from 'react';

// 型定義
type Song = {
  songId: string;
  title: string;
  isFreeSpot?: boolean;
};

interface Props {
  songs: Song[];
  isEditing: boolean;
  dragOverIndex: number | null;
  draggingIndex: number | null; // 新しいプロパティを追加
  handleEditCell: (index: number) => void;
  handleDragStart: (index: number) => void;
  handleDragEnter: (index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (targetIndex: number) => void;
  handleDragEnd: () => void;
  // 新しいタッチイベントハンドラの追加
  handleTouchStart: (e: React.TouchEvent<HTMLButtonElement>, index: number) => void;
  handleTouchMove: (e: React.TouchEvent<HTMLButtonElement>, index: number) => void;
  handleTouchEnd: (e: React.TouchEvent<HTMLButtonElement>, index: number) => void;
  // 新しいプロパティを追加
  setCellRef: (el: HTMLButtonElement | HTMLDivElement | null, index: number) => void;
}

const BingoGrid = forwardRef<HTMLDivElement, Props>((
  { 
    songs, 
    isEditing, 
    dragOverIndex, 
    draggingIndex, // 新しいプロパティを受け取る
    handleEditCell, 
    handleDragStart, 
    handleDragEnter, 
    handleDragLeave, 
    handleDrop, 
    handleDragEnd,
    // 新しいタッチイベントハンドラを受け取る
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    // 新しいプロパティを受け取る
    setCellRef
  }, 
  ref
) => {
  return (
    <div className="grid grid-cols-5 gap-2 text-center" ref={ref}>
      {songs.map((song, index) => {
        const isFreeSpot = song.songId === 'FREE_SPOT';
        const isDragOver = dragOverIndex === index;
        const isDragging = draggingIndex === index; // ドラッグ中かどうかを判定
        
        const cellClasses = `
          aspect-square flex items-center justify-center p-1 rounded-lg text-xs md:text-base font-semibold 
          transition-transform duration-200 hover:scale-105 whitespace-normal
          ${isFreeSpot ? 'bg-pink-300 text-white shadow-lg' : 'bg-white text-pink-800 shadow'}
          ${isEditing && !isFreeSpot ? 'cursor-pointer' : ''}
          ${isDragOver ? 'border-2 border-blue-500' : ''}
          ${isDragging ? 'opacity-50 border-2 border-dashed border-blue-500' : ''} // ドラッグ中のスタイル
        `;

        const cellContent = (
          <div className="w-full h-full flex items-center justify-center overflow-hidden whitespace-nowrap text-ellipsis">
            {isFreeSpot ? (
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-pink-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ) : (
              song.title
            )}
          </div>
        );

        if (isEditing && !isFreeSpot) {
          return (
            <button 
              key={song.songId} 
              className={cellClasses}
              onClick={() => handleEditCell(index)}
              draggable={true}
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragOver={(e: DragEvent<HTMLButtonElement>) => e.preventDefault()}
              onDragEnd={handleDragEnd}
              onTouchStart={(e) => handleTouchStart(e, index)}
              onTouchMove={(e) => handleTouchMove(e, index)}
              onTouchEnd={(e) => handleTouchEnd(e, index)}
              ref={(el) => setCellRef(el, index)} // refを追加
            >
              {cellContent}
            </button>
          )
        }
        return (
          <div 
            key={song.songId} 
            className={cellClasses}
            ref={(el) => setCellRef(el, index)} // refを追加
          >
            {cellContent}
          </div>
        );
      })}
    </div>
  );
});

export default BingoGrid;