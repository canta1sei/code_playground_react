import { useState, useMemo } from 'react';
import styles from './SongSelectionModal.module.css';

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
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2>曲を選択</h2>
          <button onClick={onClose} className={styles.closeButton}>&times;</button>
        </div>
        <input
          type="text"
          placeholder="曲名を検索..."
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <ul className={styles.songList}>
          {filteredSongs.map((song) => (
            <li 
              key={song.songId} 
              className={styles.songItem}
              onClick={() => handleSelect(song)}
              // Disable selecting a song if it's already on the card
              style={{ 
                cursor: currentSongIds.has(song.songId) ? 'not-allowed' : 'pointer',
                opacity: currentSongIds.has(song.songId) ? 0.5 : 1
              }}
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
