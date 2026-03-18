import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

export default function Chat() {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [sending, setSending] = useState(false);
  const msgEndRef = useRef();
  const pollRef = useRef();

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
    const date = new Date(msg.created_at).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = [];
    acc[date].push(msg);
    return acc;
  }, {});

  const ROLE_COLORS = {
    admin: 'text-red-500',
    digitizer: 'text-purple-500',
    production: 'text-orange-500',
    staff: 'text-brand-600',
  };

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Team Chat</h1>
        <p className="text-gray-500 text-sm">General team communication</p>
      </div>

      <div className="card flex-1 flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
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
              {msgs.map(msg => (
                <div key={msg.id} className={`flex gap-3 mb-3 group ${msg.user_id === user?.id ? 'flex-row-reverse' : ''}`}>
                  <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm flex-shrink-0">
                    {msg.user_name?.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${msg.user_id === user?.id ? 'items-end' : 'items-start'} flex flex-col`}>
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className={`text-xs font-semibold ${ROLE_COLORS[msg.user_role] || 'text-gray-600'}`}>
                        {msg.user_name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={`px-4 py-2.5 rounded-2xl text-sm relative ${
                      msg.user_id === user?.id
                        ? 'bg-brand-600 text-white rounded-tr-sm'
                        : 'bg-gray-100 text-gray-900 rounded-tl-sm'
                    }`}>
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {(msg.user_id === user?.id || user?.role === 'admin') && (
                      <button onClick={() => deleteMessage(msg.id)}
                        className="text-xs text-gray-300 hover:text-red-500 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))}
          <div ref={msgEndRef} />
        </div>

        {/* Input */}
        <div className="border-t border-gray-100 p-4">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              className="input flex-1"
              placeholder="Type a message to the team…"
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e); }}}
            />
            <button type="submit" className="btn-primary px-5" disabled={sending || !newMsg.trim()}>
              Send
            </button>
          </form>
          <p className="text-xs text-gray-400 mt-2">Press Enter to send · Check individual orders for order-specific chat</p>
        </div>
      </div>
    </div>
  );
}
