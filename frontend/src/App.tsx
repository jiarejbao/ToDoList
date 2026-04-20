import { Routes, Route } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import { Layout } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { TaskDetailPage } from './pages/TaskDetailPage';
import { SubtaskNotePage } from './pages/SubtaskNotePage';

const linearTheme = {
  algorithm: theme.darkAlgorithm,
  token: {
    colorBgBase: '#08090a',
    colorBgContainer: '#191a1b',
    colorBgElevated: '#0f1011',
    colorTextBase: '#f7f8f8',
    colorText: '#f7f8f8',
    colorTextSecondary: '#d0d6e0',
    colorTextTertiary: '#8a8f98',
    colorPrimary: '#5e6ad2',
    colorPrimaryHover: '#828fff',
    colorPrimaryActive: '#7170ff',
    colorBorder: 'rgba(255,255,255,0.08)',
    colorBorderSecondary: 'rgba(255,255,255,0.05)',
    borderRadius: 6,
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    fontSize: 14,
    controlHeight: 32,
  },
  components: {
    Button: {
      colorBgContainer: 'rgba(255,255,255,0.02)',
      colorBgTextHover: 'rgba(255,255,255,0.04)',
      colorBorder: 'rgb(36, 40, 44)',
      defaultColor: '#e2e4e7',
      primaryColor: '#ffffff',
      borderRadius: 6,
      controlHeight: 32,
    },
    Modal: {
      contentBg: '#191a1b',
      headerBg: '#191a1b',
      titleColor: '#f7f8f8',
      colorText: '#d0d6e0',
      borderRadiusLG: 12,
    },
    Input: {
      colorBgContainer: 'rgba(255,255,255,0.02)',
      colorBorder: 'rgba(255,255,255,0.08)',
      colorTextPlaceholder: '#62666d',
      activeBorderColor: 'rgba(94, 106, 210, 0.5)',
    },
    Select: {
      colorBgContainer: 'rgba(255,255,255,0.02)',
      colorBorder: 'rgba(255,255,255,0.08)',
      colorTextPlaceholder: '#62666d',
      optionSelectedBg: 'rgba(94, 106, 210, 0.15)',
      optionActiveBg: 'rgba(255,255,255,0.04)',
    },
    Card: {
      colorBgContainer: 'rgba(255,255,255,0.02)',
      colorBorderSecondary: 'rgba(255,255,255,0.08)',
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'rgba(255,255,255,0.06)',
      itemHoverBg: 'rgba(255,255,255,0.04)',
      itemColor: '#d0d6e0',
      itemSelectedColor: '#f7f8f8',
      itemHoverColor: '#f7f8f8',
    },
    Drawer: {
      colorBgElevated: '#0f1011',
    },
  },
};

export function App() {
  return (
    <ConfigProvider theme={linearTheme}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="task/:taskId" element={<TaskDetailPage />} />
          <Route path="note/:subtaskId" element={<SubtaskNotePage />} />
        </Route>
      </Routes>
    </ConfigProvider>
  );
}
