import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  TouchSensor,
  useSensor, 
  useSensors, 
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import SongSelectionModal from './SongSelectionModal';
import BingoGrid from './BingoGrid';
import { SongCard } from './SongCard';
import ShareImageModal from './ShareImageModal'; // コンポーネント名をShareImageModalに統一

// 曲データの型を拡張
export type Song = {
  id: string; // dnd-kitで必須
  songId: string;
  title: string;
  shortTitle?: string; // 略称を追加
  color: 'pink' | 'red' | 'yellow' | 'purple';
  isFreeSpot?: boolean;
};

const initialSongs: Song[] = [];
const colors: ('pink' | 'red' | 'yellow' | 'purple')[] = ['pink', 'red', 'yellow', 'purple'];

function App() {
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  const [activeSong, setActiveSong] = useState<Song | null>(null); // ドラッグ中の曲を管理
  const [userName, setUserName] = useState('ゲスト'); // New state for user name
  
  // 共有機能に関するStateを統一
  const [isSharing, setIsSharing] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null);

  const cardContainerRef = useRef<HTMLDivElement>(null); // 画像化する範囲のrefを統一
  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

  const sensors = useSensors(
    useSensor(TouchSensor),
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // 初期ロード時に全曲リストを取得
  useEffect(() => {
    const fetchAllSongs = async () => {
      if (!API_BASE_URL) return;
      try {
        const response = await fetch(`${API_BASE_URL}/songs`);
        if (!response.ok) throw new Error('Failed to fetch all songs');
        const data = await response.json();
        const coloredSongs = data.map((song: any, index: number) => ({
          ...song,
          id: song.songId,
          color: colors[index % colors.length],
        }));
        setAllSongs(coloredSongs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load song list.');
      }
    };
    fetchAllSongs();
  }, [API_BASE_URL]);

  // 編集モードの状態に応じてビンゴカードのスクロールを制御
  useEffect(() => {
    const cardElement = cardContainerRef.current;
    if (!cardElement) return; // 要素がない場合は何もしない

    if (isEditing) {
      // 編集モード中はビンゴカードのスクロールをロック
      cardElement.style.overflow = 'hidden';
    } else {
      // 編集モードじゃなくなったらロックを解除
      cardElement.style.overflow = '';
    }

    // クリーンアップ関数：コンポーネントが消える時にもロックを解除するお作法
    return () => {
      if (cardElement) { // クリーンアップ時にも要素の存在を確認
        cardElement.style.overflow = '';
      }
    };
  }, [isEditing]); // isEditingが変わるたびにこの処理が走る！

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
      const fetchedSongs: Omit<Song, 'id' | 'color'>[] = await response.json();
      
      const freeSpot: Song = { id: 'FREE_SPOT', songId: 'FREE_SPOT', title: 'FREE', isFreeSpot: true, color: 'pink' };
      
      const newSongs: Song[] = fetchedSongs.map((song, index) => ({
        ...song,
        id: song.songId + `_${index}`,
        color: colors[index % colors.length],
      }));

      const finalSongs = [
        ...newSongs.slice(0, 12),
        freeSpot,
        ...newSongs.slice(12)
      ];
      setSongs(finalSongs);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditCell = (id: string) => {
    if (isEditing) {
      setEditingSongId(id);
      setIsModalOpen(true);
    }
  };

  const handleSelectSong = (song: Song) => {
    if (editingSongId !== null) {
      setSongs(currentSongs => 
        currentSongs.map(s => s.id === editingSongId ? { ...song, id: editingSongId } : s)
      );
    }
    setIsModalOpen(false);
    setEditingSongId(null);
  };

  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const song = songs.find(s => s.id === active.id);
    if (song) {
      setActiveSong(song);
    }
  }

  function handleDragEnd(event: DragEndEvent) {

    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSongs((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        if (items[newIndex].isFreeSpot || items[oldIndex].isFreeSpot) {
          return items;
        }

        const newItems = [...items];
        [newItems[oldIndex], newItems[newIndex]] = [newItems[newIndex], newItems[oldIndex]];

        return newItems;
      });
    }
    setActiveSong(null); // ドラッグ終了時にアクティブな曲をクリア
  }

  function handleDragCancel() {
    setActiveSong(null);
  }

  // 共有ロジックをこの関数に統合
  const handleOpenShareModal = async () => {
    if (!cardContainerRef.current) {
      setError("ビンゴカードが見つかりません。");
      return;
    }
    setIsSharing(true);
    setError(null);

    try {
      // 編集モードをオフにし、UIが更新されるのを少し待つ
      setIsEditing(false);
      await new Promise(resolve => setTimeout(resolve, 200));

      // html-to-image を使ってコンテナをPNGのData URIに変換
      const dataUrl = await toPng(cardContainerRef.current, { cacheBust: true });

      await new Promise(resolve => setTimeout(resolve, 200));
      
      // バックエンドに送信せず、直接Data URIをStateに設定
      setShareImageUrl(dataUrl);
      setIsShareModalOpen(true);

    } catch (err) {
      console.error("oops, something went wrong!", err);
      setError(err instanceof Error ? err.message : "画像の生成に失敗しました。");
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bg-pink-50 min-h-screen flex items-center justify-center p-4 font-sans">
        {/* ▼画面サイズに依らずカード全体の幅を固定 */}
        <div className="w-[420px] mx-auto bg-white rounded-3xl shadow-lg p-6">
          
          <header className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-pink-500 tracking-wider">
                  勝手にBINGONIGHT
              </h1>
          </header>

          {songs.length === 0 && (
            <>
              <div className="mb-4">
                  <label htmlFor="userName" className="block text-gray-700 text-sm font-bold mb-2">
                    カードに記載される名前を入力:
                  </label>
                  <input
                    type="text"
                    id="userName"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="あなたの名前"
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>

              <div className="flex justify-center gap-4 mb-6">
                  <button onClick={handleGenerate} disabled={isLoading} className="control-button bg-pink-400 hover:bg-pink-500">
                      {isLoading ? '生成中...' : 'カードを作成'}
                  </button>
              </div>
            </>
          )}

          {error && <p className="text-red-500 text-center mb-4">エラー: {error}</p>}

          {songs.length > 0 && (
            <>
              <div className="flex justify-center gap-4 mb-6">
                  <button onClick={() => setIsEditing(!isEditing)} className="control-button bg-pink-400 hover:bg-pink-500">
                      {isEditing ? '完了' : 'カードを編集'}
                  </button>
              </div>

              {/* ▼③サイズ固定のため、固定幅w-[370px]に変更。余白もp-2に調整 */}
              <div ref={cardContainerRef} className="w-[370px] mx-auto bg-pink-100 rounded-2xl shadow-inner p-2">
                  <div className="h-24 bg-pink-200 rounded-t-xl mb-4 flex items-center justify-center overflow-hidden">
                      <img src="/BINGO_HEDDER.png" alt="Header" className="w-full h-full object-cover" />
                  </div>
                  <BingoGrid
                    songs={songs}
                    isEditing={isEditing}
                    onEditCell={handleEditCell}
                  />
                  <div className="mt-4 flex justify-between items-center bg-white/50 text-gray-600 text-xs md:text-sm px-4 py-2 rounded-b-xl">
                      <span className="text-cute">勝手にBINGO NIGHT</span>
                      {isEditing ? (
                        <input
                          type="text"
                          value={userName}
                          onChange={(e) => setUserName(e.target.value)}
                          className="bg-transparent border-b border-gray-400 focus:outline-none text-gray-600 text-xs md:text-sm w-24 text-right"
                        />
                      ) : (
                        <span>Name: {userName}</span>
                      )}
                  </div>
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={handleOpenShareModal}
                  disabled={isSharing}
                  className="w-full py-3 px-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
                >
                  {isSharing ? '画像生成中...' : '画像をX（Twitter）にシェア'}
                </button>
              </div>
            </>
          )}

        </div>
        <SongSelectionModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          songs={allSongs}
          onSelectSong={handleSelectSong}
          currentSongs={songs}
        />
        <ShareImageModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          imageUrl={shareImageUrl}
          tweetText="ももクロちゃんのビンゴカードで遊んでるよ！ #ももクロビンゴ #ももいろクローバーZ"
        />
      </div>
      <DragOverlay dropAnimation={null}>
        {activeSong ? (
          <SongCard 
            song={activeSong} 
            isEditing={isEditing} 
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

export default App;