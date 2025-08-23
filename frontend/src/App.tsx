import { useState, useRef, useEffect } from 'react';
import styles from './App.module.css';
import html2canvas from 'html2canvas';
import SongSelectionModal from './SongSelectionModal';
import BingoGrid from './BingoGrid';

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
  
  // ドラッグ＆ドロップ用のstate
  const draggedItem = useRef<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // モーダル用のstate
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

  // 初期ロード時に全曲リストを取得
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

  // ドラッグ＆ドロップのハンドラ
  const handleDragStart = (index: number) => {
    draggedItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    if (draggedItem.current !== null && draggedItem.current !== index) {
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };
  
  const handleDragEnd = () => {
    draggedItem.current = null;
    setDragOverIndex(null);
  }

  const handleDrop = (targetIndex: number) => {
    if (draggedItem.current === null) return;

    const sourceIndex = draggedItem.current;
    if (sourceIndex !== targetIndex) {
      const newSongs = [...songs];
      // 要素を入れ替え
      const sourceItem = newSongs[sourceIndex];
      newSongs[sourceIndex] = newSongs[targetIndex];
      newSongs[targetIndex] = sourceItem;
      setSongs(newSongs);
    }
    // クリーンアップ
    draggedItem.current = null;
    setDragOverIndex(null);
  };

  const handleDownloadImage = async () => {
    if (!gridRef.current) return;
    setIsEditing(false); // 編集中のスタイルがキャプチャされないようにする
    await new Promise(resolve => setTimeout(resolve, 500)); // 再レンダリングを待つ

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
            <BingoGrid
              ref={gridRef}
              songs={songs}
              isEditing={isEditing}
              dragOverIndex={dragOverIndex}
              handleEditCell={handleEditCell}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragLeave={handleDragLeave}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
            />
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