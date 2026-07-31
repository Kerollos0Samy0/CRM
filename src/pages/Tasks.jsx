import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Plus, Check, Clock, Circle, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const Tasks = () => {
  const { currentUser, users } = useAuth();
  const { tasks, addTask, updateTaskStatus, deleteTask } = useData();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({ title: '', description: '', assigneeId: '' });

  const handleAddTask = (e) => {
    e.preventDefault();
    addTask(formData);
    setIsAddModalOpen(false);
    setFormData({ title: '', description: '', assigneeId: '' });
  };

  const tasksList = Object.values(tasks);
  
  const getTasksByStatus = (status) => tasksList.filter(t => t.status === status);
  const todoTasks = getTasksByStatus('todo');
  const inProgressTasks = getTasksByStatus('in-progress');
  const doneTasks = getTasksByStatus('done');

  const getUserDetails = (userId) => users.find(u => u.id === userId) || {};

  const TaskCard = ({ task }) => {
    const assignee = getUserDetails(task.assigneeId);
    const assigner = getUserDetails(task.assignerId);
    
    return (
      <div className="card" style={{ padding: '16px', position: 'relative' }}>
        <h4 style={{ fontWeight: 600, marginBottom: '8px' }}>{task.title}</h4>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>{task.description}</p>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>من:</span>
            <span style={{ color: assigner.color, fontWeight: 600 }}>{assigner.name}</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ color: 'var(--text-muted)' }}>إلى:</span>
            <span style={{ color: assignee.color, fontWeight: 600 }}>{assignee.name}</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '12px' }}>
          {task.status !== 'todo' && (
            <button className="btn btn-secondary" style={{ padding: '6px', flex: 1 }} onClick={() => updateTaskStatus(task.id, 'todo')}>
              <Circle size={14} />
            </button>
          )}
          {task.status !== 'in-progress' && (
            <button className="btn btn-secondary" style={{ padding: '6px', flex: 1 }} onClick={() => updateTaskStatus(task.id, 'in-progress')}>
              <Clock size={14} />
            </button>
          )}
          {task.status !== 'done' && (
            <button className="btn btn-secondary" style={{ padding: '6px', flex: 1, color: 'var(--color-sherry)' }} onClick={() => updateTaskStatus(task.id, 'done')}>
              <Check size={14} />
            </button>
          )}
          <button className="btn btn-secondary" style={{ padding: '6px', color: 'var(--color-marina)' }} onClick={() => deleteTask(task.id)}>
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  };

  const Column = ({ title, tasks, color }) => (
    <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', gap: '16px', minWidth: '300px' }}>
      <div className="glass-panel" style={{ padding: '16px', borderTop: `4px solid ${color}`, display: 'flex', justifyContent: 'space-between' }}>
        <h3 className="heading-md" style={{ fontSize: '1.2rem' }}>{title}</h3>
        <span style={{ background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: '12px', fontSize: '0.8rem' }}>
          {tasks.length}
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <AnimatePresence>
          {tasks.map(task => (
            <motion.div key={task.id} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <TaskCard task={task} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          <Plus size={18} />
          تاسك جديدة
        </button>
      </div>

      <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
        <Column title="مطلوبة (To Do)" tasks={todoTasks} color="var(--text-muted)" />
        <Column title="جاري التنفيذ (In Progress)" tasks={inProgressTasks} color="var(--color-mira)" />
        <Column title="مكتملة (Done)" tasks={doneTasks} color="var(--color-sherry)" />
      </div>

      {isAddModalOpen && (
        <div style={{
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, padding: '20px'
        }}>
          <motion.div className="glass-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ width: '100%', maxWidth: '500px', padding: '32px' }}>
            <h2 className="heading-md" style={{ marginBottom: '24px' }}>إضافة تاسك</h2>
            <form onSubmit={handleAddTask} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>عنوان التاسك</label>
                <input required type="text" className="input-field" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>التفاصيل</label>
                <textarea required className="input-field" rows={3} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>مطلوبة من</label>
                <select required className="input-field" value={formData.assigneeId} onChange={e => setFormData({...formData, assigneeId: e.target.value})}>
                  <option value="" disabled>اختر الشخص...</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>إلغاء</button>
                <button type="submit" className="btn btn-primary">حفظ التاسك</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </>
  );
};

export default Tasks;
