import { useState, useRef, useEffect } from 'react';
import { toPng } from 'html-to-image';
import { 
  DndContext, 
  closestCenter, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors, 
  DragOverlay,
} from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';

import SongSelectionModal from './SongSelectionModal';
import { SongCard } from './SongCard';
import ShareImageModal from './ShareImageModal';
import { ControlPanel, ShareButton } from './ControlPanel';
import { BingoCard } from './BingoCard';
import type { Song } from './types';

const initialSongs: Song[] = [];
const colors: ('pink' | 'red' | 'yellow' | 'purple')[] = ['pink', 'red', 'yellow', 'purple'];

/**
 * アプリケーションのメインコンポーネント
 * 全体の状態管理、API通信、ドラッグ＆ドロップのロジックなどを担当する
 */
function App() {
  // --- STATE ---
  // ビンゴカードに表示される曲のリスト
  const [songs, setSongs] = useState<Song[]>(initialSongs);
  // APIから取得したすべての曲のリスト
  const [allSongs, setAllSongs] = useState<Song[]>([]);
  // API通信中などのローディング状態
  const [isLoading, setIsLoading] = useState(false);
  // カードの編集モード状態
  const [isEditing, setIsEditing] = useState(false);
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  // 曲選択モーダルの表示状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  // 編集対象の曲ID
  const [editingSongId, setEditingSongId] = useState<string | null>(null);
  // ドラッグ中の曲情報
  const [activeSong, setActiveSong] = useState<Song | null>(null);
  // ユーザー名
  const [userName, setUserName] = useState('ゲスト');
  // 画像共有モーダル関連のstate
  const [isSharing, setIsSharing] = useState(false); // 画像生成中のローディング状態
  const [isShareModalOpen, setIsShareModalOpen] = useState(false); // モーダルの表示状態
  const [shareImageUrl, setShareImageUrl] = useState<string | null>(null); // 生成した画像のURL

  // --- REFS ---
  // 画像化するビンゴカードDOMへの参照
  const cardContainerRef = useRef<HTMLDivElement>(null);

  // --- CONSTANTS ---
  const API_BASE_URL = import.meta.env.VITE_API_ENDPOINT;

  // --- dnd-kit SETUP ---
  // ドラッグ＆ドロップのセンサー設定
  const sensors = useSensors(
    useSensor(PointerSensor, {
      // 8px以上ドラッグしたら開始することで、クリックやタップとの競合を防ぐ
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // --- EFFECTS ---
  // 初期レンダリング時にAPIから全曲リストを取得する
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

  // --- HANDLERS ---
  /**
   * APIにリクエストして新しいビンゴカードを生成する
   */
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

      // --- ビンゴカード表示後にダミー画像化を実行 ---
      setTimeout(async () => {
        if (cardContainerRef.current) {
          try {
            await toPng(cardContainerRef.current, { cacheBust: false });
            console.log('事前キャッシュ完了');
          } catch (err) {
            console.log('事前キャッシュ失敗（共有時に再試行）', err);
          }
        }
      }, 1000); // 1秒待ってから実行（画像読み込みの余裕を持たせる）

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * 編集モード時にセルをクリックした際の処理
   * @param id 編集対象の曲ID
   */
  const handleEditCell = (id: string) => {
    if (isEditing) {
      setEditingSongId(id);
      setIsModalOpen(true);
    }
  };

  /**
   * 曲選択モーダルで曲を選択した際の処理
   * @param song 選択された曲情報
   */
  const handleSelectSong = (song: Song) => {
    if (editingSongId !== null) {
      setSongs(currentSongs => 
        currentSongs.map(s => s.id === editingSongId ? { ...song, id: editingSongId } : s)
      );
    }
    setIsModalOpen(false);
    setEditingSongId(null);
  };

  /**
   * ドラッグ開始時の処理
   */
  function handleDragStart(event: DragStartEvent) {
    const { active } = event;
    const song = songs.find(s => s.id === active.id);
    if (song) {
      setActiveSong(song);
    }
    const grid = document.querySelector(".bingo-grid") as HTMLElement;
    if (grid) grid.style.overflow = "hidden";
  }

  /**
   * ドラッグ終了時の処理（曲の入れ替え）
   */
  function handleDragEnd(event: DragEndEvent) {
    const grid = document.querySelector(".bingo-grid") as HTMLElement;
    if (grid) grid.style.overflow = "";

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

  /**
   * ドラッグキャンセル時の処理
   */
  function handleDragCancel() {
    const grid = document.querySelector(".bingo-grid") as HTMLElement;
    if (grid) grid.style.overflow = "";
    setActiveSong(null);
  }

  /**
   * ビンゴカードを画像化して共有モーダルを開く処理
   */
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

      // --- 画像の読み込みを待つ処理を追加 ---
      const images = Array.from(cardContainerRef.current.getElementsByTagName('img'));
      
      // 1. 各画像の読み込みをタイムアウト付きで待つ
      const imagePromises = images.map(img => {
        return new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight !== 0) {
            // すでに読み込み済み
            resolve();
          } else {
            // タイムアウト設定（3秒）
            const timeout = setTimeout(() => resolve(), 3000);
            
            img.onload = () => {
              clearTimeout(timeout);
              resolve();
            };
            img.onerror = () => {
              clearTimeout(timeout);
              resolve();
            };
            
            // 強制的に再読み込み（キャッシュ問題対策）
            const src = img.src;
            img.src = '';
            img.src = src;
          }
        });
      });

      await Promise.all(imagePromises);

      // 2. さらに余裕を持って待機（スマホは遅いため）
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. pixelRatioを指定してより高品質に
      const dataUrl = await toPng(cardContainerRef.current, { 
        cacheBust: true,  // キャッシュを使わない
        pixelRatio: 2,    // Retina対応
      });

      await new Promise(resolve => setTimeout(resolve, 300));
      
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

  // --- RENDER ---
  return (
    <DndContext 
      sensors={sensors} 
      collisionDetection={closestCenter} 
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="bg-pink-50 min-h-screen flex items-center justify-center font-sans px-1 py-6">
        <div className="w-[375px] mx-auto bg-white rounded-3xl shadow-lg px-1 py-6">
          
          <header className="text-center mb-6">
              <h1 className="text-2xl md:text-3xl font-bold text-pink-500 tracking-wider">
                  勝手にBINGONIGHT!!
              </h1>
          </header>

          {/* 操作ボタンエリア */}
          <ControlPanel
            isCardGenerated={songs.length > 0}
            isLoading={isLoading}
            isEditing={isEditing}
            userName={userName}
            onGenerate={handleGenerate}
            onToggleEdit={() => setIsEditing(!isEditing)}
            onUserNameChange={setUserName}
          />

          {/* エラー表示 */}
          {error && <p className="text-red-500 text-center mb-4">エラー: {error}</p>}

          {/* ビンゴカードエリア（カード生成後に表示） */}
          {songs.length > 0 && (
            <>
              <BingoCard
                ref={cardContainerRef}
                songs={songs}
                isEditing={isEditing}
                userName={userName}
                onEditCell={handleEditCell}
                onUserNameChange={setUserName}
              />
              {/* シェアボタン */}
              <ShareButton
                onClick={handleOpenShareModal}
                disabled={isSharing}
              />
            </>
          )}

        </div>

        {/* 曲選択モーダル */}
        <SongSelectionModal 
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          songs={allSongs}
          onSelectSong={handleSelectSong}
          currentSongs={songs}
        />

        {/* 画像共有モーダル */}
        <ShareImageModal
          isOpen={isShareModalOpen}
          onClose={() => setIsShareModalOpen(false)}
          imageUrl={shareImageUrl}
          tweetText={`ももクロちゃんのビンゴカードで遊んでるよ！\n#勝手にBINGONIGHT #ももいろクローバーZ\nhttps://tdf-arena.com`}
        />
      </div>

      {/* ドラッグ中の要素の表示 */}
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