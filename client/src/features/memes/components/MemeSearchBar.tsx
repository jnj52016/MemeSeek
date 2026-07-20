// 这个是一个 MemeSearchBar 组件，用于显示一个搜索栏。
// 用户可以输入梗图名称或标签进行搜索，并触发相应的回调函数。
import { Input } from 'antd'

type MemeSearchBarProps = {
  value: string
  onChange: (value: string) => void
  onSearch: (value: string) => void
  onClear: () => void
}

function MemeSearchBar({
  value,
  onChange,
  onSearch,
  onClear,
}: MemeSearchBarProps) {
  return (
    <Input.Search
      size="large"
      allowClear
      value={value}
      onChange={(event) => onChange(event.target.value)}
      onSearch={onSearch}
      onClear={onClear}
      placeholder="搜索梗图名称或标签"
      aria-label="搜索梗图名称或标签"
    />
  )
}

export default MemeSearchBar
