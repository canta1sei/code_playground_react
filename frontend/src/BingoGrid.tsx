
import { SongCard } from './SongCard';
import type { Song } from './App';

// 型定義

interface Props {
  songs: Song[];
  isEditing: boolean;
  onEditCell: (id: string) => void;
}

const BingoGrid = ({ songs, isEditing, onEditCell }: Props) => {
  return (
    <div className="grid grid-cols-5 gap-2 text-center bingo-grid">
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
};

export default BingoGrid;
