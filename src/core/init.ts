import puppeteer from 'puppeteer';
import toConversation from '../actions/toConversation';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { EventEmitter } from 'events';

interface InitOptions {
    groupName: string;
    groupID: string;
    headless?: boolean;
    port? : boolean
}

const eventEmitter = new EventEmitter()
const app = express();
const server = http.createServer(app);
const io = new Server(server);

export default async function init(options: InitOptions) {
    const { groupName, groupID, headless = true , port = 3000 } = options;
    let isLogin = false;

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(express.static(path.join(__dirname, 'public')));

    try {
        const browser = await puppeteer.launch({ headless });
        const page = await browser.newPage();

        await page.goto('https://id.zalo.me/account?continue=https://chat.zalo.me');
        await page.waitForSelector('#app > div > div.zLogin-layout > div.body > div.animated.fadeIn.body-container > div.content.animated.fadeIn > div > div > div.qrcode > div.qr-container > img');;

        const imageSrc= await page.evaluate(() => {
            const imgElement = document.querySelector('#app > div > div.zLogin-layout > div.body > div.animated.fadeIn.body-container > div.content.animated.fadeIn > div > div > div.qrcode > div.qr-container > img') as HTMLImageElement

            return imgElement ? imgElement.src : null;
        });

        app.get('/', (req , res) => {
            res.render('index', { imageSrc });
        });

        io.on('connection', (socket) => {
            console.log('a user connected');

            socket.on('refreshQR', async () => {
                // Logic to update QR code
                console.log('Received refreshQR event');
                await page.reload();
            });

            page.on('request', request => {
                if (request.url().startsWith('data:image/png;base64')) {
                    const imageSrc = request.url();
                    io.emit('changeImage', imageSrc);
                }
            });
        })

        page.on("framenavigated", async (frame: any) => {
            const url = frame.url(); // the new url

            if (url.startsWith("https://chat.zalo.me/") && !isLogin) {
                isLogin = true;

                await toConversation(page, groupName, '#group-item-' + groupID);

                page.off("framenavigated");
                page.removeAllListeners("request");
                eventEmitter.emit('initialized');
            }
        });

        server.listen(port, () => {
          console.log(`Server is running on port http://localhost:${port}`);
        });

        return { browser, page };
    } catch (error) {
        console.error('Error during initialization:', error);
        throw error;
    }
}

export { eventEmitter };
