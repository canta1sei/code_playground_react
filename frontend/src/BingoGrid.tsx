import React, { forwardRef } from 'react'; // forwardRefをインポート
import { SongCard } from './SongCard';
import type { Song } from './App';

// 型定義

interface Props {
  songs: Song[];
  isEditing: boolean;
  onEditCell: (id: string) => void;
}

// forwardRefを使ってrefを受け取れるようにする
const BingoGrid = forwardRef<HTMLDivElement, Props>(({ songs, isEditing, onEditCell }, ref) => {
  return (
    // ▼④枠の間隔を狭めるため gap-1 に変更
    <div ref={ref} className="grid grid-cols-5 gap-1 text-center bingo-grid"> {/* refをdivにアタッチ */}
      {songs.map((song) => (
        <div key={song.id} onClick={() => !song.isFreeSpot && isEditing && onEditCell(song.id)}>
          <SongCard 
            song={song} 
            isEditing={isEditing} 
          />
        </div>
      ))}
    </div>
  );
});

export default BingoGrid;