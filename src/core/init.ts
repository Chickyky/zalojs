import { CookieParam, PuppeteerLaunchOptions } from 'puppeteer';
import puppeteer from 'puppeteer-extra';
import express from 'express';
import http from 'http';
import path from 'path';
import { Server } from 'socket.io';
import { EventEmitter } from 'events';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import AdblockerPlugin from 'puppeteer-extra-plugin-adblocker';

import toConversation from '../actions/toConversation';

interface InitOptions {
    groupName: string;
    groupID: string;
    headless?: boolean;
    port? : boolean;

    cookie?: any;
    localStorageItems?: any;
    executablePath?: string;
}

const eventEmitter = new EventEmitter()
const app = express();
const server = http.createServer(app);
const io = new Server(server);

puppeteer.use(StealthPlugin());
puppeteer.use(AdblockerPlugin({ blockTrackers: true }));

export default async function init(options: InitOptions) {
    const { groupName, groupID, headless = true , port = 3000 } = options;
    let isLogin = false;

    app.set('view engine', 'ejs');
    app.set('views', path.join(__dirname, '../views'));
    app.use(express.static(path.join(__dirname, 'public')));

    try {
        let launchOpts: PuppeteerLaunchOptions = {
            headless,
            args: [
                // '--no-sandbox'
                '--restore-last-session'
            ],
            ignoreDefaultArgs: [
                '--enable-automation',
                '--disable-blink-features'
            ]
        }

        if (options.executablePath) {
            launchOpts.executablePath = options.executablePath;
        }

        const browser = await puppeteer.launch(launchOpts);
        const page = await browser.newPage();

        // await page.goto('https://id.zalo.me');
        // await page.waitForNavigation();

        await Promise.all([
            page.goto('https://id.zalo.me'),
            page.waitForNavigation(),
        ]);

        if (options.localStorageItems) {
            await page.evaluate((items) => {
                var keys = Object.keys(items);

                for (let i = 0; i < keys.length; i++) {
                    const key = keys[i];
                    localStorage.setItem(key, items[key]);
                }
            }, options.localStorageItems)
        }

        if (options.cookie) {
            await page.setCookie(...options.cookie);

            await page.goto('https://chat.zalo.me');
            await page.waitForNavigation();
            // await page.reload();
        } else {
            await page.goto('https://id.zalo.me/account?continue=https://chat.zalo.me');
            await page.waitForSelector('#app > div > div.zLogin-layout > div.body > div.animated.fadeIn.body-container > div.content.animated.fadeIn > div > div > div.qrcode > div.qr-container > img');
        }

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
