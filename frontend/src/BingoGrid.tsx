import { SongCard } from './SongCard';
import type { Song } from './types';

// 型定義

interface Props {
  songs: Song[];
  isEditing: boolean;
  onEditCell: (id: string) => void;
}

const BingoGrid = ({ songs, isEditing, onEditCell }: Props) => {
  // isEditingの状態に応じてクラス名を動的に変更
  const gridClassName = `grid grid-cols-5 gap-1 text-center bingo-grid ${isEditing ? 'is-editing' : ''}`;

  return (
    <div className={gridClassName}>
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
