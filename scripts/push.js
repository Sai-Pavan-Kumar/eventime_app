const git = require('isomorphic-git');
const http = require('isomorphic-git/http/node');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function main() {
  const token = execSync('gh auth token').toString().trim();
  if (!token) {
    console.error('No GitHub token found from gh CLI');
    process.exit(1);
  }

  const dir = path.resolve(__dirname, '..');

  console.log('Pushing to https://github.com/Sai-Pavan-Kumar/eventime_app.git...');

  const pushResult = await git.push({
    fs,
    http,
    dir,
    remote: 'origin',
    ref: 'main',
    force: true,
    onAuth: () => ({
      username: token,
      password: '',
    }),
  });

  console.log('Push completed successfully!', pushResult);
}

main().catch((err) => {
  console.error('Push error:', err);
  process.exit(1);
});
