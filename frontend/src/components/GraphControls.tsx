import { Button, Space, Tag } from 'antd';
import { PlusOutlined, MinusOutlined, ExpandOutlined } from '@ant-design/icons';

interface GraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
}

export function GraphControls({ onZoomIn, onZoomOut, onFit }: GraphControlsProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 16px',
        background: '#0f1011',
        borderTop: '1px solid rgba(255,255,255,0.05)',
        flexShrink: 0,
      }}
    >
      <Space size={6}>
        <Button
          type="text"
          size="small"
          icon={<PlusOutlined />}
          onClick={onZoomIn}
          style={{
            width: 28,
            height: 28,
            background: '#191a1b',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8a8f98',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <Button
          type="text"
          size="small"
          icon={<MinusOutlined />}
          onClick={onZoomOut}
          style={{
            width: 28,
            height: 28,
            background: '#191a1b',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8a8f98',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
        <Button
          type="text"
          size="small"
          icon={<ExpandOutlined />}
          onClick={onFit}
          style={{
            width: 28,
            height: 28,
            background: '#191a1b',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#8a8f98',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        />
      </Space>

      <Space size={12}>
        <Tag color="geekblue" style={{ border: 'none', fontSize: 11 }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: '#5e6ad2', marginRight: 6, verticalAlign: 'middle' }} />
          Blocks
        </Tag>
        <Tag color="green" style={{ border: 'none', fontSize: 11 }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: '#10b981', marginRight: 6, verticalAlign: 'middle' }} />
          Requires
        </Tag>
        <Tag color="orange" style={{ border: 'none', fontSize: 11 }}>
          <span style={{ display: 'inline-block', width: 16, height: 2, background: '#f59e0b', marginRight: 6, verticalAlign: 'middle' }} />
          Triggers
        </Tag>
      </Space>
    </div>
  );
}
