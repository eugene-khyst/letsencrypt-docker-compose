import inquirer from 'inquirer';
import {
  deleteNginxConfigFile,
  readConfig,
  writeConfig,
  writeNginxConfigFiles,
} from './config-processor.js';
import {
  isNginxServiceRunning,
  execNginxReload,
  execConfigNginx,
  execDeleteCertbotCertificate,
  execCertbotCertonly,
  execForceRenewCertbotCertificate,
} from './shell-commands.js';

const dockerDnsResolver = '127.0.0.11';

const askDomain = async (config, domainName) => {
  const domainConfig =
    (domainName &&
      config.domains.find((domain) => domain.domain === domainName)) ||
    {};

  const questions = [
    {
      type: 'input',
      name: 'domain',
      message: "What's your domain name (e.g. example.com)?",
      default: domainConfig.domain,
      validate(input) {
        if (/^([a-z0-9]+(-[a-z0-9]+)*\.)+[a-z]{2,}$/g.test(input)) {
          return true;
        }
        throw Error('Please provide a valid domain name.');
      },
    },
    {
      type: 'input',
      name: 'email',
      message: "What's your email for registration and recovery contact?",
      default: domainConfig.email,
      validate(input) {
        if (!input || /^[a-z0-9+_.-]+@[a-z0-9.-]+$/g.test(input)) {
          return true;
        }
        throw Error('Please provide a valid email.');
      },
    },
    {
      type: 'confirm',
      name: 'wwwSubdomain',
      message: "Want to have 'www' subdomain (e.g. www.example.com)?",
      default: domainConfig.wwwSubdomain ?? true,
    },
    {
      type: 'confirm',
      name: 'testCert',
      message: 'Want to obtain a test certificate from a staging server?',
      default: domainConfig.testCert ?? true,
    },
    {
      type: 'number',
      name: 'rsaKeySize',
      message: 'What is the RSA key size in bits?',
      default: domainConfig.rsaKeySize || 4096,
    },
    {
      type: 'list',
      name: 'requestHandler',
      message: 'How do you want to configure Nginx?',
      choices: [
        { name: 'Serving static content', value: 'staticContent' },
        { name: 'Reverse proxy', value: 'reverseProxy' },
        { name: 'PHP-FPM', value: 'phpFpm' },
      ],
    },
  ];

  const answers = await inquirer.prompt(questions);

  Object.assign(domainConfig, answers);

  if (answers.requestHandler === 'reverseProxy') {
    const reverseProxyQuestions = [
      {
        type: 'confirm',
        name: 'dockerDns',
        message:
          'Does the upstream server run as a Docker container on the same host?',
        default: domainConfig.dnsResolver
          ? domainConfig.dnsResolver === dockerDnsResolver
          : true,
      },
      {
        type: 'input',
        name: 'upstream',
        message:
          'What is the address of the proxied server (e.g. example-backend:8080)?',
        default: domainConfig.upstream,
        validate(input) {
          if (input.length > 0) {
            return true;
          }
          throw Error('Please provide a valid host.');
        },
      },
      {
        type: 'confirm',
        name: 'websockets',
        message: 'Enable WebSocket proxying?',
        default: domainConfig.websockets ?? false,
      },
    ];

    const { dockerDns, upstream, websockets } = await inquirer.prompt(
      reverseProxyQuestions
    );

    Object.assign(
      domainConfig,
      {
        upstream,
        websockets,
      },
      dockerDns ? { dnsResolver: dockerDnsResolver } : {}
    );
  } else {
    delete domainConfig.dnsResolver;
    delete domainConfig.upstream;
    delete domainConfig.websockets;
  }

  if (!domainName) {
    config.domains.push(domainConfig);

    const askAgainQuestion = [
      {
        type: 'confirm',
        name: 'askAgain',
        message: 'Want to add another domain?',
        default: false,
      },
    ];

    const { askAgain } = await inquirer.prompt(askAgainQuestion);

    if (askAgain) {
      await askDomain(config);
    }
  }
};

const askChooseDomainName = async (message, config, filter) => {
  const domainsQuestions = [
    {
      type: 'list',
      name: 'domainName',
      message,
      choices: config.domains
        .filter(filter || (() => true))
        .map((domain) => domain.domain),
    },
  ];

  const { domainName } = await inquirer.prompt(domainsQuestions);

  const index = config.domains.findIndex(
    (domain) => domain.domain === domainName
  );

  const domainConfig = config.domains[index];

  return { domainName, index, domainConfig };
};

