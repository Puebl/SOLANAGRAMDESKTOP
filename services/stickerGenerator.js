const { createCanvas, loadImage } = require('canvas');
const path = require('path');
const fs = require('fs');
const IPFSService = require('./ipfs');

class StickerGenerator {
    constructor() {
        this.ipfsService = new IPFSService();
        this.canvas = createCanvas(512, 512);
        this.ctx = this.canvas.getContext('2d');
        this.stickerPacks = new Map();
    }

    // Создание стикера из изображения
    async createSticker(imagePath, options = {}) {
        try {
            const image = await loadImage(imagePath);
            
            // Очищаем холст
            this.ctx.clearRect(0, 0, 512, 512);

            // Настраиваем размер и позицию
            const scale = Math.min(512 / image.width, 512 / image.height);
            const width = image.width * scale;
            const height = image.height * scale;
            const x = (512 - width) / 2;
            const y = (512 - height) / 2;

            // Рисуем изображение
            this.ctx.drawImage(image, x, y, width, height);

            // Применяем эффекты
            if (options.effects) {
                await this.applyEffects(options.effects);
            }

            // Сохраняем в буфер
            const buffer = this.canvas.toBuffer('image/png');

            // Загружаем в IPFS
            const result = await this.ipfsService.uploadBuffer(buffer, 'sticker.png');

            return {
                cid: result.cid,
                width: 512,
                height: 512,
                url: this.ipfsService.getViewUrl(result.cid)
            };
        } catch (error) {
            console.error('Error creating sticker:', error);
            throw error;
        }
    }

    // Применение эффектов к стикеру
    async applyEffects(effects) {
        if (effects.brightness) {
            this.adjustBrightness(effects.brightness);
        }
        if (effects.contrast) {
            this.adjustContrast(effects.contrast);
        }
        if (effects.saturation) {
            this.adjustSaturation(effects.saturation);
        }
        if (effects.blur) {
            this.applyBlur(effects.blur);
        }
        if (effects.border) {
            this.addBorder(effects.border);
        }
    }

    // Регулировка яркости
    adjustBrightness(value) {
        const imageData = this.ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;
        
        for (let i = 0; i < data.length; i += 4) {
            data[i] = Math.min(255, data[i] + value);     // Red
            data[i + 1] = Math.min(255, data[i + 1] + value); // Green
            data[i + 2] = Math.min(255, data[i + 2] + value); // Blue
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Регулировка контраста
    adjustContrast(value) {
        const factor = (259 * (value + 255)) / (255 * (259 - value));
        const imageData = this.ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            data[i] = factor * (data[i] - 128) + 128;     // Red
            data[i + 1] = factor * (data[i + 1] - 128) + 128; // Green
            data[i + 2] = factor * (data[i + 2] - 128) + 128; // Blue
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Регулировка насыщенности
    adjustSaturation(value) {
        const imageData = this.ctx.getImageData(0, 0, 512, 512);
        const data = imageData.data;

        for (let i = 0; i < data.length; i += 4) {
            const gray = 0.2989 * data[i] + 0.5870 * data[i + 1] + 0.1140 * data[i + 2];
            data[i] = gray * (1 - value) + data[i] * value;     // Red
            data[i + 1] = gray * (1 - value) + data[i + 1] * value; // Green
            data[i + 2] = gray * (1 - value) + data[i + 2] * value; // Blue
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Применение размытия
    applyBlur(radius) {
        const imageData = this.ctx.getImageData(0, 0, 512, 512);
        const pixels = imageData.data;
        const width = 512;
        const height = 512;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                let r = 0, g = 0, b = 0, a = 0, count = 0;

                for (let dy = -radius; dy <= radius; dy++) {
                    for (let dx = -radius; dx <= radius; dx++) {
                        const px = x + dx;
                        const py = y + dy;

                        if (px >= 0 && px < width && py >= 0 && py < height) {
                            const i = (py * width + px) * 4;
                            r += pixels[i];
                            g += pixels[i + 1];
                            b += pixels[i + 2];
                            a += pixels[i + 3];
                            count++;
                        }
                    }
                }

                const i = (y * width + x) * 4;
                pixels[i] = r / count;
                pixels[i + 1] = g / count;
                pixels[i + 2] = b / count;
                pixels[i + 3] = a / count;
            }
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    // Добавление рамки
    addBorder(options) {
        const { color = '#000000', width = 10 } = options;
        
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.strokeRect(width / 2, width / 2, 512 - width, 512 - width);
    }

    // Создание набора стикеров
    async createStickerPack(name, images, options = {}) {
        try {
            const stickers = [];

            for (const image of images) {
                const sticker = await this.createSticker(image, options);
                stickers.push(sticker);
            }

            const packData = {
                name,
                stickers,
                created: Date.now(),
                ...options
            };

            // Сохраняем метаданные набора в IPFS
            const result = await this.ipfsService.uploadBuffer(
                Buffer.from(JSON.stringify(packData)),
                `${name}.json`
            );

            this.stickerPacks.set(name, {
                cid: result.cid,
                ...packData
            });

            return {
                name,
                cid: result.cid,
                stickers,
                url: this.ipfsService.getViewUrl(result.cid)
            };
        } catch (error) {
            console.error('Error creating sticker pack:', error);
            throw error;
        }
    }

    // Загрузка набора стикеров
    async loadStickerPack(cid) {
        try {
            const data = await this.ipfsService.getFile(cid);
            const packData = JSON.parse(data.toString());
            
            this.stickerPacks.set(packData.name, {
                cid,
                ...packData
            });

            return packData;
        } catch (error) {
            console.error('Error loading sticker pack:', error);
            throw error;
        }
    }

    // Получение списка наборов стикеров
    getStickerPacks() {
        return Array.from(this.stickerPacks.values());
    }

    // Получение стикера по CID
    async getSticker(cid) {
        try {
            const data = await this.ipfsService.getFile(cid);
            return {
                cid,
                data,
                url: this.ipfsService.getViewUrl(cid)
            };
        } catch (error) {
            console.error('Error getting sticker:', error);
            throw error;
        }
    }
}

module.exports = StickerGenerator;
