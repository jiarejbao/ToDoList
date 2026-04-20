import { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, Select, message } from 'antd';
import dayjs from 'dayjs';
import type { Subtask } from '../types';
import { SubtaskAPI } from '../api';

interface SubtaskModalProps {
  open: boolean;
  taskId?: number;
  subtask?: Subtask | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function SubtaskModal({ open, taskId, subtask, onClose, onSuccess }: SubtaskModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const isEdit = !!subtask;

  useEffect(() => {
    if (open && subtask) {
      form.setFieldsValue({
        content: subtask.content,
        description: subtask.description,
        due_date: subtask.due_date ? dayjs(subtask.due_date) : null,
        priority: subtask.priority,
      });
    } else if (open) {
      form.resetFields();
      form.setFieldsValue({ priority: 2 });
    }
  }, [open, subtask, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      if (!isEdit && !taskId) {
        message.error('Missing task ID');
        return;
      }

      setLoading(true);
      const data = {
        content: values.content,
        description: values.description || null,
        due_date: values.due_date ? values.due_date.format('YYYY-MM-DD') : null,
        priority: values.priority,
      };

      if (isEdit && subtask) {
        await SubtaskAPI.update(subtask.id, data);
        message.success('Subtask updated');
      } else if (taskId) {
        await SubtaskAPI.create(taskId, data);
        message.success('Subtask created');
      }

      onSuccess();
    } catch (error) {
      console.error('Save subtask failed:', error);
      message.error('Save failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Edit Subtask' : 'New Subtask'}
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={loading}
      width={480}
      okText="Save"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
        <Form.Item
          name="content"
          label="Content"
          rules={[{ required: true, message: 'Content is required' }]}
        >
          <Input placeholder="Subtask content..." />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Add description..." rows={3} />
        </Form.Item>

        <div style={{ display: 'flex', gap: 16 }}>
          <Form.Item name="due_date" label="Due Date" style={{ flex: 1 }}>
            <DatePicker style={{ width: '100%' }} placeholder="Select date" />
          </Form.Item>

          <Form.Item name="priority" label="Priority" style={{ flex: 1 }} initialValue={2}>
            <Select
              options={[
                { value: 1, label: 'P1 - Lowest' },
                { value: 2, label: 'P2 - Normal' },
                { value: 3, label: 'P3 - Important' },
                { value: 4, label: 'P4 - Urgent' },
              ]}
            />
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
}
