import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import { ChatBubble } from '../components/ChatMessage';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const msgEndRef = useRef();
  const pollRef = useRef();
  const imgInputRef = useRef();

  const loadMessages = async () => {
    try {
      const res = await api.get('/chat/messages?orderId=null&limit=100');
      setMessages(res.data);
    } catch {}
  };

  useEffect(() => {
    loadMessages();
    pollRef.current = setInterval(loadMessages, 3000);
    return () => clearInterval(pollRef.current);
  }, []);

  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMsg.trim()) return;
    setSending(true);
    try {
      const res = await api.post('/chat/messages', { content: newMsg, orderId: null });
      setMessages(m => [...m, res.data]);
      setNewMsg('');
    } catch {} finally { setSending(false); }
  };

  const sendImage = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.post('/chat/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessages(m => [...m, res.data]);
    } catch (err) {
      alert(err.response?.data?.error || 'Image upload failed');
    } finally {
      setUploadingImage(false);
      imgInputRef.current.value = '';
    }
  };

  const deleteMessage = async (msgId) => {
    try {
      await api.delete(`/chat/messages/${msgId}`);
      setMessages(m => m.filter(msg => msg.id !== msgId));
    } catch (err) {
      alert(err.response?.data?.error || 'Could not delete message');
    }
  };

  // Group messages by date
  const grouped = messages.reduce((acc, msg) => {
    const date = new Date(msg.created_at).toLocaleDateString('en-US',
      { weekday: 'long', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 7rem)' }}>
      <div className="mb-3 flex-shrink-0">
        <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
        <p className="text-gray-500 text-sm">General team communication</p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">💬</p>
              <p>No messages yet. Say hello to the team!</p>
            </div>
          )}
          {Object.entries(grouped).map(([date, msgs]) => (
            <div key={date}>
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 border-t border-gray-100" />
                <span className="text-xs text-gray-400 font-medium">{date}</span>
                <div className="flex-1 border-t border-gray-100" />
              </div>
              <div className="space-y-3">
                {msgs.map(msg => (
                  <div key={msg.id} className={`flex gap-2 ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                    <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-xs flex-shrink-0 mt-1">
                      {msg.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <ChatBubble
                      msg={msg}
                      isOwn={msg.user_id === user?.id}
                      canDelete={msg.user_id === user?.id || user?.role === 'admin'}
                      onDelete={deleteMessage}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-3 flex-shrink-0">
          <form onSubmit={sendMessage} className="flex gap-2 items-end">
            {/* Photo button */}
            <input type="file" ref={imgInputRef} accept="image/*" className="hidden" onChange={sendImage} />
            <button type="button" onClick={() => imgInputRef.current.click()}
              disabled={uploadingImage}
              className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
              title="Send a photo">
              {uploadingImage ? (
                <div className="w-4 h-4 border-2 border-gray-400 border-t-gray-700 rounded-full animate-spin" />
              ) : '📷'}
            </button>
            <input
              className="input flex-1"
              placeholder="Type a message…"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }}}
            />
            <button type="submit" className="btn-primary px-4 h-10 flex-shrink-0"
              disabled={sending || !newMsg.trim()}>
              Send
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-1.5">Enter to send · 📷 to share a photo from your phone</p>
        </div>
      </div>
    </div>
  );
}
