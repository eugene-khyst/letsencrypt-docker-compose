import inquirer from 'inquirer';
import {
  deleteNginxConfigFile,
  readConfig,
  writeConfig,
  writeNginxConfigFiles,
} from './config-processor.js';

const askDomain = async (config, domainName) => {
  const domainConfig =
    (domainName &&
      config.domains?.find((domain) => domain.domain === domainName)) ||
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
        { name: 'To serve static content', value: 'staticContent' },
        { name: 'As a reverse proxy', value: 'reverseProxy' },
      ],
    },
  ];

  const answers = await inquirer.prompt(questions);

  Object.assign(domainConfig, answers);

  if (answers.requestHandler === 'reverseProxy') {
    const reverseProxyQuestions = [
      {
        type: 'confirm',
        name: 'dnsResolver',
        message: 'Proxy to a server defined in the same docker-compose.yml?',
        default: domainConfig.dnsResolver ?? true,
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
    ];

    const { upstream, dnsResolver } = await inquirer.prompt(
      reverseProxyQuestions
    );

    Object.assign(domainConfig, {
      upstream,
      ...(dnsResolver ? { dnsResolver: '127.0.0.11' } : {}),
    });
  } else {
    delete domainConfig.upstream;
    delete domainConfig.dnsResolver;
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

const askChooseDomainName = async (actionName, config) => {
  const domainsQuestions = [
    {
      type: 'list',
      name: 'domainName',
      message: `What domain do you want to ${actionName}?`,
      choices: config.domains.map((domain) => domain.domain),
    },
  ];

  const { domainName } = await inquirer.prompt(domainsQuestions);

  return domainName;
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

const askConfimConfig = async (config) => {
  const questions = [
    {
      type: 'confirm',
      name: 'confirm',
      message: 'Are the entered data correct?',
      default: false,
    },
  ];

  const { confirm } = await inquirer.prompt(questions);

  if (confirm) {
    await writeConfig(config);
    await writeNginxConfigFiles(config);
  }

  return confirm;
};

const removeDomain = (config, domainName) => {
  const index = config.domains.findIndex(
    (domain) => domain.domain === domainName
  );
  if (index >= 0) {
    config.domains.splice(index, 1);
  }
};

const askConfig = async () => {
  let config = await readConfig();

  if (!config) {
    config = { domains: [] };
    await askDomain(config);
    await askNginxConfig(config);
    await askConfimConfig(config);
  } else {
    const questions = [
      {
        type: 'list',
        name: 'command',
        message: 'What do you want to do?',
        choices: [
          { name: 'Edit existing domains', value: 'editDomains' },
          { name: 'Add new domains', value: 'addDomains' },
          {
            name: 'Remove existing domains',
            value: 'removeDomains',
          },
          { name: 'Edit Nginx configuration', value: 'editNginxConf' },
        ],
      },
    ];

    const { command } = await inquirer.prompt(questions);

    switch (command) {
      case 'editDomains': {
        const domainName = await askChooseDomainName('edit', config);
        await askDomain(config, domainName);
        await askConfimConfig(config);
        break;
      }
      case 'addDomains': {
        await askDomain(config);
        await askConfimConfig(config);
        break;
      }
      case 'removeDomains': {
        const domainName = await askChooseDomainName('remove', config);
        removeDomain(config, domainName);
        if (await askConfimConfig(config)) {
          await deleteNginxConfigFile(domainName);
        }
        break;
      }
      case 'editNginxConf': {
        await askNginxConfig(config);
        await askConfimConfig(config);
        break;
      }
      default:
        console.error('Unknown command', command);
        break;
    }
  }
};

export default askConfig;
