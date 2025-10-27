import React from 'react';
import BingoGrid from './BingoGrid';
import type { Song } from './App';

// Propsの型定義
interface Props {
  songs: Song[]; // ビンゴカードに表示する曲のリスト
  isEditing: boolean; // 編集モードか
  userName: string; // カードに表示するユーザー名
  onEditCell: (id: string) => void; // セル編集時のハンドラ
  onUserNameChange: (name: string) => void; // ユーザー名変更時のハンドラ
  cardRef: React.RefObject<HTMLDivElement>; // 画像化するためのDOM参照
}

/**
 * ビンゴカード全体のUI（ヘッダー、グリッド、フッター）を表示するコンポーネント
 */
export const BingoCard = ({
  songs,
  isEditing,
  userName,
  onEditCell,
  onUserNameChange,
  cardRef,
}: Props) => {
  return (
    // cardRefは画像生成(toPng)のために親コンポーネントから渡される
    <div ref={cardRef} className="w-[370px] mx-auto bg-pink-100 rounded-2xl shadow-inner p-2">
      {/* カードヘッダー画像 */}
      <div className="h-24 bg-pink-200 rounded-t-xl mb-4 flex items-center justify-center overflow-hidden">
        <img src="/BINGO_HEDDER.png" alt="Header" className="w-full h-full object-cover" />
      </div>
      {/* ビンゴのマス目 */}
      <BingoGrid
        songs={songs}
        isEditing={isEditing}
        onEditCell={onEditCell}
      />
      {/* カードフッター */}
      <div className="mt-4 flex justify-between items-center bg-white/50 text-gray-600 text-xs md:text-sm px-4 py-2 rounded-b-xl">
        <span className="text-cute">勝手にBINGO NIGHT</span>
        {/* 編集モードの場合は入力欄、そうでなければテキストを表示 */}
        {isEditing ? (
          <input
            type="text"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            className="bg-transparent border-b border-gray-400 focus:outline-none text-gray-600 text-xs md:text-sm w-24 text-right"
          />
        ) : (
          <span>Name: {userName}</span>
        )}
      </div>
    </div>
  );
};
