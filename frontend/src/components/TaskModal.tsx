import { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, Button, Space } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import type { Task } from '../types';
import { TaskAPI } from '../api';

interface TaskModalProps {
  open: boolean;
  task?: Task | null;
  onClose: () => void;
  onSuccess: () => void;
}

interface TempSubtask {
  id?: number;
  content: string;
  priority: number;
}

export function TaskModal({ open, task, onClose, onSuccess }: TaskModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [tempSubtasks, setTempSubtasks] = useState<TempSubtask[]>([]);
  const isEdit = !!task;

  useEffect(() => {
    if (open && task) {
      form.setFieldsValue({
        content: task.content,
        description: task.description,
        due_date: task.due_date ? dayjs(task.due_date) : null,
        priority: task.priority,
      });
      setTempSubtasks(
        (task.subtasks || []).map((s) => ({
          id: s.id,
          content: s.content,
          priority: s.priority,
        }))
      );
    } else if (open) {
      form.resetFields();
      setTempSubtasks([]);
    }
  }, [open, task, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const data = {
        content: values.content,
        description: values.description || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        priority: values.priority,
        subtasks: tempSubtasks
          .filter((s) => !s.id)
          .map((s) => ({
            content: s.content,
            priority: s.priority,
          })),
      };

      if (isEdit && task) {
        await TaskAPI.update(task.id, data);
      } else {
        await TaskAPI.create(data);
      }

      onSuccess();
    } catch (error) {
      console.error('Save task failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const addTempSubtask = () => {
    setTempSubtasks([...tempSubtasks, { content: '', priority: 2 }]);
  };

  const removeTempSubtask = (index: number) => {
    setTempSubtasks(tempSubtasks.filter((_, i) => i !== index));
  };

  const updateTempSubtask = (index: number, field: keyof TempSubtask, value: string | number) => {
    const updated = [...tempSubtasks];
    updated[index] = { ...updated[index], [field]: value };
    setTempSubtasks(updated);
  };

  return (
    <Modal
      title={isEdit ? '编辑任务' : '新建任务'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={560}
      okText="保存"
      cancelText="取消"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="content"
          label="任务内容"
          rules={[{ required: true, message: '请输入任务内容' }]}
        >
          <Input placeholder="输入任务内容..." />
        </Form.Item>

        <Form.Item name="description" label="描述">
          <Input.TextArea placeholder="添加描述..." rows={3} />
        </Form.Item>

        <Space style={{ display: 'flex', width: '100%' }}>
          <Form.Item name="due_date" label="截止日期" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} placeholder="选择日期" />
          </Form.Item>

          <Form.Item name="priority" label="优先级" style={{ flex: 1 }} initialValue={2}>
            <Select
              options={[
                { value: 1, label: 'P1 - 最低' },
                { value: 2, label: 'P2 - 普通' },
                { value: 3, label: 'P3 - 重要' },
                { value: 4, label: 'P4 - 紧急' },
              ]}
            />
          </Form.Item>
        </Space>

        {isEdit && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 510, color: '#8a8f98' }}>子任务</span>
              <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addTempSubtask}>
                添加子任务
              </Button>
            </div>
            {tempSubtasks.map((sub, index) => (
              <Space key={index} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                <Input
                  value={sub.content}
                  onChange={(e) => updateTempSubtask(index, 'content', e.target.value)}
                  placeholder="子任务内容"
                  style={{ width: 280 }}
                  readOnly={!!sub.id}
                />
                <Select
                  value={sub.priority}
                  onChange={(v) => updateTempSubtask(index, 'priority', v)}
                  options={[
                    { value: 1, label: 'P1' },
                    { value: 2, label: 'P2' },
                    { value: 3, label: 'P3' },
                    { value: 4, label: 'P4' },
                  ]}
                  style={{ width: 80 }}
                  disabled={!!sub.id}
                />
                <MinusCircleOutlined
                  onClick={() => removeTempSubtask(index)}
                  style={{ color: '#62666d', cursor: 'pointer' }}
                />
              </Space>
            ))}
          </>
        )}
      </Form>
    </Modal>
  );
}
