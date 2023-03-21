const fetch = require('node-fetch-commonjs');
const fs = require('fs');

const options = require('./options.json');
const server_ids = options.server_ids;
const server_folder_names = options.server_folder_names;
const filenames = options.filenames;
const downloadFilenamePrefix = options.downloadFilenamePrefix;
const downloadStartFromDay = options.downloadStartFromDay;
const downloadType = options.downloadType;

const MYARENA_COOKIE = options.cookie;
const schedule = require('node-schedule');

function dateFormat(date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace(/%[YmdHMS]/g, function (m) {
        switch (m) {
            case '%Y': return date[utc + 'FullYear']();
            case '%m': m = 1 + date[utc + 'Month'](); break;
            case '%d': m = date[utc + 'Date'](); break;
            case '%H': m = date[utc + 'Hours'](); break;
            case '%M': m = date[utc + 'Minutes'](); break;
            case '%S': m = date[utc + 'Seconds'](); break;
            default: return m.slice(1);
        }
        return ('0' + m).slice(-2);
    });
}

const repeatCommand = (command, interval) => {
  const job = schedule.scheduleJob(`*/${interval} * * * * *`, () => {
    console.log(`Running command: ${command}`);
    const { spawn } = require('child_process');
    const cmd = spawn(command, { shell: true });
    cmd.stdout.on('data', (data) => {
      console.log(`stdout: ${data}`);
    });
    cmd.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });
    cmd.on('close', (code) => {
      console.log(`child process exited with code ${code}`);
    });
  });
};

function getServerFolderName(serverid) {
    return server_folder_names[typeof serverid === 'number' ? serverid.toString() : serverid];
}

async function downloadLogFile(serverid, outputDirectory, filename) {
    if (typeof server_id === 'number') {
        server_id = server_id.toString();
    }
    let url = `https://www.myarena.ru/ajax.php?home=${serverid}&logtype=2&getlog=${filename}`;
    let res = await fetch(url, {
        "headers": {
            "Cookie": MYARENA_COOKIE
        },
        "referrer": `https://www.myarena.ru/home.php?m=gamemanager&p=logs&log=sm&home=${serverid}`,
        "method": "GET",
        "mode": "cors",
        "credentials": "include",
    });
    let text = await res.text();
    if(text.length == 0) {
        console.log(`File '${filename}' is empty on server ${serverid}`);
        return;
    }
    
    if(text.length == 14) {
        console.log(`File '${filename}' not found on server ${serverid}`);
        return;
    }
    if (!fs.existsSync(outputDirectory)) {
        fs.mkdir(outputDirectory, (err) => {
            if (err) {
                console.log(`Error on creation directory: ${err.message}`)
                return;
            }
        });
    }

    await fs.writeFile(`${outputDirectory}/${filename}`, text, (err) => {
        if (err) {
            console.error(err.message);
            return;
        }
        console.log(`Log file '${filename}' saved in directory '${outputDirectory}'`);
    })
}

async function main() {
  // Перевірка, чи було передано аргументи командного рядка
  if (process.argv.length > 2) {
    // Якщо передано аргументи, виконуємо завантаження лог-файлів для конкретних серверів
    for (let i = 2; i < process.argv.length; i++) {
      const serverId = process.argv[i];
      let date = new Date();

      if (downloadType == 1 || downloadType == 3) {
        for (let j = 0; j <= downloadStartFromDay; j++) {
          const filename = `${downloadFilenamePrefix}${dateFormat(date, '%Y%m%d')}.log`;
          await downloadLogFile(serverId, getServerFolderName(serverId), filename);
          date.setDate(date.getDate() - 1);
        }
      }

      if (downloadType == 2 || downloadType == 3) {
        for (let j = 0; j < filenames.length; j++) {
          const filename = filenames[j];
          await downloadLogFile(serverId, getServerFolderName(serverId), filename);
        }
      }
    }
  } else {
    // Якщо аргументи не передано, виконуємо завантаження лог-файлів зі всіх серверів
    for (let i = 0; i < server_ids.length; i++) {
      const serverId = server_ids[i];
      let date = new Date();

      if (downloadType == 1 || downloadType == 3) {
        for (let j = 0; j <= downloadStartFromDay; j++) {
          const filename = `${downloadFilenamePrefix}${dateFormat(date, '%Y%m%d')}.log`;
          await downloadLogFile(serverId, getServerFolderName(serverId), filename);
          date.setDate(date.getDate() - 1);
        }
      }

      if (downloadType == 2 || downloadType == 3) {
        for (let j = 0; j < filenames.length; j++) {
          const filename = filenames[j];
          await downloadLogFile(serverId, getServerFolderName(serverId), filename);
        }
      }
    }
	
  }
}

main();

repeatCommand('ls -lh', 10);