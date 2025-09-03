
import { forwardRef } from 'react';
import { SongCard } from './SongCard';

// 型定義
type Song = {
  id: string;
  title: string;
  color: 'pink' | 'red' | 'yellow' | 'purple' | 'green';
  isFreeSpot?: boolean;
};

interface Props {
  songs: Song[];
  isEditing: boolean;
  onEditCell: (id: string) => void;
}

const BingoGrid = forwardRef<HTMLDivElement, Props>(({ songs, isEditing, onEditCell }, ref) => {
  return (
    <div className="grid grid-cols-5 gap-1 text-center bingo-grid" ref={ref}>
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
