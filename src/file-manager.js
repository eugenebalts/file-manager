import fs from 'node:fs/promises';

const username = process.env.npm_config_username?.replace('_', ' ') ?? 'Guest';

const printWelcomeMessage = () => {
  console.log(`Welcome to the File Manager, ${username}!`);
};

printWelcomeMessage();
