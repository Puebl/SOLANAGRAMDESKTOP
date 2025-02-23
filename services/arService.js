const THREE = require('three');
const { FaceMesh } = require('@mediapipe/face_mesh');
const * as faceapi = require('face-api.js');
const { desktopCapturer } = require('electron');
const cv = require('opencv4nodejs');
const path = require('path');
const fs = require('fs');

class ARService {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.faceMesh = null;
        this.avatarModel = null;
        this.isInitialized = false;
        this.videoCapture = null;
        this.aruco = new cv.aruco.Dictionary(cv.aruco.DICT_6X6_250);
        this.parameters = new cv.aruco.DetectorParameters();
        this.calibrationData = null;
    }

    async initialize(container) {
        // Инициализация Three.js
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({ alpha: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        container.appendChild(this.renderer.domElement);

        // Настройка освещения
        const light = new THREE.AmbientLight(0xffffff);
        this.scene.add(light);

        // Инициализация FaceMesh
        this.faceMesh = new FaceMesh({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
            }
        });

        this.faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // Загрузка моделей face-api.js
        await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri('/models'),
            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
            faceapi.nets.faceExpressionNet.loadFromUri('/models')
        ]);

        this.isInitialized = true;

        try {
            if (this.isInitialized) return;

            // Получаем доступ к камере
            const sources = await desktopCapturer.getSources({ 
                types: ['camera'],
                thumbnailSize: { width: 0, height: 0 }
            });

            if (sources.length === 0) {
                throw new Error('No camera found');
            }

            // Инициализируем захват видео
            this.videoCapture = new cv.VideoCapture(0);
            this.isInitialized = true;

            // Загружаем калибровочные данные, если они есть
            await this.loadCalibrationData();
        } catch (error) {
            console.error('Error initializing AR service:', error);
            throw error;
        }
    }

    async loadAvatarModel(nftMetadata) {
        try {
            // Загрузка 3D модели аватара
            const loader = new THREE.GLTFLoader();
            this.avatarModel = await new Promise((resolve, reject) => {
                loader.load(
                    nftMetadata.model_url,
                    (gltf) => resolve(gltf.scene),
                    undefined,
                    (error) => reject(error)
                );
            });

            // Настройка модели
            this.avatarModel.scale.set(0.5, 0.5, 0.5);
            this.scene.add(this.avatarModel);

            return true;
        } catch (error) {
            console.error('Ошибка загрузки модели аватара:', error);
            return false;
        }
    }

    async startARSession(videoElement) {
        if (!this.isInitialized) {
            throw new Error('AR сервис не инициализирован');
        }

        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        videoElement.srcObject = stream;

        this.faceMesh.onResults((results) => {
            if (results.multiFaceLandmarks) {
                this.updateAvatarPosition(results.multiFaceLandmarks[0]);
            }
        });

        const animate = () => {
            requestAnimationFrame(animate);
            this.renderer.render(this.scene, this.camera);
        };
        animate();
    }

    updateAvatarPosition(landmarks) {
        if (!this.avatarModel) return;

        // Получение позиции головы из landmarks
        const nose = landmarks[1];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];

        // Обновление позиции аватара
        this.avatarModel.position.set(
            (nose.x - 0.5) * 2,
            (nose.y - 0.5) * -2,
            -nose.z
        );

        // Обновление поворота аватара
        const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
        this.avatarModel.rotation.y = angle;
    }

    // Обновление эмоций аватара
    async updateAvatarExpression(videoElement) {
        const detections = await faceapi
            .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceExpressions();

        if (detections) {
            const expressions = detections.expressions;
            this.updateAvatarMorphTargets(expressions);
        }
    }

    updateAvatarMorphTargets(expressions) {
        if (!this.avatarModel) return;

        // Предполагаем, что у модели есть morph targets для каждой эмоции
        const morphTargets = this.avatarModel.morphTargetDictionary;
        if (morphTargets) {
            Object.entries(expressions).forEach(([expression, value]) => {
                const targetIndex = morphTargets[expression];
                if (targetIndex !== undefined) {
                    this.avatarModel.morphTargetInfluences[targetIndex] = value;
                }
            });
        }
    }

    // Загрузка калибровочных данных
    async loadCalibrationData() {
        const calibrationPath = path.join(__dirname, '../data/camera_calibration.json');
        
        if (fs.existsSync(calibrationPath)) {
            try {
                const data = fs.readFileSync(calibrationPath);
                this.calibrationData = JSON.parse(data);
            } catch (error) {
                console.error('Error loading calibration data:', error);
            }
        }
    }

    // Калибровка камеры
    async calibrateCamera(chessboardSize = { width: 9, height: 6 }) {
        try {
            const objectPoints = [];
            const imagePoints = [];
            const frameCount = 10;
            const squareSize = 0.025; // размер квадрата в метрах

            // Создаем 3D точки шахматной доски
            const objectPoint = [];
            for (let i = 0; i < chessboardSize.height; i++) {
                for (let j = 0; j < chessboardSize.width; j++) {
                    objectPoint.push(new cv.Point3(j * squareSize, i * squareSize, 0));
                }
            }

            // Собираем кадры для калибровки
            for (let i = 0; i < frameCount; i++) {
                const frame = this.videoCapture.read();
                const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
                
                // Находим углы шахматной доски
                const found = cv.findChessboardCorners(
                    gray,
                    new cv.Size(chessboardSize.width, chessboardSize.height),
                    cv.CALIB_CB_ADAPTIVE_THRESH + cv.CALIB_CB_NORMALIZE_IMAGE
                );

                if (found) {
                    objectPoints.push(objectPoint);
                    imagePoints.push(found.corners);
                }
            }

            // Калибруем камеру
            const { cameraMatrix, distCoeffs } = cv.calibrateCamera(
                objectPoints,
                imagePoints,
                gray.sizes,
                null,
                null
            );

            // Сохраняем калибровочные данные
            this.calibrationData = {
                cameraMatrix: cameraMatrix.getDataAsArray(),
                distCoeffs: distCoeffs.getDataAsArray()
            };

            fs.writeFileSync(
                path.join(__dirname, '../data/camera_calibration.json'),
                JSON.stringify(this.calibrationData)
            );

            return this.calibrationData;
        } catch (error) {
            console.error('Error calibrating camera:', error);
            throw error;
        }
    }

    // Обнаружение AR маркеров
    async detectMarkers(frame) {
        try {
            const gray = frame.cvtColor(cv.COLOR_BGR2GRAY);
            
            // Обнаруживаем маркеры
            const { corners, ids } = cv.aruco.detectMarkers(
                gray,
                this.aruco,
                null,
                null,
                this.parameters
            );

            if (ids && this.calibrationData) {
                // Оцениваем позу маркеров
                const { rvecs, tvecs } = cv.aruco.estimatePoseSingleMarkers(
                    corners,
                    0.05, // размер маркера в метрах
                    new cv.Mat(this.calibrationData.cameraMatrix),
                    new cv.Mat(this.calibrationData.distCoeffs)
                );

                return {
                    corners,
                    ids,
                    rvecs,
                    tvecs
                };
            }

            return { corners, ids };
        } catch (error) {
            console.error('Error detecting markers:', error);
            throw error;
        }
    }

    // Отрисовка AR контента
    async renderARContent(frame, markerInfo, content) {
        try {
            if (!markerInfo.ids) return frame;

            // Отрисовываем оси координат для каждого маркера
            if (this.calibrationData) {
                frame = cv.aruco.drawAxis(
                    frame,
                    new cv.Mat(this.calibrationData.cameraMatrix),
                    new cv.Mat(this.calibrationData.distCoeffs),
                    markerInfo.rvecs,
                    markerInfo.tvecs,
                    0.1 // длина осей
                );
            }

            // Отрисовываем контуры маркеров
            frame = cv.aruco.drawDetectedMarkers(frame, markerInfo.corners, markerInfo.ids);

            // Отрисовываем AR контент
            for (let i = 0; i < markerInfo.ids.length; i++) {
                const id = markerInfo.ids[i];
                const corner = markerInfo.corners[i];

                if (content[id]) {
                    // Получаем центр маркера
                    const center = {
                        x: (corner[0].x + corner[2].x) / 2,
                        y: (corner[0].y + corner[2].y) / 2
                    };

                    // Отрисовываем контент
                    frame.putText(
                        content[id].text,
                        new cv.Point2(center.x, center.y),
                        cv.FONT_HERSHEY_SIMPLEX,
                        1,
                        new cv.Vec3(0, 255, 0),
                        2
                    );
                }
            }

            return frame;
        } catch (error) {
            console.error('Error rendering AR content:', error);
            throw error;
        }
    }

    // Создание AR маркера
    async createMarker(id, size = 200) {
        try {
            const marker = cv.aruco.drawMarker(this.aruco, id, size);
            return marker;
        } catch (error) {
            console.error('Error creating marker:', error);
            throw error;
        }
    }

    // Сохранение AR маркера
    async saveMarker(id, size = 200, outputPath) {
        try {
            const marker = await this.createMarker(id, size);
            cv.imwrite(outputPath, marker);
            return outputPath;
        } catch (error) {
            console.error('Error saving marker:', error);
            throw error;
        }
    }

    // Получение кадра с камеры
    async getFrame() {
        try {
            if (!this.isInitialized) {
                await this.initialize();
            }
            return this.videoCapture.read();
        } catch (error) {
            console.error('Error getting frame:', error);
            throw error;
        }
    }

    // Очистка ресурсов
    dispose() {
        if (this.renderer) {
            this.renderer.dispose();
        }
        if (this.scene) {
            this.scene.clear();
        }
        this.faceMesh = null;
        this.avatarModel = null;
        this.isInitialized = false;
        if (this.videoCapture) {
            this.videoCapture.release();
        }
    }
}

module.exports = ARService;
