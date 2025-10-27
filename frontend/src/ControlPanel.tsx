// Propsの型定義
interface Props {
  isCardGenerated: boolean; // ビンゴカードが生成されているか
  isLoading: boolean; // カード生成中か
  isEditing: boolean; // 編集モードか
  isSharing: boolean; // 画像共有中か
  userName: string; // ユーザー名
  onGenerate: () => void; // カード生成処理のハンドラ
  onToggleEdit: () => void; // 編集モード切り替えのハンドラ
  onOpenShareModal: () => void; // 共有モーダル表示のハンドラ
  onUserNameChange: (name: string) => void; // ユーザー名変更のハンドラ
}

/**
 * アプリケーションの操作ボタン（カード生成、編集、共有など）を管理するコンポーネント
 */
export const ControlPanel = ({
  isCardGenerated,
  isLoading,
  isEditing,
  isSharing,
  userName,
  onGenerate,
  onToggleEdit,
  onOpenShareModal,
  onUserNameChange,
}: Props) => {
  return (
    <>
      {/* カードがまだ生成されていない場合のUI */}
      {!isCardGenerated ? (
        <>
          {/* ユーザー名入力欄 */}
          <div className="mb-4">
            <label htmlFor="userName" className="block text-gray-700 text-sm font-bold mb-2">
              カードに記載される名前を入力:
            </label>
            <input
              type="text"
              id="userName"
              value={userName}
              onChange={(e) => onUserNameChange(e.target.value)}
              placeholder="あなたの名前"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            />
          </div>
          {/* カード生成ボタン */}
          <div className="flex justify-center gap-4 mb-6">
            <button onClick={onGenerate} disabled={isLoading} className="control-button bg-pink-400 hover:bg-pink-500">
              {isLoading ? '生成中...' : 'カードを作成'}
            </button>
          </div>
        </>
      ) : (
        <>
          {/* カード編集ボタン */}
          <div className="flex justify-center gap-4 mb-6">
            <button onClick={onToggleEdit} className="control-button bg-pink-400 hover:bg-pink-500">
              {isEditing ? '完了' : 'カードを編集'}
            </button>
          </div>
          {/* シェアボタン */}
          <div className="mt-8 text-center">
            <button
              onClick={onOpenShareModal}
              disabled={isSharing}
              className="w-full py-3 px-4 bg-black text-white font-bold rounded-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              {isSharing ? '画像生成中...' : '画像をX（Twitter）にシェア'}
            </button>
          </div>
        </>
      )}
    </>
  );
};
