// Renders a chat message — detects [IMAGE:/uploads/...] and shows the photo inline
const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || '';

export function ChatBubble({ msg, isOwn, onDelete, canDelete }) {
  const isImage = msg.content?.startsWith('[IMAGE:');
  const imageUrl = isImage
    ? API_BASE + msg.content.replace('[IMAGE:', '').replace(']', '')
    : null;

  return (
    <div className={`flex flex-col group ${isOwn ? 'items-end' : 'items-start'}`}>
      {!isOwn && (
        <p className="text-xs font-semibold text-brand-600 mb-1 px-1">{msg.user_name}</p>
      )}
      <div className={`max-w-[80%] rounded-2xl overflow-hidden text-sm
        ${isOwn ? 'bg-brand-600 text-white rounded-tr-sm' : 'bg-gray-100 text-gray-900 rounded-tl-sm'}
        ${isImage ? '' : 'px-3 py-2'}`}>
        {isImage ? (
          <a href={imageUrl} target="_blank" rel="noopener noreferrer">
            <img src={imageUrl} alt="Shared photo"
              className="max-w-full max-h-64 object-contain cursor-pointer hover:opacity-90 transition-opacity" />
          </a>
        ) : (
          <p className="whitespace-pre-wrap">{msg.content}</p>
        )}
      </div>
      <div className={`flex items-center gap-2 mt-1 px-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
        <span className="text-xs text-gray-400">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
        {canDelete && (
          <button onClick={() => onDelete(msg.id)} className="text-xs text-red-400 hover:text-red-600">
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
