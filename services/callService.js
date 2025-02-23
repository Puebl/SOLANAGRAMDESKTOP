const { RTCPeerConnection, RTCSessionDescription } = require('node-webrtc');
const io = require('socket.io-client');
const { desktopCapturer } = require('electron');

class CallService {
    constructor(signalingServer) {
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.socket = io(signalingServer);
        this.dataChannel = null;
        this.isCallActive = false;
        this.isVideoEnabled = false;
        this.isAudioEnabled = false;
        this.onCallStateChange = null;
        this.onRemoteStream = null;
        this.setupSocketListeners();
    }

    setupSocketListeners() {
        this.socket.on('offer', async (offer) => {
            await this.handleOffer(offer);
        });

        this.socket.on('answer', async (answer) => {
            await this.handleAnswer(answer);
        });

        this.socket.on('ice-candidate', async (candidate) => {
            await this.handleNewICECandidate(candidate);
        });
    }

    async initializeDevices(video = false) {
        try {
            const constraints = {
                audio: true,
                video: video ? {
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                } : false
            };

            this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
            this.isVideoEnabled = video;
            this.isAudioEnabled = true;

            return this.localStream;
        } catch (error) {
            console.error('Error initializing devices:', error);
            throw error;
        }
    }

    async createPeerConnection(configuration) {
        try {
            this.peerConnection = new RTCPeerConnection(configuration);
            
            // Добавляем локальные треки
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });

            // Обработка ICE кандидатов
            this.peerConnection.onicecandidate = event => {
                if (event.candidate) {
                    // Отправляем ICE кандидата другому пиру
                    this.onIceCandidate(event.candidate);
                }
            };

            // Обработка удаленного потока
            this.peerConnection.ontrack = event => {
                this.remoteStream = event.streams[0];
                if (this.onRemoteStream) {
                    this.onRemoteStream(this.remoteStream);
                }
            };

            // Создаем канал данных
            this.dataChannel = this.peerConnection.createDataChannel('messageChannel');
            this.setupDataChannel();

            return this.peerConnection;
        } catch (error) {
            console.error('Error creating peer connection:', error);
            throw error;
        }
    }

    setupDataChannel() {
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
        };

        this.dataChannel.onclose = () => {
            console.log('Data channel closed');
        };

        this.dataChannel.onmessage = event => {
            console.log('Message received:', event.data);
        };
    }

    async startCall(recipientId, video = false) {
        try {
            await this.initializeDevices(video);
            await this.createPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });

            const offer = await this.peerConnection.createOffer();
            await this.peerConnection.setLocalDescription(offer);

            this.isCallActive = true;
            if (this.onCallStateChange) {
                this.onCallStateChange('outgoing', recipientId);
            }

            return offer;
        } catch (error) {
            console.error('Error starting call:', error);
            throw error;
        }
    }

    async handleOffer(offer) {
        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(offer)
            );

            // Создаем ответ
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);

            // Отправляем ответ
            this.socket.emit('answer', answer);
        } catch (error) {
            console.error('Ошибка обработки оффера:', error);
            throw error;
        }
    }

    async handleAnswer(answer) {
        try {
            await this.peerConnection.setRemoteDescription(
                new RTCSessionDescription(answer)
            );
        } catch (error) {
            console.error('Ошибка обработки ответа:', error);
            throw error;
        }
    }

    async handleNewICECandidate(candidate) {
        try {
            await this.peerConnection.addIceCandidate(candidate);
        } catch (error) {
            console.error('Ошибка добавления ICE кандидата:', error);
            throw error;
        }
    }

    // Обработчик удаленного потока (должен быть переопределен)
    handleRemoteStream(stream) {
        // Этот метод должен быть переопределен для отображения видео
        console.log('Получен удаленный поток');
    }

    // Включение/выключение видео
    async toggleVideo() {
        try {
            if (!this.localStream) return;

            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoEnabled = videoTrack.enabled;
            } else if (!videoTrack && !this.isVideoEnabled) {
                const newStream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 1280 },
                        height: { ideal: 720 }
                    }
                });
                
                const newVideoTrack = newStream.getVideoTracks()[0];
                this.localStream.addTrack(newVideoTrack);
                this.peerConnection.getSenders().find(sender => 
                    sender.track.kind === 'video'
                ).replaceTrack(newVideoTrack);
                
                this.isVideoEnabled = true;
            }

            return this.isVideoEnabled;
        } catch (error) {
            console.error('Error toggling video:', error);
            throw error;
        }
    }

    // Включение/выключение звука
    toggleAudio() {
        if (!this.localStream) return;

        const audioTrack = this.localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            this.isAudioEnabled = audioTrack.enabled;
        }

        return this.isAudioEnabled;
    }

    // Завершение звонка
    async endCall() {
        try {
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => track.stop());
                this.localStream = null;
            }

            if (this.peerConnection) {
                this.peerConnection.close();
                this.peerConnection = null;
            }

            if (this.dataChannel) {
                this.dataChannel.close();
                this.dataChannel = null;
            }

            this.isCallActive = false;
            this.isVideoEnabled = false;
            this.isAudioEnabled = false;

            if (this.onCallStateChange) {
                this.onCallStateChange('ended');
            }
        } catch (error) {
            console.error('Error ending call:', error);
            throw error;
        }
    }

    // Демонстрация экрана
    async shareScreen() {
        try {
            const sources = await desktopCapturer.getSources({ 
                types: ['window', 'screen'],
                thumbnailSize: { width: 0, height: 0 }
            });

            const screenStream = await navigator.mediaDevices.getUserMedia({
                audio: false,
                video: {
                    mandatory: {
                        chromeMediaSource: 'desktop',
                        chromeMediaSourceId: sources[0].id
                    }
                }
            });

            const screenTrack = screenStream.getVideoTracks()[0];
            const sender = this.peerConnection.getSenders().find(s => 
                s.track.kind === 'video'
            );

            if (sender) {
                sender.replaceTrack(screenTrack);
            }

            screenTrack.onended = () => {
                if (this.isVideoEnabled) {
                    this.toggleVideo();
                }
            };

            return screenStream;
        } catch (error) {
            console.error('Error sharing screen:', error);
            throw error;
        }
    }

    // Обработка ICE кандидата
    async handleIceCandidate(candidate) {
        try {
            if (this.peerConnection) {
                await this.peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            console.error('Error handling ICE candidate:', error);
            throw error;
        }
    }

    // Получение статистики звонка
    async getCallStats() {
        if (!this.peerConnection) return null;

        const stats = await this.peerConnection.getStats();
        const result = {
            bandwidth: 0,
            packetsLost: 0,
            roundTripTime: 0
        };

        stats.forEach(report => {
            if (report.type === 'inbound-rtp') {
                result.bandwidth = report.bytesReceived;
                result.packetsLost = report.packetsLost;
            }
            if (report.type === 'candidate-pair' && report.currentRoundTripTime) {
                result.roundTripTime = report.currentRoundTripTime;
            }
        });

        return result;
    }
}

module.exports = CallService;
