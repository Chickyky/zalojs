const { init } = require('../src');
const Client = require('../src').default;
const fs = require('fs');
const path = require('path');

const config = require('./config.json');
const cookie = require('./cookie.json');
const localStorageItems = require('./localStorage.json');

(async () => {
	console.log('start listening ...');

  const { browser, page } = await init({
    groupName: config.gname,
    groupID: config.gid,
    groupSelector: config.gselector,
    headless: config.headless,

    // cookie,
    // localStorageItems,
    // executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  });

  const client = new Client(page);

  client.on('message', (message: any) => {
  	console.log('message=', message);

    message.forEach(async (element: any) => {
      if (element.content === 'Zalo') {
        client.send({
          message: 'Auto send this message when get content `Zalo`',
        });
      }
    });
  });

  client.once('ready', async () => {
    console.log(`Bot is ready! ${client.user.name}`);
  });

  /*client.once('scraped', async () => {
    const cookies = await page.cookies();
    console.log('cookies=', cookies);

    const cookieAddress = path.join(__dirname, 'cookie.json');
    fs.writeFileSync(cookieAddress, JSON.stringify(cookies));

    const localStorage = await page.evaluate(() => ({ ...localStorage }))
    console.log('localStorage=', localStorage);

    const localStorageAddress = path.join(__dirname, 'localStorage.json');
    fs.writeFileSync(localStorageAddress, JSON.stringify(localStorage));
  })*/
})();
