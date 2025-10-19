import React from 'react';

/**
 * ShareModalコンポーネントのProps
 * @param isOpen - モーダルが開いているかどうか
 * @param onClose - モーダルを閉じるための関数
 * @param imageUrl - 表示する画像のURL
 */
interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
}

/**
 * 生成されたビンゴカード画像を表示し、共有するためのモーダルコンポーネント
 * ユーザーに画像を長押しして保存するように促し、X（Twitter）への共有リンクを提供します。
 */
const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, imageUrl }) => {
  // モーダルが開いていない、または画像URLがない場合は何もレンダリングしない
  if (!isOpen || !imageUrl) return null;

  // Xの共有インテント用のテキストとURLを準備
  const text = encodeURIComponent('ももクロちゃんのビンゴカードで遊んでるよ！ #ももクロビンゴ #ももいろクローバーZ');
  const url = `https://twitter.com/intent/tweet?text=${text}`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm text-center">
        <h3 className="text-lg font-bold text-gray-800 mb-4">共有の準備ができました！</h3>
        <p className="text-sm text-gray-600 mb-4">
          下の画像を長押しして保存し、Xで投稿してください。
        </p>
        {/* S3から返された生成済み画像を表示 */}
        <img src={imageUrl} alt="Generated Bingo Card" className="rounded-lg mb-6 border" />
        {/* Xへの共有リンク */}
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full bg-black text-white font-bold py-3 px-4 rounded-lg hover:bg-gray-800 transition-colors mb-2"
        >
          Xで投稿する
        </a>
        {/* モーダルを閉じるボタン */}
        <button
          onClick={onClose}
          className="w-full bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
        >
          閉じる
        </button>
      </div>
    </div>
  );
};

export default ShareModal;
