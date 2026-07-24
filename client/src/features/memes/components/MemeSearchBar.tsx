// 这个是一个 MemeSearchBar 组件，用于显示一个搜索栏。
// 用户可以输入梗图名称或标签进行搜索，并触发相应的回调函数。
import { Input } from 'antd'
import { useState } from 'react'

type MemeSearchBarProps = {
  initialValue: string
  onSearch: (value: string) => void
  onClear: () => void
}

function MemeSearchBar({
  initialValue,
  onSearch,
  onClear,
}: MemeSearchBarProps) {
  const [draftValue, setDraftValue] = useState(initialValue)

  const handleClear = () => {
    setDraftValue('')
    onClear()
  }

  return (
    <Input.Search
      size="large"
      allowClear
      value={draftValue}
      onChange={(event) => setDraftValue(event.target.value)}
      onSearch={onSearch}
      onClear={handleClear}
      placeholder="搜索梗图名称或标签"
      aria-label="搜索梗图名称或标签"
    />
  )
}

export default MemeSearchBar
