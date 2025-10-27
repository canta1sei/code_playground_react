
import { useState, useMemo } from 'react';
import type { Song } from './types';

// App.tsxと型定義を合わせる

interface Props {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  onSelectSong: (song: Song) => void;
  currentSongs: Song[];
}

function SongSelectionModal({ isOpen, onClose, songs, onSelectSong, currentSongs }: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const currentSongIds = useMemo(() => new Set(currentSongs.map(s => s.songId)), [currentSongs]);

  const filteredSongs = useMemo(() => 
    songs.filter(song => 
      song.title.toLowerCase().includes(searchTerm.toLowerCase())
    )
  , [songs, searchTerm]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">曲を選択</h2>
          <input
            type="text"
            placeholder="曲名を検索..."
            className="w-full mt-2 p-2 border rounded-lg"
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="overflow-y-auto p-4">
          <ul className="space-y-2">
            {filteredSongs.map(song => {
              const isSelected = currentSongIds.has(song.songId);
              return (
                <li key={song.songId}>
                  <button
                    onClick={() => onSelectSong(song)}
                    disabled={isSelected}
                    className={`w-full text-left p-3 rounded-lg transition-colors duration-200 ${isSelected ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'hover:bg-pink-100'}`}>
                    {song.title}
                  </button>
                </li>
              )
            })}
          </ul>
        </div>
        <div className="p-4 border-t text-right">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default SongSelectionModal;
