const { init } = require('../src');
const Client = require('../src').default;

const config = require('./config.json');

const prefix = '!';

(async () => {
	console.log('start listening ...');

  const { browser, page } = await init({
    groupName: config.gname,
    groupID: config.gid,
    groupSelector: config.gselector,
    headless: config.headless,
  });

  const client = new Client(page);

  client.on('message', (message: any) => {
  	console.log('message=', message);

    message.forEach(async (element: any) => {
      if (element.content === 'Zalo') {
        client.send({
          message: 'rac',
        });
      }
    });
  });

  client.once('ready', () => {
    console.log(`Bot is ready! ${client.user.name}`);
  });
})();
