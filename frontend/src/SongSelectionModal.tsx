import { useState, useMemo } from 'react';

// 型定義
type Song = {
  songId: string;
  title: string;
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  songs: Song[];
  onSelectSong: (song: Song) => void;
  currentSongs: Song[]; // 現在カードにある曲
}

const SongSelectionModal = ({ isOpen, onClose, songs, onSelectSong, currentSongs }: Props) => {
  const [searchTerm, setSearchTerm] = useState('');

  const currentSongIds = useMemo(() => new Set(currentSongs.map(s => s.songId)), [currentSongs]);

  const filteredSongs = useMemo(() => 
    songs.filter(song => 
      song.title.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
    [songs, searchTerm]
  );

  if (!isOpen) {
    return null;
  }

  const handleSelect = (song: Song) => {
    if (currentSongIds.has(song.songId)) {
      alert('この曲はすでにカード上にあります。');
      return;
    }
    onSelectSong(song);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-lg p-6 w-11/12 max-w-md max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-800">曲を選択</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl leading-none">&times;</button>
        </div>
        <input
          type="text"
          placeholder="曲名を検索..."
          className="w-full p-2 mb-4 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-pink-400"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className="flex-grow overflow-y-auto border border-gray-200 rounded-md">
          {filteredSongs.map((song) => (
            <li 
              key={song.songId} 
              className={`p-3 border-b border-gray-200 last:border-b-0 cursor-pointer hover:bg-pink-50 ${currentSongIds.has(song.songId) ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={() => handleSelect(song)}
            >
              {song.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default SongSelectionModal;