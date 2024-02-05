import { createReadStream } from 'node:fs';
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
      console.error(`\n${err.message}\n`);
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

  cd: async (route) => {
    try {
      const newPath = path.join(currentDir, `./${route}`);
      await fs.readdir(newPath);

      currentDir = newPath;
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }

    printCurrentDir();
  },

  cat: async (route) => {
    try {
      const destinationPath = path.join(currentDir, `./${route}`);

      const readableStream = createReadStream(destinationPath, 'utf-8');

      readableStream.on('data', (chunk) => {
        console.log(chunk);
      });

      readableStream.on('error', (err) => {
        console.error(err);
      });
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  add: async (name) => {
    const filePath = path.join(currentDir, `./${name}`);

    try {
      await fs.access(filePath);

      throw new Error(`File ${name} already exists at path ${filePath}\n`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          await fs.writeFile(filePath, '');

          console.log(
            `\nFile ${name} has been successfully created and is available at path ${filePath}\n`
          );
        } catch (writeError) {
          console.error(`\n${writeError.message}`);
        }
      } else {
        console.error(`\n${err.message}\n`);
      }
    }
  },

  rn: async (oldName, newName) => {
    try {
      const oldFile = path.join(currentDir, `./${oldName}`);
      const newFile = path.join(currentDir, `./${newName}`);

      await fs.rename(oldFile, newFile);

      console.log(
        `\nFile oldName successfully renamed to newName and available at path ${newFile}\n`
      );
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },
};

readline.on('line', (command) => {
  if (command === 'quit') {
    readline.close();

    return;
  }

  if (command === 'ls') {
    fileSystem.ls();

    return;
  }

  if (command === 'up') {
    fileSystem.up();

    return;
  }

  if (command.startsWith('cd ')) {
    const argument = command.slice(3).trim();

    fileSystem.cd(argument);

    return;
  }

  if (command.startsWith('cat ')) {
    const argument = command.slice(3).trim();

    fileSystem.cat(argument);

    return;
  }

  if (command.startsWith('add ')) {
    const argument = command.slice(3).trim();

    fileSystem.add(argument);

    return;
  }

  if (command.startsWith('rn ')) {
    const args = command.slice(3).trim().split(' ');

    fileSystem.rn(args[0], args[1]);

    return;
  }

  console.log('Invalid input');
});

readline.on('close', () => {
  printFarewellMessage();
});

printWelcomeMessage();
printCurrentDir();
