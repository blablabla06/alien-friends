## 1st version -- 26 July 2026
- build the foundation of practice mode

## 2nd version -- 27 July 2026
- build the foundation of main mode
- generate image of all characters using Miora
- generate background images for all scenes using Miora

## 3rd version -- 29 July 2026
- modified Chapter 2's plot (Daniel complaining evan during lunch --> Invite evan to lunch)
- added evan-early for this purpose and original evan file changed to evan-full.json
- moved all Codebuddy debug files to debug folder in gitignore
- realized that EvanTrust criteria is always 100 and other criteria is always 0, fixed it
- separate {npcResponse} returned into npcNarration and npcDialogue, only npcDialogue will appear in chat bubble

## 4th version -- 30 July 2026
- refined all the language part
- identified the model will response with {npcReply} instead of {npcReply && nextSuggestedReplies} and fixed it

## 5th version -- 31 July 2026
- Added voice (mp3 files) for all characters' initial dialogue
- Changed to use DeepSeek API insetad of Tencet Cloud
- remove unused function in llmClient.js and aiCharacterPrompt.js

## 6th version -- 3 August 2026
- scrollable chat (main)
- added loading animation
- added check history function

## 7th version -- 4 August 2026
- added background music
- add back button and mute button at DialogueScreen

## 8th version -- 5 August 2026
- fixed practice mode's navigation issue

## 9th version -- 6 August 2026
- deploy to cloud

## 10th version -- 7 August 2026
- fix main mode's UI issue