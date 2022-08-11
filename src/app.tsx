import React, { useEffect, useState, useRef, useCallback } from "react";
import cls from "classnames";
import { io, Socket } from "socket.io-client";
import { parse, changeUrlArg } from "@/utils/query-string";
import { getUserInfo } from "@/api/user";
import "./app.less";

// 音视频通话状态
enum CALL_STATUS {
  // 拨打中
  CALLING,
  // 正在通话中
  TALKING,
  // 空闲状态
  FREE,
}

// socket 命令
enum SOCKET_COMMAND {
  // 交换SDP的命令
  SDP = "sdp",
  // ICE candidate
  ICE = "ice",
  // 消息通知
  MESSAGE = "message",
  // 创建房间
  CREATE = "create",
  // 加入房间
  JOIN = "join",
  // 已加入房间
  JOINED = "joined",
  // 其他人已加入房间
  OTHER_JOINED = "otherJoined",
  // 离开房间
  LEAVE = "leave",
  // 已离开房间
  LEFT = "left",
  // 其他人已离开房间
  OTHER_LEFT = "otherLeft",
  // 更换房主
  CHANGE_ROOMOWNER = "changeRoomowner",
  // 已中断连接
  DISCONNECTED = "disconnected",
  // 房间已满
  FULL = "full",
}

interface UserInfo {
  name: string;
  id: string;
}

const mediaStreamConstraints = {
  video: {
    frameRate: { min: 20 },
    width: { min: 640, ideal: 1280 },
    height: { min: 360, ideal: 720 },
    aspectRatio: 16 / 9,
    facingMode: "user", // user:前置摄像头，environment:后置摄像头
  },
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
};

// socket.io对象
let socket: Socket | null = null;

// peer连接 map（以与本端建立连接的远端用户的id为key）
const peerConnectMap = new Map<string, RTCPeerConnection>();

/**
 * 构建P2P的过程
 * 1.io.connect，通过socket.io连接上信令服务器，创建一个房间
 * 2.连接成功后，获取本地媒体数据流
 * 3.监听房间是否进入用户
 * 4.若有用户进入，创建RTCPeerCOnnection，创建SDP offer，发送offer，设置本地offer
 * 5.监听服务端的socket的消息，如果有offer类消息发送过来，需要设置远程offer，构建SDP answer，发送answer
 */