const askNginxConfig = async (config) => {
  const questions = [
    {
      type: 'number',
      name: 'dhparamsSize',
      message: 'What is the DH parameters size in bits?',
      default: config.dhparamsSize || 2048,
    },
    {
      type: 'confirm',
      name: 'gzip',
      message: 'Use Gzip?',
      default: config.gzip ?? true,
    },
  ];

  const answers = await inquirer.prompt(questions);

  Object.assign(config, answers);
};

const askConfirm = async () => {
  const questions = [
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are the entered data correct?',
      default: false,
    },
  ];

  const { confirm } = await inquirer.prompt(questions);
  return confirm;
};

const writeConfigFiles = async (config, domainNames) => {
  await writeConfig(config);
  await writeNginxConfigFiles(config, domainNames);
};

const getDomainNames = (config) => config.domains.map(({ domain }) => domain);

const initConfig = async (config) => {
  await askDomain(config);
  await askNginxConfig(config);
  if (await askConfirm()) {
    await writeConfigFiles(config);
  }
};

const obtainProductionCertificates = async (config) => {
  const { domainName, domainConfig } = await askChooseDomainName(
    "Which domain should be switched to a Let's Encrypt production environment?",
    config,
    (domain) => domain.testCert
  );

  domainConfig.testCert = false;

  if (await askConfirm()) {
    await writeConfigFiles(config, [domainName]);
    await execDeleteCertbotCertificate(domainName);
    await execConfigNginx(); // Use dummy certificate
    await execCertbotCertonly(); // Obtain Let's Encrypt certificate
    await execConfigNginx(); // Use Let's Encrypt certificate
  }
};

const addDomains = async (config) => {
  const domainNamesBefore = getDomainNames(config);
  await askDomain(config);
  const domainNamesAfter = getDomainNames(config);
  const addedDomainNames = domainNamesAfter.filter(
    (domainName) => !domainNamesBefore.includes(domainName)
  );
  if (await askConfirm()) {
    await writeConfigFiles(config, addedDomainNames);
    await execConfigNginx(); // Use dummy certificate
    await execCertbotCertonly(); // Obtain Let's Encrypt certificate
    await execConfigNginx(); // Use Let's Encrypt certificate
  }
};

const removeDomains = async (config) => {
  const { domainName, index } = await askChooseDomainName(
    'Which domain do you want to remove?',
    config
  );

  config.domains.splice(index, 1);

  if (await askConfirm()) {
    await writeConfigFiles(config, []);
    await deleteNginxConfigFile(domainName);
    await execNginxReload();
    await execDeleteCertbotCertificate(domainName);
  }
};

const forceRenewCertificates = async () => {
  if (await askConfirm()) {
    await execForceRenewCertbotCertificate();
    await execNginxReload();
  }
};

const reloadNginxConfiguration = async () => {
  if (await askConfirm()) {
    await execNginxReload();
  }
};

const askConfig = async () => {
  const config = await readConfig();

  if (!config.domains.length) {
    await initConfig(config);
  } else {
    if (!(await isNginxServiceRunning())) {
      console.error(
        'To edit an existing config, start the services first: docker compose up -d'
      );
      console.error(
        'To perform a new initial setup, delete the existing config: rm config.json'
      );
      return;
    }

    const hasTestCerts =
      config.domains.filter((domain) => domain.testCert).length > 0;

    const questions = [
      {
        type: 'list',
        name: 'command',
        message: 'What do you want to do?',
        choices: [
          ...(hasTestCerts
            ? [
                {
                  name: "Switch to a Let's Encrypt production environment",
                  value: 'obtainProductionCertificates',
                },
              ]
            : []),
          { name: 'Add new domains', value: 'addDomains' },
          {
            name: 'Remove existing domains',
            value: 'removeDomains',
          },
          {
            name: "Manually renew all Let's Encrypt certificates (force renewal)",
            value: 'forceRenewCertificates',
          },
          {
            name: 'Reload Nginx configuration without downtime',
            value: 'reloadNginxConfiguration',
          },
        ],
      },
    ];

    const { command } = await inquirer.prompt(questions);

    const commands = {
      obtainProductionCertificates,
      addDomains,
      removeDomains,
      forceRenewCertificates,
      reloadNginxConfiguration,
    };

    await commands[command](config);
  }
};

export default askConfig;
