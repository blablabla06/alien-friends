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
  'stranger':          { bg: '#8A8FA3', text: '#1A1D29' },
  'coworker-jamie':    { bg: '#FFD166', text: '#1A1D29' },
  'coworker-morgan':   { bg: '#FFD166', text: '#1A1D29' },
  'old-friend':        { bg: '#D4A574', text: '#1A1D29' },
  'uni-teammate':      { bg: '#9B6B8C', text: '#1A1D29' },
  'mum':               { bg: '#F9A8D4', text: '#1A1D29' },
  'old-best-friend':   { bg: '#6EE7B7', text: '#1A1D29' },
}

export default function NpcAvatar({ characterId, name }) {
  const img     = AVATAR_IMAGES[characterId]
  const palette = AVATAR_PALETTE[characterId] ?? { bg: '#8A8FA3', text: '#1A1D29' }

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
