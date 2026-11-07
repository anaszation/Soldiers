import Peer, { DataConnection } from 'peerjs';
import { Soldier, RPSChoice } from '../game/types';

export interface NetworkPacket {
  type: 'DEPLOYMENT_READY' | 'RPS_MOVE' | 'STRIKE' | 'RESTART';
  payload?: any;
}

export class PeerConnection {
  private peer: Peer | null = null;
  private conn: DataConnection | null = null;
  public myPeerId: string = '';
  public isHost: boolean = false;
  public isConnected: boolean = false;

  public onConnected?: () => void;
  public onPacketReceived?: (packet: NetworkPacket) => void;
  public onError?: (err: any) => void;

  public init(isHost: boolean, targetPeerId?: string): Promise<string> {
    this.isHost = isHost;

    return new Promise((resolve, reject) => {
      // Create random short memorable peer id
      const prefix = 'paper-war-';
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const chosenId = isHost ? `${prefix}${randomSuffix}` : undefined;

      this.peer = new Peer(chosenId as any, {
        debug: 1,
      });

      this.peer.on('open', (id) => {
        this.myPeerId = id;
        if (!isHost && targetPeerId) {
          this.connectToPeer(targetPeerId);
        }
        resolve(id);
      });

      this.peer.on('connection', (connection) => {
        this.setupConnection(connection);
      });

      this.peer.on('error', (err) => {
        console.error('PeerJS error:', err);
        if (this.onError) this.onError(err);
        reject(err);
      });
    });
  }

  public connectToPeer(targetId: string) {
    if (!this.peer) return;
    const connection = this.peer.connect(targetId);
    this.setupConnection(connection);
  }

  private setupConnection(connection: DataConnection) {
    this.conn = connection;

    this.conn.on('open', () => {
      this.isConnected = true;
      if (this.onConnected) this.onConnected();
    });

    this.conn.on('data', (data) => {
      if (this.onPacketReceived) {
        this.onPacketReceived(data as NetworkPacket);
      }
    });

    this.conn.on('close', () => {
      this.isConnected = false;
    });

    this.conn.on('error', (err) => {
      console.error('Data connection error:', err);
    });
  }

  public send(packet: NetworkPacket) {
    if (this.conn && this.isConnected) {
      this.conn.send(packet);
    }
  }

  public destroy() {
    if (this.conn) this.conn.close();
    if (this.peer) this.peer.destroy();
  }
}
