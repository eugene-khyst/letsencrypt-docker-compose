import { promisify } from 'util';
import { exec } from 'child_process';

const execute = promisify(exec);

const runCommand = async (command, logOutput = true) => {
  try {
    console.log('Executing command:', command);
    const { stdout, stderr } = await execute(command);
    console.error(stderr);
    if (logOutput) {
      console.log(stdout);
    }
    return { stdout, stderr };
  } catch (error) {
    console.error(error);
    return { error };
  }
};

export const isNginxServiceRunning = async () => {
  const { stdout } = await runCommand('docker compose ps --format json', false);
  const containers = JSON.parse(stdout);
  return !!containers.find(
    (container) =>
      container.Service === 'nginx' && container.State === 'running'
  );
};

export const execNginxReload = async () => {
  await runCommand('docker compose exec --no-TTY nginx nginx -s reload');
};

export const execConfigNginx = async () => {
  await runCommand(
    'docker compose exec --no-TTY nginx /letsencrypt-docker-compose/config-nginx.sh'
  );
};

export const execCertbotCertonly = async () => {
  await runCommand(
    'docker compose exec --no-TTY certbot /letsencrypt-docker-compose/certbot-certonly.sh'
  );
};

export const execDeleteCertbotCertificate = async (domainName) => {
  await runCommand(
    `docker compose exec --no-TTY certbot certbot --noninteractive delete --cert-name ${domainName}`
  );
};

export const execForceRenewCertbotCertificate = async () => {
  await runCommand(
    'docker compose exec --no-TTY certbot certbot renew --no-random-sleep-on-renew --force-renew'
  );
};
