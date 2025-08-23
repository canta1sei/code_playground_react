import { forwardRef } from 'react';
import type { DragEvent } from 'react';
import styles from './BingoGrid.module.css';

// 型定義
type Song = {
  songId: string;
  title: string;
};

interface Props {
  songs: Song[];
  isEditing: boolean;
  dragOverIndex: number | null;
  handleEditCell: (index: number) => void;
  handleDragStart: (index: number) => void;
  handleDragEnter: (index: number) => void;
  handleDragLeave: () => void;
  handleDrop: (targetIndex: number) => void;
  handleDragEnd: () => void;
}

const BingoGrid = forwardRef<HTMLDivElement, Props>((
  { 
    songs, 
    isEditing, 
    dragOverIndex, 
    handleEditCell, 
    handleDragStart, 
    handleDragEnter, 
    handleDragLeave, 
    handleDrop, 
    handleDragEnd 
  }, 
  ref
) => {
  return (
    <div className={styles.bingoGrid} ref={ref}>
      {songs.map((song, index) => {
        const isFreeSpot = song.songId === 'FREE_SPOT';
        const isDragOver = dragOverIndex === index;
        
        const cellContent = (
          <div 
            className={`${styles.bingoCell} ${isFreeSpot ? styles.freeSpot : ''}`}>
            {song.title}
          </div>
        );

        if (isEditing && !isFreeSpot) {
          return (
            <div 
              key={song.songId}
              className={isDragOver ? styles.draggingOver : ''}
              onDragEnter={() => handleDragEnter(index)}
              onDragLeave={handleDragLeave}
              onDrop={() => handleDrop(index)}
              onDragOver={(e: DragEvent<HTMLDivElement>) => e.preventDefault()}
            >
              <button 
                className={styles.editableCell} 
                onClick={() => handleEditCell(index)}
                draggable={true}
                onDragStart={() => handleDragStart(index)}
                onDragEnd={handleDragEnd}
              >
                {cellContent}
              </button>
            </div>
          )
        }
        return <div key={song.songId}>{cellContent}</div>;
      })}
    </div>
  );
});

export default BingoGrid;
