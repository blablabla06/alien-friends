import stranger        from './stranger.json'
import coworkerJamie   from './coworker-jamie.json'
import coworkerMorgan  from './coworker-morgan.json'
import oldFriend       from './old-friend.json'
import uniTeammate     from './uni-teammate.json'
import mum             from './mum.json'
import oldBestFriend   from './old-best-friend.json'

// Keyed by the npcRef used in scenario JSON files
const characters = {
  stranger,
  'coworker-jamie':   coworkerJamie,
  'coworker-morgan':  coworkerMorgan,
  'old-friend':       oldFriend,
  'uni-teammate':     uniTeammate,
  mum,
  'old-best-friend':  oldBestFriend,
}

export default characters
