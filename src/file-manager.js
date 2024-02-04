import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';

const username = process.env.npm_config_username?.replace('_', ' ') ?? 'User';
const initialDir = path.resolve(process.env.home);

let currentDir = initialDir;

const printWelcomeMessage = () => {
  console.log(`\nWelcome to the File Manager, ${username}!\n`);
};

const printFarewellMessage = () => {
  console.log(`\nThank you for using File Manager, ${username}, goodbye!\n`);
};

const printCurrentDir = () => {
  console.log(`\nYou are currently in ${currentDir}\n`);
};

const readline = createInterface({
  input: stdin,
  output: stdout,
});

const fileSystem = {
  ls: async () => {
    try {
      const list = await fs.readdir(currentDir);

      const isFileDir = async (dir, file) =>
        (await fs.stat(path.join(dir, file))).isDirectory();

      const formatList = await Promise.all(
        list.map(async (file) => {
          const fileType = (await isFileDir(currentDir, file))
            ? 'Directory'
            : 'File';
          const formatFile = { name: file, type: fileType };

          return formatFile;
        })
      );

      const sortedList = formatList
        .sort((a, b) => {
          if (a.type === b.type) {
            return a.name.localeCompare(b.name);
          }
          return a.type === 'Directory' ? -1 : 1;
        })
        .map((file, index) => {
          file.index = index;

          return file;
        });

      console.log(sortedList);
    } catch (err) {
      console.error(err.message);
    }
  },

  up: () => {
    const pathFolders = currentDir.split(path.sep);

    if (pathFolders.length > 1) {
      pathFolders.pop();
    }

    currentDir = pathFolders.join(path.sep);

    printCurrentDir();
  },
};

readline.on('line', (data) => {
  switch (data) {
    case 'quit':
      readline.close();
      break;

    case 'ls':
      fileSystem.ls();
      break;

    case 'up':
      fileSystem.up();
      break;

    default:
      console.log('Invalid input');
      break;
  }
});

readline.on('close', () => {
  printFarewellMessage();
});

printWelcomeMessage();
printCurrentDir();
