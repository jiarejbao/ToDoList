import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Button, Menu, Typography } from 'antd';
import {
  PlusOutlined,
  AppstoreOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  InboxOutlined,
  FlagOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useState } from 'react';
import { TaskModal } from './TaskModal';

const { Sider, Content } = AntLayout;
const { Title } = Typography;

type ViewKey = 'all' | 'today' | 'upcoming' | 'no-date' | 'priority-high' | 'completed' | 'trash';

export function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [taskModalOpen, setTaskModalOpen] = useState(false);

  const getSelectedKey = (): string => {
    if (location.pathname === '/') return 'all';
    return 'all';
  };

  const menuItems = [
    {
      key: 'group-filter',
      type: 'group' as const,
      label: '筛选',
      children: [
        { key: 'all', icon: <AppstoreOutlined />, label: '全部任务' },
        { key: 'today', icon: <ClockCircleOutlined />, label: '今日待办' },
        { key: 'upcoming', icon: <CalendarOutlined />, label: '未来任务' },
        { key: 'no-date', icon: <InboxOutlined />, label: '无截止日期' },
        { key: 'priority-high', icon: <FlagOutlined />, label: '高优先级' },
      ],
    },
    {
      key: 'group-manage',
      type: 'group' as const,
      label: '管理',
      children: [
        { key: 'completed', icon: <CheckCircleOutlined />, label: '已完成' },
        { key: 'trash', icon: <DeleteOutlined />, label: '回收站' },
      ],
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    if (key === 'all' || key === 'today' || key === 'upcoming' || key === 'no-date' || key === 'priority-high' || key === 'completed' || key === 'trash') {
      navigate(`/?view=${key}`);
    }
  };

  return (
    <AntLayout style={{ minHeight: '100vh', background: '#08090a' }}>
      <Sider
        width={260}
        style={{
          background: '#0f1011',
          borderRight: '1px solid rgba(255,255,255,0.05)',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          overflow: 'auto',
          padding: '24px 16px',
        }}
      >
        <Title
          level={4}
          style={{
            color: '#f7f8f8',
            marginBottom: 24,
            fontWeight: 590,
            letterSpacing: '-0.5px',
            paddingLeft: 8,
          }}
        >
          ToDoList
        </Title>

        <Button
          type="primary"
          icon={<PlusOutlined />}
          block
          style={{
            marginBottom: 24,
            background: '#5e6ad2',
            borderColor: '#5e6ad2',
          }}
          onClick={() => setTaskModalOpen(true)}
        >
          新建任务
        </Button>

        <Menu
          mode="inline"
          selectedKeys={[getSelectedKey()]}
          items={menuItems}
          onClick={handleMenuClick}
          style={{
            background: 'transparent',
            borderRight: 'none',
            fontSize: 15,
            fontWeight: 510,
          }}
        />
      </Sider>

      <Content
        style={{
          marginLeft: 260,
          padding: '24px 32px',
          background: '#08090a',
          minHeight: '100vh',
        }}
      >
        <Outlet />
      </Content>

      <TaskModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSuccess={() => {
          setTaskModalOpen(false);
          window.dispatchEvent(new CustomEvent('refresh-tasks'));
        }}
      />
    </AntLayout>
  );
}
