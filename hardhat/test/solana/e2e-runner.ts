import { ethers } from 'hardhat';
import WebSocket from 'ws';
import { deploy } from './utils/deploy';

import type { Bridge } from '../../scripts/bridge-ts/artifacts-types/Bridge';
import type { Portal } from '../../scripts/bridge-ts/artifacts-types/Portal';
import type { Synthesis } from '../../scripts/bridge-ts/artifacts-types/Synthesis';


const port = 3331;

class WSTestHelperClient extends WebSocket {
  private pingTimeout: number = 0;
  private handlerTimeout: TimerHandler;

  constructor(url: string, options: WebSocket.ClientOptions = {}) {
    super(url, options);

    // const heartbeat = this.heartbeat.bind(this);
    // this.on('open', heartbeat);
    // this.on('ping', heartbeat);
    // this.on('pong', heartbeat);
    this.on('close', this.clear.bind(this));    
    // this.on('pong', () => { console.log('c ws pong'); });
    // this.on('ping', () => { console.log('c ws ping'); });

    this.handlerTimeout = () => {
      console.log('terminate by timeout');
      this.terminate();
    };

    // setTimeout(() => {
    //   console.log('timeout 1');
    //   this.close()
    // }, 20000);
  }

  protected clear() {
    console.log('ws client close');
    clearTimeout(this.pingTimeout);
  }

  protected heartbeat() {
    console.log('heartbeat');
  
    clearTimeout(this.pingTimeout);
    this.pingTimeout = setTimeout(this.handlerTimeout, 1100);
  }
}


const sleep = async (s: number) => new Promise(resolve => setTimeout(resolve, s * 1000));


describe("Solana e2e test", function () {
  let ws: WSTestHelperClient;
  let pClose: Promise<void>;

  let bridge: Bridge;
  // let portalAddress32: string;
  let portal: Portal;
  // let synthesisAddress32: string;
  let synthesis: Synthesis;
  // let wrapper: EthSolWrapper;

  const connect = async (url: string): Promise<boolean> => new Promise((resolve) => {
    ws = new WSTestHelperClient(url);
    ws.once('open', () => resolve(true));
    ws.once('error', () => resolve(false));
  });

  before(async () => {
    console.log('connecting');
    let connected: boolean = false;
    for(let i = 0; i < 10; i++) {
      connected = await connect(`ws://localhost:${ port }`);
      if ( connected ) {
        console.log('connected');
        pClose = new Promise(resolve => ws.on('close', resolve));
        break;
      }
      await sleep(1);
    }
    if ( !connected ) {
      throw new Error("Unable to connect");
    }
  });

  it("deploy EYWA contracts", async () => {
    const config = await deploy();

    const admin = (await ethers.getSigners())[0].address;
    const network = await ethers.provider.detectNetwork();

    const data = JSON.stringify({
      event: 'deployed',
      url: ethers.provider.connection.url,
      chainId: network.chainId,
      addresses: { ...config, admin },
    }, null, 2);
    ws.send(data, (err) => {
      if ( err ) {
        console.log('Error:', err);
        return;
      }

      console.log('sended');
    });

    // portalAddress32 = `0x000000000000000000000000${config.portal.substr(2)}`;
    // expect(portalAddress32.length).equal(66);

    // synthesisAddress32 = `0x000000000000000000000000${config.synthesis.substr(2)}`;
    // expect(synthesisAddress32.length).equal(66);

    bridge = (await ethers.getContractFactory("Bridge")).attach(config.bridge);
    portal = (await ethers.getContractFactory("Portal")).attach(config.portal);
    synthesis = (await ethers.getContractFactory("Synthesis")).attach(config.synthesis);

    bridge.on('ReceiveRequest', (...args) => console.log(args));
  });

  it("test", async () => {
    const admin = (await ethers.getSigners())[0].address;

    console.log('getNonce', await bridge.getNonce(admin));
    console.log('getBalance:', await ethers.provider.getBalance(admin));
  });

  after(async () => {
    await pClose;
  });
});
