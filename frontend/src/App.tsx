import { useState, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import SongSelectionModal from './SongSelectionModal';
import BingoGrid from './BingoGrid';

// 曲データの型を定義
type Song = {
  songId: string;
  title: string;
  isFreeSpot?: boolean; // フリースポットかどうかを示すプロパティを追加
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
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);

  // New state to control body scroll
  const [isDraggingActive, setIsDraggingActive] = useState(false);

  // Effect to manage body scroll
  useEffect(() => {
    if (isDraggingActive) {
      document.body.classList.add('no-scroll');
    } else {
      document.body.classList.remove('no-scroll');
    }
    // Clean up on unmount
    return () => {
      document.body.classList.remove('no-scroll');
    };
  }, [isDraggingActive]);

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
      
      const freeSpot: Song = { songId: 'FREE_SPOT', title: 'FREE', isFreeSpot: true };
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
    setDraggingIndex(index);
    setIsDraggingActive(true); // Start preventing body scroll
  };

  const handleDragEnter = (index: number) => {
    // フリースポットへのドラッグオーバーを許可しない
    if (songs[index].isFreeSpot) return;

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
    setDraggingIndex(null);
  }

  const handleDrop = (targetIndex: number) => {
    if (draggedItem.current === null) return;
    // フリースポットへのドロップを許可しない
    if (songs[targetIndex].isFreeSpot) return;

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
    setDraggingIndex(null);
  };

  const handleDownloadImage = async () => {
    if (!gridRef.current) return;
    setIsEditing(false); // 編集中のスタイルがキャプチャされないようにする
    await new Promise(resolve => setTimeout(resolve, 500)); // 再レンダリングを待つ

    const canvas = await html2canvas(gridRef.current, { backgroundColor: null }); // 背景を透明に設定
    
    // モバイル対応: 画像を新しいタブで開く
    if (/Mobi|Android/i.test(navigator.userAgent)) {
      window.open(canvas.toDataURL('image/png'), '_blank');
    } else {
      // PC対応: ダウンロードリンクを作成してクリック
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = 'bingo-card.png';
      link.click();
    }
  };

  const handleShare = () => {
    const text = encodeURIComponent('ももクロちゃんのビンゴカードで遊んでるよ！');
    const hashtags = encodeURIComponent('ももクロビンゴ,ももいろクローバーZ');
    const url = `https://twitter.com/intent/tweet?text=${text}&hashtags=${hashtags}`;
    window.open(url, '_blank');
  };

  // 各ビンゴセルのDOM要素への参照を保持
  const cellRefs = useRef<(HTMLButtonElement | HTMLDivElement | null)[]>([]);

  // タッチイベント用のstateとref
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDraggedItemIndex = useRef<number | null>(null); // ドラッグ中のアイテムのインデックス

  const handleTouchStart = (e: React.TouchEvent<HTMLButtonElement>, index: number) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    touchDraggedItemIndex.current = index;
    handleDragStart(index); // 既存のドラッグ開始ハンドラを呼び出す
    e.preventDefault(); // スクロールを防ぐ
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchDraggedItemIndex.current === null) return;

    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    let newDragOverIndex: number | null = null;

    // 各セルの位置をチェックし、タッチ座標がどのセル上にあるかを判定
    cellRefs.current.forEach((cell, index) => {
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (
          touchX >= rect.left &&
          touchX <= rect.right &&
          touchY >= rect.top &&
          touchY <= rect.bottom
        ) {
          newDragOverIndex = index;
        }
      }
    });

    if (newDragOverIndex !== dragOverIndex) {
      setDragOverIndex(newDragOverIndex);
    }
    e.preventDefault(); // スクロールを防ぐ
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLButtonElement>) => {
    if (touchDraggedItemIndex.current === null) return;

    const touchX = e.changedTouches[0].clientX;
    const touchY = e.changedTouches[0].clientY;

    let targetIndex: number | null = null;

    // 各セルの位置をチェックし、タッチ終了座標がどのセル上にあるかを判定
    cellRefs.current.forEach((cell, index) => {
      if (cell) {
        const rect = cell.getBoundingClientRect();
        if (
          touchX >= rect.left &&
          touchX <= rect.right &&
          touchY >= rect.top &&
          touchY <= rect.bottom
        ) {
          targetIndex = index;
        }
      }
    });

    if (targetIndex !== null) {
      handleDrop(targetIndex); // ドロップ先のセルが見つかった場合
    } else {
      handleDragEnd(); // ドロップ先が見つからない場合はドラッグ終了
    }
    touchDraggedItemIndex.current = null;
  };

  return (
    <div className="bg-pink-50 min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md mx-auto bg-white rounded-3xl shadow-lg p-6 md:p-8">
        
        {/* ヘッダータイトル */}
        <header className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl font-bold text-pink-500 tracking-wider">
                勝手にBINGONIGHT ジェネレーター
            </h1>
        </header>

        {/* 操作ボタン */}
        <div className="flex justify-center gap-4 mb-6">
            <button 
              onClick={handleGenerate} 
              disabled={isLoading} 
              className="sparkle-button bg-pink-400 text-white font-bold py-2 px-6 rounded-full shadow-md hover:bg-pink-500 transition-colors duration-300">
                {isLoading ? '生成中...' : 'カードを作成'}
            </button>
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="sparkle-button bg-gray-200 text-gray-600 font-bold py-2 px-6 rounded-full shadow-md hover:bg-gray-300 transition-colors duration-300">
                {isEditing ? '完了' : 'カードを編集'}
            </button>
        </div>

        {/* エラーメッセージ */}
        {error && <p className="text-red-500 text-center mb-4">エラー: {error}</p>}

        {/* ビンゴカード */}
        {songs.length > 0 && (
          <div className="bg-pink-100 rounded-2xl shadow-inner p-4 touch-action: none">
              
              {/* ヘッダー画像部分 */}
              <div className="h-24 bg-pink-200 rounded-t-xl mb-4 flex items-center justify-center overflow-hidden">
                  <img src="/vite.svg" alt="Default Header" className="w-full h-full object-cover" />
              </div>

              {/* ビンゴグリッド */}
              <BingoGrid
                ref={gridRef}
                songs={songs}
                isEditing={isEditing}
                dragOverIndex={dragOverIndex}
                draggingIndex={draggingIndex}
                handleEditCell={handleEditCell}
                handleDragStart={handleDragStart}
                handleDragEnter={handleDragEnter}
                handleDragLeave={handleDragLeave}
                handleDrop={handleDrop}
                handleDragEnd={handleDragEnd}
                // 新しいタッチイベントハンドラを追加
                handleTouchStart={handleTouchStart}
                handleTouchMove={handleTouchMove}
                handleTouchEnd={handleTouchEnd}
                // 新しいプロパティを追加
                setCellRef={(el, index) => (cellRefs.current[index] = el)}
              />

              {/* フッター情報 */}
              <div className="mt-4 flex justify-between items-center bg-white/50 text-gray-600 text-xs md:text-sm px-4 py-2 rounded-b-xl">
                  <span>勝手にBINGO NIGHT</span>
                  <span>Name: ゲスト</span>
              </div>
          </div>
        )}

        {/* 共有ボタン */}
        {songs.length > 0 && (
          <div className="mt-8 text-center">
              <button 
                onClick={handleDownloadImage} 
                className="sparkle-button w-full max-w-xs bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                  画像を保存
              </button>
              <button 
                onClick={handleShare} 
                className="sparkle-button w-full max-w-xs bg-gradient-to-r from-cyan-400 to-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:shadow-xl transition-all duration-300">
                  Xで共有
              </button>
          </div>
        )}

      </div>
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