function App() {
  const query = parse(window.location.href);
  const [isSupport, setIsSupport] = useState<boolean>(true);
  const [userInfo, setUserInfo] = useState<UserInfo>();
  // 房间ID
  const [roomId, setRoomId] = useState<string>(query.room || "");
  const [isRoomowner, setIsRoomowner] = useState<boolean>(!roomId);
  const isRoomownerRef = useRef<boolean>(!roomId);
  // 通话状态
  const [status, setStatus] = useState<CALL_STATUS>(CALL_STATUS.FREE);
  const localStreamRef = useRef<MediaStream>();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const localRef = useRef<HTMLVideoElement | null>(null);
  const remoteRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    checkDevices();
  }, []);

  useEffect(() => {
    if (!isSupport) return;
    initSocketIO();
  }, [isSupport]);

  useEffect(() => {
    if (!localStream) return;
    const localPlayStream = localStream;
    // 本地播放的媒体流需要过滤音频轨道，避免回音
    localStream?.getAudioTracks().forEach((track: MediaStreamTrack) => {
      localPlayStream.removeTrack(track);
    });
    // 设置到本地播放器的数据源
    localRef &&
      localRef.current &&
      (localRef.current.srcObject = localPlayStream);
  }, [localStream]);

  useEffect(() => {
    if (!remoteStream) return;
    remoteRef &&
      remoteRef.current &&
      (remoteRef.current.srcObject = remoteStream);
  }, [remoteStream]);

  useEffect(() => {
    getUserInfo<UserInfo>(query.userId)
      .then((userInfo) => {
        setUserInfo(userInfo);
      })
      .catch((err) => {
        console.warn(err);
      });
  }, []);

  useEffect(() => {
    setIsRoomowner(!roomId || roomId === socket?.id);
  }, [roomId]);

  // 发起视频
  const handleCall = async () => {
    setStatus(CALL_STATUS.CALLING);
    sendCommand(SOCKET_COMMAND.CREATE, { userId: query.userId });
  };

  // 加入视频
  const handleJoin = async () => {
    const localStream = await getLocalStream();
    if (!localStream) return;
    localStreamRef.current = localStream;
    setLocalStream(localStream);
    setStatus(CALL_STATUS.CALLING);
    // 从接口或者url中获取房间号，如果房间号不为空，则加入房间，否则自己创建一个房间
    if (roomId) {
      sendCommand(SOCKET_COMMAND.JOIN, { roomId, userId: query.userId });
    }
  };

  // 挂断视频
  const handleHangUp = () => {
    if (!socket) return;
    // 通知信令服务器，断开通话
    sendCommand(SOCKET_COMMAND.LEAVE, { roomId, senderUserId: query.userId });
  };

  // 连接socket
  const initSocketIO = async () => {
    if (socket) return;
    const localStream = await getLocalStream();
    if (!localStream) return;
    socket = io("http://localhost:3010", { auth: { userId: query.userId } });
    // socket = io("https://tankscode.cn:3010", { auth: { userId: query.userId } });
    // 连接上服务端的socketio时会自动创建一个以socket.id为id的房间
    socket.connect();
    // 监听socketio的命令
    addListener();
    localStreamRef.current = localStream;
    setLocalStream(localStream);
  };

  // 检测是否支持
  const checkDevices = () => {
    // 判断浏览器是否支持这些 API
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
      console.log("enumerateDevices() not supported.");
      setIsSupport(false);
    }
  };

  /**
   * 添加socketio的监听
   */
  const addListener = () => {
    // 连接socket.io成功
    socket?.on("connect", () => {
      // 如果是roomId为空，则是房主，设置房间id
      if (!roomId) {
        const query = parse(window.location.href);
        // 更新是否是房主的引用
        isRoomownerRef.current = socket?.id === query.room;
        // 更新房间id
        setRoomId(socket?.id || "");
      }

      // 消息通知
      socket?.on(SOCKET_COMMAND.MESSAGE, onMessage);

      // 已加入房间
      socket?.on(SOCKET_COMMAND.JOINED, onJoined);

      // 其他人已加入房间
      socket?.on(SOCKET_COMMAND.OTHER_JOINED, onOtherJoined);

      // 自己已离开房间
      socket?.on(SOCKET_COMMAND.LEFT, onLeft);

      // 其他人已离开房间
      socket?.on(SOCKET_COMMAND.OTHER_LEFT, onOtherLeft);

      // 更换房主
      socket?.on(SOCKET_COMMAND.CHANGE_ROOMOWNER, onChangeRoomowner);

      // 房间已满
      socket?.on(SOCKET_COMMAND.FULL, onFull);

      // SDP
      socket?.on(SOCKET_COMMAND.SDP, onSDP);

      // ICE
      socket?.on(SOCKET_COMMAND.ICE, onICE);
    });

    // 断开socket.io的连接
    socket?.on("disconnect", () => {
      console.log("断开连接");
    });
  };

  /**
   * 消息通知
   */
  const onMessage = (msg: string) => {
    console.log("消息通知：", msg);
  };

  /**
   * 已加入房间
   * @param {string} roomId
   * @param {string} roomownerId
   * @param {number} roomSize
   */
  const onJoined = async ({
    roomId,
    roomownerId,
    roomSize,
  }: {
    roomId: string;
    roomownerId: string;
    roomSize: number;
  }) => {
    console.log("自己已成功加入房间");
    // const localStream = await getLocalStream();
    // 建立peer connection通道
    createPeerConnection(roomownerId);
    setStatus(CALL_STATUS.TALKING);
  };

  /**
   * 其他人已加入房间
   * @param {string} socketId
   * @param {string} joinedId
   */
  const onOtherJoined = async ({
    socketId,
    joinedId,
  }: {
    socketId: string;
    joinedId: string;
  }) => {
    // 建立peer connection通道
    createPeerConnection(joinedId);
    setStatus(CALL_STATUS.TALKING);

    const pc = peerConnectMap.get(joinedId);
    if (!pc) return;

    const offerOptions: RTCOfferOptions = {
      offerToReceiveAudio: true,
      offerToReceiveVideo: true,
    };
    // 创建SDP offer
    pc.createOffer(offerOptions)
      .then((desc: RTCSessionDescriptionInit) => {
        getOffer(joinedId, pc, desc);
      })
      .catch(handleOfferError);
  };

  /**
   * 自己已离开房间
   * @param {string} roomId
   */
  const onLeft = ({ roomId }: { roomId: string }) => {
    // 停止获取媒体流数据
    localStreamRef.current?.getTracks().forEach((track) => track.stop());
    // 关闭所有peer connection通道
    peerConnectMap.forEach((pc) => {
      pc.close();
    });
    // 设置当前通话状态为空闲状态
    setStatus(CALL_STATUS.FREE);
    // 清空video的是媒体数据源
    localRef && localRef.current && (localRef.current.srcObject = null);
    // 如果是房主，退出房间后，房主将转移到其他成员身上，url中的room将失效，所以将url中的room清空
    // TODO 这里可以改为服务端传一个数据判断是否是房主
    if (isRoomownerRef.current) {
      const newUrl = changeUrlArg(window.location.href, "room", "");
      window.history.replaceState({}, "", newUrl);
    }
  };

  /**
   * 其他人已离开房间
   * @param {string} roomId
   * @param {string} senderUserId
   */
  const onOtherLeft = ({
    roomId,
    senderUserId,
  }: {
    roomId: string;
    senderUserId: string;
  }) => {
    console.log(`${senderUserId} 已离开房间`);
    // 根据userId获取相应的pc
    const pc = peerConnectMap.get(senderUserId);
    pc?.close();
  };

  /**
   * 更换房主
   * @param {string} roomId
   * @param {string} newOwnerUserId
   * @param {string} newOwnerSocketId
   */
  const onChangeRoomowner = ({
    roomId,
    newOwnerUserId,
    newOwnerSocketId,
  }: {
    roomId: string;
    newOwnerUserId: string;
    newOwnerSocketId: string;
  }) => {
    console.log(roomId, newOwnerUserId, newOwnerSocketId);
    const newUrl = changeUrlArg(window.location.href, "room", newOwnerSocketId);
    window.history.replaceState({}, "", newUrl);

    // 更新是否是房主的引用
    isRoomownerRef.current = newOwnerSocketId === socket?.id;
    // 更新房间ID
    setRoomId(newOwnerSocketId);
  };

  /**
   * 房间已满
   */
  const onFull = () => {
    console.log("房间已满，无法加入");
  };

  /**
   * SDP
   * @param {string} userId
   * @param {RTCSessionDescriptionInit} desc
   */
  const onSDP = ({
    userId,
    desc,
  }: {
    userId: string;
    desc: RTCSessionDescriptionInit;
  }) => {
    // 根据userId获取相应的pc
    const pc = peerConnectMap.get(userId);
    if (!pc) return;
    // 别人发的offer
    if (desc.type === "offer") {
      console.warn("setRemoteOffer");
      pc.setRemoteDescription(desc);

      // 创建SDP answer
      const answerOptions: RTCOfferOptions = {
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      };
      pc.createAnswer(answerOptions)
        .then((desc: RTCSessionDescriptionInit) => {
          getAnswer(userId, pc, desc);
        })
        .catch(handleAnswerError);
    } else if (desc.type === "answer") {
      console.warn("setRemoteAnswer");
      pc.setRemoteDescription(desc);
    }
  };

  /**
   * ICE
   * @param {string} userId
   * @param {RTCIceCandidateInit} candidate
   */
  const onICE = ({
    userId,
    candidate,
  }: {
    userId: string;
    candidate: RTCIceCandidateInit;
  }) => {
    // 根据userId获取相应的pc
    const pc = peerConnectMap.get(userId);
    pc?.addIceCandidate(new RTCIceCandidate(candidate))
      .then(async () => {
        console.log(`来自${userId}的ICE addIceCandidate 成功`, candidate);
      })
      .catch(() => {
        console.log(`来自${userId}的ICE addIceCandidate 失败`, candidate);
      });
  };

  /**
   * 建立P2P连接
   * @param userId 与本端建立连接的远端用户的id
   */
  const createPeerConnection = (userId: string) => {
    const localStream = localStreamRef.current;
    console.log("create RTCPeerConnection!");
    // pc = new RTCPeerConnection(pcConfig);
    // TODO 暂不使用TURN服务器
    const pc = new RTCPeerConnection();
    // 添加到映射
    peerConnectMap.set(userId, pc);

    // 调用setLocalDescription事件，会触发此事件
    pc.onicecandidate = (event: RTCPeerConnectionIceEvent): any => {
      if (event.candidate) {
        console.log(`自己的candidate`, event.candidate);
        // 传送给远端
        sendCommand(SOCKET_COMMAND.ICE, {
          senderUserId: query.userId,
          recipientUserId: userId,
          candidate: event.candidate,
        });
      } else {
        console.log("this is the end candidate", event);
      }
    };

    // 有远程数据流的时候触发
    pc.ontrack = getRemoteStream;

    // 媒体流轨道添加到 peer connection之后触发
    pc.onnegotiationneeded = (event: Event) => {
      console.log("媒体流轨道已经添加到 peer connection", event);
    };

    console.log("本地的媒体流轨道", localStream?.getTracks());
    // 将所有媒体流轨道都添加到 peer connection
    localStream?.getTracks().forEach((track) => {
      pc?.addTrack(track, localStream);
    });
  };

  /**
   * 获取生成的 SDP offer
   * @param recipientUserId 需要接收此sdp的用户id
   * @param pc peer connection 对象
   * @param desc SDP协议的描述信息
   */
  const getOffer = async (
    recipientUserId: string,
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit
  ) => {
    // 保存offer到本地
    await pc.setLocalDescription(desc);

    // 将 offer sdp 发送到信令服务器
    sendCommand(SOCKET_COMMAND.SDP, {
      roomId,
      socketId: socket?.id,
      senderUserId: query.userId,
      recipientUserId,
      desc,
    });
  };

  /**
   * 获取的 SDP answer
   * @param recipientUserId 需要接收此sdp的用户id
   * @param pc peer connection 对象
   * @param desc SDP协议的描述信息
   */
  const getAnswer = async (
    recipientUserId: string,
    pc: RTCPeerConnection,
    desc: RTCSessionDescriptionInit
  ) => {
    await pc.setLocalDescription(desc);

    // 将 answer sdp 发送到信令服务器
    sendCommand(SOCKET_COMMAND.SDP, {
      roomId,
      socketId: socket?.id,
      senderUserId: query.userId,
      recipientUserId,
      desc,
    });
  };

  /**
   * 向服务器发送命令，服务器执行相应操作
   * @param command
   * @param data
   */
  const sendCommand = (command: SOCKET_COMMAND, data: Record<string, any>) => {
    console.log("向信令服务器发送命令\n", command, data);
    if (!socket) return;
    socket.emit(command, data);
  };

  // 获取音视频媒体流
  const getLocalStream = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia(
        mediaStreamConstraints
      );
      return mediaStream;
    } catch (err: any) {
      console.log("getUserMedia 失败", err.message);
    }
  };

  /**
   * 获取远程媒体流
   * @param event
   */
  const getRemoteStream = (event: RTCTrackEvent) => {
    setRemoteStream(event.streams[0]);
  };

  // 处理创建offer的错误
  const handleOfferError = (err: any) => {
    console.error("Failed to create offer:", err);
  };

  // 处理创建answer的错误
  const handleAnswerError = (err: any) => {
    console.error("Failed to create answer:", err);
  };

  return (
    <div className='webrtc-cmp'>
      {!isSupport ? (
        <p className='not-support'>当前浏览器暂不支持音视频通话</p>
      ) : (
        <>
          <div className='stream-box'>
            <p className='stream-title'>本端：{userInfo?.name}</p>
            {localStream && (
              <video ref={localRef} id='local-stream' autoPlay playsInline />
            )}
          </div>
          <div className='stream-box'>
            <p className='stream-title'>远端</p>
            {remoteStream && (
              <video ref={remoteRef} id='remote-stream' autoPlay playsInline />
            )}
          </div>

          <div className='operate-area'>
            {isRoomowner ? (
              <div
                className={cls("call-btn", {
                  disabled: status !== CALL_STATUS.FREE,
                })}
                onClick={handleCall}
              >
                发起视频
              </div>
            ) : (
              <div
                className={cls("join-btn", {
                  disabled: status !== CALL_STATUS.FREE,
                })}
                onClick={handleJoin}
              >
                加入视频
              </div>
            )}

            <div
              className={cls("hang-up-btn", {
                disabled: status === CALL_STATUS.FREE,
              })}
              onClick={handleHangUp}
            >
              退出视频
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
