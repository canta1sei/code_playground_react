import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  imageUrl: string | null;
  tweetText: string;
}

function ShareImageModal({ isOpen, onClose, imageUrl, tweetText }: Props) {
  if (!isOpen || !imageUrl) return null;

  const handleShareToX = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
        <div className="p-6 text-center">
          <h2 className="text-xl font-bold text-gray-800 mb-2">画像を保存してシェア！</h2>
          <p className="text-gray-600 mb-4">
            下の画像を長押し、または右クリックして保存してね！
          </p>
          <div className="bg-pink-50 p-4 rounded-lg">
            <img src={imageUrl} alt="Bingo Card" className="w-full rounded-md" />
          </div>
          <button
            onClick={handleShareToX}
            className="w-full mt-4 py-3 px-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors"
          >
            Xで結果をシェア
          </button>
        </div>
        <div className="p-4 border-t text-center">
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800">
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

export default ShareImageModal;
