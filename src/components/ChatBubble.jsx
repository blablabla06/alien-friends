export default function ChatBubble({ role, text }) {
  const isUser = role === 'user'

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} px-1`}>
      <div
        className="max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed"
        style={
          isUser
            ? { backgroundColor: '#D4A574', color: '#1A1B3A', borderBottomRightRadius: 4 }
            : { backgroundColor: 'rgba(255,255,255,0.09)', color: '#F5F0E8', borderBottomLeftRadius: 4 }
        }
      >
        {text}
      </div>
    </div>
  )
}
