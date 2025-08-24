import { useReducer, useRef, useEffect } from 'react';
import html2canvas from 'html2canvas';
import SongSelectionModal from './SongSelectionModal';
import BingoGrid from './BingoGrid';
import { useDragAndDrop } from './hooks/useDragAndDrop';

// 曲データの型を定義
type Song = {
  songId: string;
  title: string;
  isFreeSpot?: boolean; // フリースポットかどうかを示すプロパティを追加
};

// Stateの型定義
export type AppState = {
  songs: Song[];
  allSongs: Song[];
  isLoading: boolean;
  isEditing: boolean;
  error: string | null;
  dragState: {
    dragOverIndex: number | null;
    draggingIndex: number | null;
    isDraggingActive: boolean;
  };
  modal: {
    isOpen: boolean;
    editingIndex: number | null;
  };
};

// Actionの型定義
export type AppAction =
  | { type: 'SET_SONGS'; payload: Song[] }
  | { type: 'SET_ALL_SONGS'; payload: Song[] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_EDITING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_DRAG_OVER_INDEX'; payload: number | null }
  | { type: 'SET_DRAGGING_INDEX'; payload: number | null }
  | { type: 'SET_IS_DRAGGING_ACTIVE'; payload: boolean }
  | { type: 'SET_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EDITING_INDEX'; payload: number | null }
  | { type: 'RESET_DRAG_STATE' }
  | { type: 'SWAP_SONGS'; payload: { sourceIndex: number; targetIndex: number } };

// Reducer関数
function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_SONGS':
      return { ...state, songs: action.payload };
    case 'SET_ALL_SONGS':
      return { ...state, allSongs: action.payload };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_EDITING':
      return { ...state, isEditing: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_DRAG_OVER_INDEX':
      return { ...state, dragState: { ...state.dragState, dragOverIndex: action.payload } };
    case 'SET_DRAGGING_INDEX':
      return { ...state, dragState: { ...state.dragState, draggingIndex: action.payload } };
    case 'SET_IS_DRAGGING_ACTIVE':
      return { ...state, dragState: { ...state.dragState, isDraggingActive: action.payload } };
    case 'SET_MODAL_OPEN':
      return { ...state, modal: { ...state.modal, isOpen: action.payload } };
    case 'SET_EDITING_INDEX':
      return { ...state, modal: { ...state.modal, editingIndex: action.payload } };
    case 'RESET_DRAG_STATE':
      return {
        ...state,
        dragState: {
          dragOverIndex: null,
          draggingIndex: null,
          isDraggingActive: false,
        },
      };
    case 'SWAP_SONGS': {
      const newSongs = [...state.songs];
      const sourceItem = newSongs[action.payload.sourceIndex];
      newSongs[action.payload.sourceIndex] = newSongs[action.payload.targetIndex];
      newSongs[action.payload.targetIndex] = sourceItem;
      return { ...state, songs: newSongs };
    }
    default:
      return state;
  }
}

// 初期State
const initialAppState: AppState = {
  songs: [],
  allSongs: [],
  isLoading: false,
  isEditing: false,
  error: null,
  dragState: {
    dragOverIndex: null,
    draggingIndex: null,
    isDraggingActive: false,
  },
  modal: {
    isOpen: false,
    editingIndex: null,
  },
};

function App() {
  const [state, dispatch] = useReducer(appReducer, initialAppState);
  const { songs, allSongs, isLoading, isEditing, error, dragState, modal } = state;
  const { isOpen: isModalOpen, editingIndex } = modal;

  const gridRef = useRef<HTMLDivElement>(null);
  
  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

  // ドラッグ&ドロップロジックをカスタムフックに委譲
  const {
    dragOverIndex,
    draggingIndex,
    handleDragStart,
    handleDragEnter,
    handleDragLeave,
    handleDragEnd,
    handleDrop,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    setCellRef,
  } = useDragAndDrop(songs, dispatch, dragState);

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
        dispatch({ type: 'SET_ALL_SONGS', payload: data });
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'Failed to load song list.' });
      }
    };
    fetchAllSongs();
  }, [API_BASE_URL]);

  const handleGenerate = async () => {
    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    dispatch({ type: 'SET_SONGS', payload: [] });
    dispatch({ type: 'SET_EDITING', payload: false });

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
      dispatch({ type: 'SET_SONGS', payload: newSongs });

    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : 'An unknown error occurred' });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const handleEditCell = (index: number) => {
    if (isEditing) {
      dispatch({ type: 'SET_EDITING_INDEX', payload: index });
      dispatch({ type: 'SET_MODAL_OPEN', payload: true });
    }
  };

  const handleSelectSong = (newSong: Song) => {
    if (editingIndex !== null) {
      const newSongs = [...songs];
      newSongs[editingIndex] = newSong;
      dispatch({ type: 'SET_SONGS', payload: newSongs });
    }
    dispatch({ type: 'SET_MODAL_OPEN', payload: false });
    dispatch({ type: 'SET_EDITING_INDEX', payload: null });
  };

  const handleDownloadImage = async () => {
    if (!gridRef.current) return;
    dispatch({ type: 'SET_EDITING', payload: false }); // 編集中のスタイルがキャプチャされないようにする
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
              onClick={() => dispatch({ type: 'SET_EDITING', payload: !isEditing })} 
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
                handleTouchStart={handleTouchStart}
                handleTouchMove={handleTouchMove}
                handleTouchEnd={handleTouchEnd}
                handleDragEnd={handleDragEnd}
                setCellRef={setCellRef}
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
        onClose={() => dispatch({ type: 'SET_MODAL_OPEN', payload: false })}
        songs={allSongs}
        onSelectSong={handleSelectSong}
        currentSongs={songs}
      />
    </div>
  );
}

export default App;