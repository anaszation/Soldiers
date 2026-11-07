export type PlayerColor = 'blue' | 'red';

export type SoldierType = 
  | 'rifleman'
  | 'bazooka'
  | 'sniper'
  | 'tank'
  | 'commander'
  | 'scout'
  | 'machinegun'
  | 'mortar'
  | 'radio'
  | 'bunker';

export interface Soldier {
  id: string;
  type: SoldierType;
  player: PlayerColor;
  x: number; // 0 to 1000 coordinate space
  y: number; // 0 to 700 coordinate space
  radius: number; // collision radius ~22px
  alive: boolean;
  killProgress: number; // 0 to 1 for cross-out scribble animation
}

export type GamePhase = 
  | 'MENU'
  | 'DEPLOY_BLUE'
  | 'PRIVACY_SWITCH'
  | 'DEPLOY_RED'
  | 'RPS_STANDOFF'
  | 'TURN_AIM'
  | 'TURN_FOLD'
  | 'TURN_REVEAL'
  | 'GAME_OVER';

export type GameMode = 'LOCAL_1V1' | 'VS_AI' | 'ONLINE_P2P';

export type RPSChoice = 'rock' | 'paper' | 'scissors';

export interface StrikeRecord {
  id: string;
  shooter: PlayerColor;
  strikeX: number; // on shooter's half
  strikeY: number;
  mirroredX: number; // mirrored across center crease
  mirroredY: number;
  hit: boolean;
  killedSoldierId?: string;
  timestamp: number;
}
