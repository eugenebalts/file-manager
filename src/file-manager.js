import { createReadStream, createWriteStream } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline';
import { createHash } from 'node:crypto';
import { createBrotliCompress, createBrotliDecompress } from 'node:zlib';

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
      if (!route) {
        throw new Error('Please, specify route');
      }

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
        console.error(`\n${err.message}\n`);
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
        } catch (err) {
          console.error(`\n${err.message}`);
        }
      } else {
        console.error(`\n${err.message}\n`);
      }
    }
  },

  rn: async (oldName, newName) => {
    try {
      if (!newName) {
        throw new Error('Please, specify new name');
      }

      const oldFile = path.join(currentDir, `./${oldName}`);
      const newFile = path.join(currentDir, `./${newName}`);

      await fs.rename(oldFile, newFile);

      console.log(
        `\nFile ${oldName} successfully renamed to ${newName} and available at path ${newFile}\n`
      );
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  cp: async (from, to) => {
    const sourcePath = path.join(currentDir, `./${from}`);
    const destinationPath = path.join(currentDir, `./${to}/${from}`);

    try {
      if (!to) {
        throw new Error('Please, specify destination path');
      }

      await fs.access(destinationPath);

      throw new Error(`File at path ${destinationPath} is already exists`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          await fs.access(sourcePath);

          const destinationDir = path.dirname(destinationPath);
          await fs.mkdir(destinationDir, { recursive: true });

          const readableStream = createReadStream(sourcePath);

          readableStream.on('error', (err) => {
            console.error(`\n${err.message}\n`);
          });

          const writeStream = createWriteStream(destinationPath);

          readableStream.pipe(writeStream);

          await new Promise((res, rej) => {
            writeStream.on('finish', res);
            writeStream.on('error', rej);
          });

          console.log(
            `\nFile copied from ${sourcePath} to ${destinationPath}\n`
          );
        } catch (err) {
          console.error(`\n${err.message}\n`);
        }
      } else {
        console.error(`\n${err.message}\n`);
      }
    }
  },

  rm: async (route) => {
    try {
      const sourcePath = path.join(currentDir, `./${route}`);

      await fs.rm(sourcePath);

      console.log(`\nFile ${route} has been successfully removed\n`);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  mv: async function (from, to) {
    try {
      if (!to) {
        throw new Error('Please, specify destination path');
      }

      await this.cp(from, to);
      await this.rm(from);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },
};

const operationSystem = {
  EOL: () => {
    try {
      console.log(`\n${JSON.stringify(os.EOL)}\n`);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  cpus: () => {
    try {
      const cpuData = os.cpus();

      if (cpuData.length === 0) {
        throw new Error('No CPU information available');
      }

      const model = cpuData[0].model;
      const cores = cpuData.length;
      const frequency = cpuData.map((core, index) => {
        return {
          core: index + 1,
          frequency: (core.speed / 1000).toFixed(1) + ' GHZ',
        };
      });

      console.log({
        Model: model,
        Cores: cores,
        Frequency: frequency,
      });
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  homedir: () => {
    try {
      const homedir = os.userInfo()?.username;

      if (!homedir) {
        throw new Error('Cannot get info about home directory');
      }
      console.log(`\n${homedir}\n`);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  username: () => {
    try {
      const username = os.userInfo()?.username;

      if (!username) {
        throw new Error('Cannot get info about username');
      }

      console.log(`\n${username}\n`);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },

  architecture: () => {
    try {
      const architecture = os.arch();

      if (!architecture) {
        throw new Error('Cannot get info about CPU architecture');
      }

      console.log(`\nCPU architecture: ${architecture}\n`);
    } catch (err) {
      console.error(`\n${err.message}\n`);
    }
  },
};

const zip = {
  compress: async (source, destination) => {
    const sourceFile = path.join(currentDir, `./${source}`);
    const destinationFile = path.join(
      currentDir,
      `./${destination}/${source}.br`
    );

    try {
      if (!destination) {
        throw new Error('Please, specify destination path');
      }

      await fs.access(destinationFile);

      throw new Error(`File ${destinationFile} is already exists`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          await fs.access(sourceFile);

          const destinationDir = path.dirname(destinationFile);
          await fs.mkdir(destinationDir, { recursive: true });

          const readableSteam = createReadStream(sourceFile);
          const writeStream = createWriteStream(destinationFile);
          const compressStream = createBrotliCompress();

          readableSteam.on('error', (err) => {
            console.error(`\n${err.message}\n`);
          });

          readableSteam.pipe(compressStream).pipe(writeStream);

          writeStream.on('finish', () => {
            console.log(
              `\nFile has been successfully compressed and available at path ${destinationFile}\n`
            );
          });
        } catch (err) {
          console.error(`\n${err.message}\n`);
        }
      } else {
        console.error(`\n${err.message}\n`);
      }
    }
  },

  decompress: async (source, destination) => {
    const sourceFile = path.join(currentDir, `./${source}`);
    const destinationFile = path.join(
      currentDir,
      `./${destination}/${path.basename(sourceFile).replace('.br', '')}`
    );

    try {
      if (!destination) {
        throw new Error('Please, specify destination path');
      }

      await fs.access(destinationFile);

      throw new Error(`File ${destinationFile} is already exists`);
    } catch (err) {
      if (err.code === 'ENOENT') {
        try {
          await fs.access(sourceFile);

          const destinationDir = path.dirname(destinationFile);
          await fs.mkdir(destinationDir, { recursive: true });

          const readableSteam = createReadStream(sourceFile);
          const writeStream = createWriteStream(destinationFile);
          const decompressStream = createBrotliDecompress();

          readableSteam.on('error', (err) => {
            console.error(`\n${err.message}\n`);
          });

          readableSteam.pipe(decompressStream).pipe(writeStream);

          writeStream.on('finish', () => {
            console.log(
              `\nFile has been successfully decompressed and available at path ${destinationFile}\n`
            );
          });
        } catch (err) {
          console.error(`\n${err.message}\n`);
        }
      } else {
        console.error(`\n${err.message}\n`);
      }
    }
  },
};

const cryptographic = {
  hash: async (route) => {
    try {
      const sourceFile = path.join(currentDir, `./${route}`);
      const readableStream = createReadStream(sourceFile, 'utf-8');

      const hash = createHash('sha256');

      readableStream.on('data', (chunk) => {
        hash.update(chunk);
      });

      readableStream.on('error', (err) => {
        console.error(`\n${err.message}\n`);
      });

      readableStream.on('end', () => {
        console.log(`\n${hash.digest('hex')}\n`);
      });
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

  // FS

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

  if (command.startsWith('cp ')) {
    const args = command.slice(3).trim().split(' ');

    fileSystem.cp(args[0], args[1]);

    return;
  }

  if (command.startsWith('rm ')) {
    const argument = command.slice(3);

    fileSystem.rm(argument);

    return;
  }

  if (command.startsWith('mv ')) {
    const args = command.slice(3).trim().split(' ');

    fileSystem.mv(args[0], args[1]);

    return;
  }

  // OS

  if (command.startsWith('os ')) {
    if (!command.slice(3).startsWith('--')) {
      console.log(
        `\nOS arguments should be written separated by '--'. For example: os --username\n`
      );

      return;
    }
    const argument = command.slice(5).trim();

    switch (argument) {
      case 'EOL':
        operationSystem.EOL();

        break;

      case 'cpus':
        operationSystem.cpus();

        break;

      case 'homedir':
        operationSystem.homedir();

        break;

      case 'username':
        operationSystem.username();

        break;

      case 'architecture':
        operationSystem.architecture();

        break;

      default:
        const defaultMessage = `Unknown OS argument '${argument}'`;

        let isOsContainsArgument = false;
        let tipArgument = '';

        if (!!operationSystem[argument.toLowerCase()]) {
          isOsContainsArgument = !!operationSystem[argument.toLowerCase()];
          tipArgument = argument.toLowerCase();
        } else if (!!operationSystem[argument.toUpperCase()]) {
          isOsContainsArgument = !!operationSystem[argument.toUpperCase()];
          tipArgument = argument.toUpperCase();
        }

        const additionalMessage = isOsContainsArgument
          ? `. Looks like you mean '${tipArgument}'`
          : null;

        console.log(`\n${defaultMessage}${additionalMessage ?? ''}\n`);
    }

    return;
  }

  // HASH

  if (command.startsWith('hash ')) {
    const argument = command.slice(5).trim();

    cryptographic.hash(argument);

    return;
  }

  // ZLIB

  if (command.startsWith('compress ')) {
    const args = command.trim().slice(9).split(' ');

    zip.compress(args[0], args[1]);

    return;
  }

  if (command.startsWith('decompress ')) {
    const args = command.trim().slice(11).split(' ');

    zip.decompress(args[0], args[1]);

    return;
  }

  console.log('\nInvalid input\n');
});

readline.on('close', () => {
  printFarewellMessage();
});

printWelcomeMessage();
printCurrentDir();
