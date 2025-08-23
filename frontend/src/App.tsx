import { useState, useRef, useEffect } from 'react';
import styles from './App.module.css';
import html2canvas from 'html2canvas';
import SongSelectionModal from './SongSelectionModal'; // Import the modal component

// 曲データの型を定義
type Song = {
  songId: string;
  title: string;
};

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

  // Fetch all songs on initial load
  useEffect(() => {
    const fetchAllSongs = async () => {
      if (!API_BASE_URL) return;
      try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) {
          throw new Error('Failed to fetch all songs');
        }
        const data: Song[] = await response.json();
        setAllSongs(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load song list.');
      }
    };
    fetchAllSongs();
  }, [API_BASE_URL]);

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSongs([]);
    setIsEditing(false);

    try {
      const response = await fetch(`${API_BASE_URL}/generate-card`, { method: 'POST' });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'API request failed' }));
        throw new Error(errorData.message);
      }
      const fetchedSongs: Song[] = await response.json();
      
      const freeSpot: Song = { songId: 'FREE_SPOT', title: 'FREE' };
      const newSongs = [
        ...fetchedSongs.slice(0, 12),
        freeSpot,
        ...fetchedSongs.slice(12)
      ];
      setSongs(newSongs);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCell = (index: number) => {
    if (isEditing) {
      setEditingIndex(index);
      setIsModalOpen(true);
    }
  };

  const handleSelectSong = (newSong: Song) => {
    if (editingIndex !== null) {
      const newSongs = [...songs];
      newSongs[editingIndex] = newSong;
      setSongs(newSongs);
    }
    setIsModalOpen(false);
    setEditingIndex(null);
  };

  const handleDownloadImage = async () => {
    if (!gridRef.current) return;
    setIsEditing(false); // Ensure edit styles are not captured
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for re-render

    const canvas = await html2canvas(gridRef.current);
    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = 'bingo-card.png';
    link.click();
  };

  const handleShare = () => {
    const text = encodeURIComponent('ももクロちゃんのビンゴカードで遊んでるよ！');
    const hashtags = encodeURIComponent('ももクロビンゴ,ももいろクローバーZ');
    const url = `https://twitter.com/intent/tweet?text=${text}&hashtags=${hashtags}`;
    window.open(url, '_blank');
  };

  return (
    <div className={styles.appContainer}>
      <header>
        <h1>ももクロ ビンゴカードジェネレーター</h1>
        <button onClick={handleGenerate} disabled={isLoading} className={styles.generateButton}>
          {isLoading ? '生成中...' : 'ビンゴカードを生成！'}
        </button>
      </header>
      <main>
        {error && <p className={styles.errorMessage}>エラー: {error}</p>}
        {songs.length > 0 && (
          <>
            <div className={styles.bingoGrid} ref={gridRef}>
              {songs.map((song, index) => {
                const isFreeSpot = song.songId === 'FREE_SPOT';
                const cellContent = (
                  <div 
                    className={`${styles.bingoCell} ${isFreeSpot ? styles.freeSpot : ''}`}>
                    {song.title}
                  </div>
                );

                if (isEditing && !isFreeSpot) {
                  return (
                    <button key={song.songId} className={styles.editableCell} onClick={() => handleEditCell(index)}>
                      {cellContent}
                    </button>
                  )
                }
                return <div key={song.songId}>{cellContent}</div>;
              })}
            </div>
            <div className={styles.actionsContainer}>
              <button onClick={handleDownloadImage} className={styles.downloadButton}>
                画像をダウンロード
              </button>
              <button onClick={handleShare} className={styles.shareButton}>
                Twitterでシェア
              </button>
              <button onClick={() => setIsEditing(!isEditing)} className={styles.editButton}>
                {isEditing ? '完了' : '編集'}
              </button>
            </div>
          </>
        )}
      </main>
      <SongSelectionModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        songs={allSongs}
        onSelectSong={handleSelectSong}
        currentSongs={songs}
      />
    </div>
  );
}

export default App;
