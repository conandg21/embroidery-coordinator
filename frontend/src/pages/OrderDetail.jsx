import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ChatBubble } from '../components/ChatMessage';

const STATUS_CONFIG = {
  intake:       { label: 'Intake',       color: 'bg-blue-100 text-blue-800',    next: 'digitization' },
  digitization: { label: 'Digitization', color: 'bg-purple-100 text-purple-800', next: 'production' },
  production:   { label: 'Production',   color: 'bg-orange-100 text-orange-800', next: 'qa' },
  qa:           { label: 'QA',           color: 'bg-yellow-100 text-yellow-800', next: 'completed' },
  completed:    { label: 'Completed',    color: 'bg-green-100 text-green-800',   next: null },
  cancelled:    { label: 'Cancelled',    color: 'bg-gray-100 text-gray-600',     next: null },
};

const FILE_ICONS = { art: '🎨', dst: '🧵', emb: '🪡', preview: '🖼️', other: '📎' };

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusNote, setStatusNote] = useState('');
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [nextStatus, setNextStatus] = useState('');
  const fileInputRef = useRef();
  const chatImgRef = useRef();
  const msgEndRef = useRef();
  const pollRef = useRef();
  const [uploadingChatImg, setUploadingChatImg] = useState(false);

  const loadOrder = async () => {
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (err) {
      if (err.response?.status === 404) navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async () => {
    try {
      const res = await api.get(`/chat/messages?orderId=${id}&limit=100`);
      setMessages(res.data);
    } catch {}
  };

  useEffect(() => {
    loadOrder();
    loadMessages();
    pollRef.current = setInterval(loadMessages, 4000);
    return () => clearInterval(pollRef.current);
  }, [id]);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSendingMsg(true);
    try {
      const res = await api.post('/chat/messages', { content: newMsg, orderId: parseInt(id) });
      setMessages(m => [...m, res.data]);
      setNewMsg('');
    } catch {} finally { setSendingMsg(false); }
  };

  const sendChatImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingChatImg(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('orderId', id);
      const res = await api.post('/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(m => [...m, res.data]);
    } catch (err) {
      alert(err.response?.data?.error || 'Image upload failed');
    } finally {
      setUploadingChatImg(false);
      chatImgRef.current.value = '';
    }
  };

  const handleFileUpload = async (e) => {
    const files = e.target.files;
    if (!files.length) return;
    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach(f => formData.append('files', f));
    try {
      await api.post(`/files/upload/${id}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      await loadOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
    }
  };

  const downloadFile = async (fileId, fileName) => {
    try {
      const res = await api.get(`/files/download/${fileId}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Download failed. The file may no longer exist on the server.');
    }
  };

  const deleteFile = async (fileId) => {
    if (!confirm('Delete this file?')) return;
    try {
      await api.delete(`/files/delete/${fileId}`);
      await loadOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Delete failed');
    }
  };

  const advanceStatus = () => {
    const next = STATUS_CONFIG[order.status]?.next;
    if (!next) return;
    setNextStatus(next);
    setShowStatusModal(true);
  };

  const confirmStatusChange = async () => {
    try {
      await api.patch(`/orders/${id}/status`, { status: nextStatus, notes: statusNote });
      setShowStatusModal(false);
      setStatusNote('');
      await loadOrder();
    } catch (err) {
      alert(err.response?.data?.error || 'Failed to update status');
    }
  };

  const cancelOrder = async () => {
    if (!confirm('Cancel this order?')) return;
    try {
      await api.patch(`/orders/${id}/status`, { status: 'cancelled' });
      await loadOrder();
    } catch {}
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin" /></div>;
  if (!order) return null;

  const cfg = STATUS_CONFIG[order.status];
  const nextCfg = cfg?.next ? STATUS_CONFIG[cfg.next] : null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
            <Link to="/orders" className="hover:text-brand-600">Orders</Link>
            <span>›</span>
            <span className="font-mono">{order.order_number}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{order.title}</h1>
          <div className="flex items-center gap-2 mt-2">
            <span className={`badge ${cfg?.color}`}>{cfg?.label}</span>
            <span className={`badge ${order.priority === 'urgent' ? 'bg-red-100 text-red-700' : order.priority === 'high' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'}`}>
              {order.priority}
            </span>
            {order.due_date && (
              <span className="text-xs text-gray-500">Due: {new Date(order.due_date).toLocaleDateString()}</span>
            )}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {nextCfg && (
            <button onClick={advanceStatus} className="btn-primary">
              Move to {nextCfg.label} →
            </button>
          )}
          {/* Only non-digitizers can cancel orders */}
          {order.status !== 'cancelled' && order.status !== 'completed' && user?.role !== 'digitizer' && (
            <button onClick={cancelOrder} className="btn-secondary text-red-600">Cancel</button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Details Card */}
          <div className="card p-5 space-y-4">
            <h2 className="font-semibold text-gray-900">Order Details</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              {[
                ['Customer', order.customer_name || '—'],
                ['Assigned To', order.assigned_to_name || 'Unassigned'],
                ['Created By', order.created_by_name],
                ['Garment Type', order.garment_type || '—'],
                ['Quantity', order.quantity],
                ['Stitch Count', order.stitch_count || '—'],
                ['Width', order.width_mm ? `${order.width_mm} mm` : '—'],
                ['Height', order.height_mm ? `${order.height_mm} mm` : '—'],
                ['Thread Colors', order.thread_colors || '—'],
                ['Created', new Date(order.created_at).toLocaleDateString()],
              ].map(([k, v]) => (
                <div key={k}>
                  <p className="text-xs text-gray-500 uppercase tracking-wide">{k}</p>
                  <p className="font-medium text-gray-900 mt-0.5">{v}</p>
                </div>
              ))}
            </div>
            {order.description && (
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{order.description}</p>
              </div>
            )}
          </div>

          {/* Files */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Files ({order.files?.length || 0})</h2>
              <div>
                <input type="file" ref={fileInputRef} multiple className="hidden" onChange={handleFileUpload}
                  accept=".ai,.eps,.svg,.pdf,.dst,.emb,.pes,.jef,.vp3,.hus,.exp,.png,.jpg,.jpeg,.gif,.tif,.tiff,.psd,.bmp" />
                <button onClick={() => fileInputRef.current.click()} className="btn-secondary" disabled={uploading}>
                  {uploading ? 'Uploading…' : '+ Upload Files'}
                </button>
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-3">Supported: .ai, .eps, .svg, .pdf, .dst, .emb, .pes, .jef, .png, .jpg, .psd and more</p>
            {order.files?.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 text-sm">
                No files yet — upload art, DST, or EMB files
              </div>
            ) : (
              <div className="space-y-2">
                {order.files?.map(file => (
                  <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <span className="text-xl">{FILE_ICONS[file.file_category] || '📎'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{file.original_name}</p>
                      <p className="text-xs text-gray-500">
                        {file.file_category?.toUpperCase()} · {formatBytes(file.file_size)} · {file.uploaded_by_name} · {new Date(file.uploaded_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => downloadFile(file.id, file.original_name)}
                        className="text-xs text-brand-600 hover:underline px-2 py-1 rounded hover:bg-brand-50">
                        Download
                      </button>
                      {/* Digitizers can never delete files */}
                      {user?.role !== 'digitizer' && (isAdmin || ['manager'].includes(user?.role) || file.uploaded_by === user?.id) && (
                        <button onClick={() => deleteFile(file.id)}
                          className="text-xs text-red-500 hover:underline px-2 py-1 rounded hover:bg-red-50">
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage History */}
          <div className="card p-5">
            <h2 className="font-semibold text-gray-900 mb-4">Stage History</h2>
            <div className="space-y-3">
              {order.history?.map(h => (
                <div key={h.id} className="flex items-start gap-3 text-sm">
                  <div className="w-2 h-2 bg-brand-400 rounded-full mt-1.5 flex-shrink-0" />
                  <div>
                    <p className="text-gray-900">
                      {h.from_status ? <><span className="font-medium capitalize">{h.from_status}</span> → </> : ''}
                      <span className="font-medium capitalize">{h.to_status}</span>
                      {' '}by <span className="font-medium">{h.changed_by_name}</span>
                    </p>
                    {h.notes && <p className="text-gray-500 italic mt-0.5">"{h.notes}"</p>}
                    <p className="text-gray-400 text-xs mt-0.5">{new Date(h.changed_at).toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column — Order Chat */}
        <div className="card flex flex-col" style={{ height: '600px' }}>
          <div className="px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Order Chat</h2>
            <p className="text-xs text-gray-400">Discuss this order with your team</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-gray-400 text-sm mt-8">No messages yet</p>
            )}
            {messages.map(msg => (
              <div key={msg.id} className={`flex gap-2 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                <div className="w-6 h-6 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0 mt-1">
                  {msg.user_name?.charAt(0).toUpperCase()}
                </div>
                <ChatBubble
                  msg={msg}
                  isOwn={msg.user_id === user?.id}
                  canDelete={msg.user_id === user?.id || user?.role === 'admin'}
                  onDelete={async (msgId) => {
                    try { await api.delete(`/chat/messages/${msgId}`); setMessages(m => m.filter(m2 => m2.id !== msgId)); } catch {}
                  }}
                />
              </div>
            ))}
            <div ref={msgEndRef} />
          </div>
          <form onSubmit={sendMessage} className="p-3 border-t border-gray-100 flex gap-2 items-center">
            <input type="file" ref={chatImgRef} accept="image/*" className="hidden" onChange={sendChatImage} />
            <button type="button" onClick={() => chatImgRef.current.click()}
              disabled={uploadingChatImg}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-gray-100 hover:bg-gray-200 text-sm flex-shrink-0 disabled:opacity-50"
              title="Send a photo">
              {uploadingChatImg ? <div className="w-3 h-3 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" /> : '📷'}
            </button>
            <input className="input flex-1 text-sm" placeholder="Type a message…" value={newMsg}
              onChange={e => setNewMsg(e.target.value)} />
            <button type="submit" className="btn-primary px-3 h-9 flex-shrink-0" disabled={sendingMsg || !newMsg.trim()}>→</button>
          </form>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Move to {STATUS_CONFIG[nextStatus]?.label}?
            </h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
              <textarea className="input" rows={3} value={statusNote}
                onChange={e => setStatusNote(e.target.value)}
                placeholder="Any notes about this stage change…" />
            </div>
            <div className="flex gap-3 mt-4">
              <button onClick={() => setShowStatusModal(false)} className="btn-secondary flex-1 justify-center">Cancel</button>
              <button onClick={confirmStatusChange} className="btn-primary flex-1 justify-center">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
