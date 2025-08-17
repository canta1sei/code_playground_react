import { useState, useRef } from 'react';
import styles from './App.module.css';
import html2canvas from 'html2canvas';

// 曲データの型を定義
type Song = {
  songId: string;
  title: string;
};

function App() {
  const [songs, setSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const API_ENDPOINT = 'https://17niea8rge.execute-api.ap-northeast-1.amazonaws.com/generate-card';

  const handleGenerate = async () => {
    setIsLoading(true);
    setError(null);
    setSongs([]);

    try {
      const response = await fetch(API_ENDPOINT, { method: 'POST' });
      if (!response.ok) {
        throw new Error('API request failed');
      }
      const data: Song[] = await response.json();
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadImage = async () => {
    if (!gridRef.current) return;

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
              {songs.map((song) => (
                <div key={song.songId} className={styles.bingoCell}>
                  {song.title}
                </div>
              ))}
            </div>
            <div className={styles.actionsContainer}>
              <button onClick={handleDownloadImage} className={styles.downloadButton}>
                画像をダウンロード
              </button>
              <button onClick={handleShare} className={styles.shareButton}>
                Twitterでシェア
              </button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
