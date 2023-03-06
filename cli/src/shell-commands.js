import { promisify } from 'util';
import { exec } from 'child_process';

const execute = promisify(exec);

const runCommand = async (command) => {
  try {
    console.log(command);
    const { stdout, stderr } = await execute(command);
    console.log(stderr);
    console.log(stdout);
    return { stdout, stderr };
  } catch (error) {
    console.error(error);
    return { error };
  }
};

export const stopNginx = async () => {
  await runCommand('docker compose stop nginx');
};

export const createAndStartCertbot = async () => {
  await runCommand('docker compose up -d --always-recreate-deps certbot');
};

export const reloadNginxConfig = async () => {
  await runCommand('docker compose exec --no-TTY nginx nginx -s reload');
};

export const deleteCertbotCertificate = async (domainName) => {
  await runCommand(
    `docker compose run --rm --no-deps --no-TTY --entrypoint certbot certbot -n delete --cert-name ${domainName}`
  );
};

export const forceRenewCertbotCertificate = async () => {
  await runCommand(
    'docker compose run --rm --no-deps --no-TTY --entrypoint certbot certbot renew --no-random-sleep-on-renew --force-renew'
  );
};
