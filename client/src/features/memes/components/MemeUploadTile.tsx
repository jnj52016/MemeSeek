// 梗图列表中的上传入口方块
type MemeUploadTileProps = {
  onClick?: () => void
}

function MemeUploadTile({ onClick }: MemeUploadTileProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-56 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-orange-50 text-orange-700 transition hover:bg-orange-100"
    >
      <span className="mb-3 text-4xl font-light">+</span>
      <span className="font-medium">上传梗图</span>
    </button>
  )
}

export default MemeUploadTile
