import strangerImg       from '../assets/avatars/stranger.png'
import jamieImg          from '../assets/avatars/coworker-jamie.png'
import morganImg         from '../assets/avatars/coworker-morgan.png'
import oldFriendImg      from '../assets/avatars/old-friend.png'
import uniTeammateImg    from '../assets/avatars/uni-teammate.png'
import mumImg            from '../assets/avatars/mum.png'
import oldBestFriendImg  from '../assets/avatars/old-best-friend.png'

const AVATAR_IMAGES = {
  'stranger':          strangerImg,
  'coworker-jamie':    jamieImg,
  'coworker-morgan':   morganImg,
  'old-friend':        oldFriendImg,
  'uni-teammate':      uniTeammateImg,
  'mum':               mumImg,
  'old-best-friend':   oldBestFriendImg,
}

const AVATAR_PALETTE = {
  'stranger':          { bg: '#4ECDC4', text: '#1A1B3A' },
  'coworker-jamie':    { bg: '#FFD166', text: '#1A1B3A' },
  'coworker-morgan':   { bg: '#FFD166', text: '#1A1B3A' },
  'old-friend':        { bg: '#FF8B5E', text: '#1A1B3A' },
  'uni-teammate':      { bg: '#A78BFA', text: '#1A1B3A' },
  'mum':               { bg: '#F9A8D4', text: '#1A1B3A' },
  'old-best-friend':   { bg: '#6EE7B7', text: '#1A1B3A' },
}

export default function NpcAvatar({ characterId, name }) {
  const img     = AVATAR_IMAGES[characterId]
  const palette = AVATAR_PALETTE[characterId] ?? { bg: '#4ECDC4', text: '#1A1B3A' }

  return (
    <div className="flex items-center gap-3">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 text-xl font-bold"
        style={img ? undefined : { backgroundColor: palette.bg, color: palette.text }}
      >
        {img ? (
          <img
            src={img}
            alt={name}
            className="w-full h-full object-cover"
            onError={e => {
              e.currentTarget.style.display = 'none'
              e.currentTarget.parentElement.textContent = name?.[0]?.toUpperCase() ?? '?'
            }}
          />
        ) : (
          name?.[0]?.toUpperCase() ?? '?'
        )}
      </div>
      <span className="font-display font-semibold text-warm-white">{name}</span>
    </div>
  )
}
