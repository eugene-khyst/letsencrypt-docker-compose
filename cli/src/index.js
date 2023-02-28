import * as fs from 'fs';
import * as dotenv from 'dotenv';
import inquirer from 'inquirer';

const dockerComposeConfig = dotenv.parse(
  fs.readFileSync('../.env', { encoding: 'utf8' })
);
const appConfig = dotenv.parse(
  fs.readFileSync('../config.env', { encoding: 'utf8' })
);

const defaultDomains = appConfig.DOMAINS.split(' ');
const defaultEmails = appConfig.CERTBOT_EMAILS.split(' ');

const domains = [];
const emails = [];

const projectQuestions = [
  {
    type: 'input',
    name: 'projectName',
    message: "What's your project name",
    default: dockerComposeConfig.COMPOSE_PROJECT_NAME,
  },
];

const domainQuestions = [
  {
    type: 'input',
    name: 'domain',
    message: "What's your domain name (e.g. example.com)?",
    default: defaultDomains[domains.length],
  },
  {
    type: 'input',
    name: 'email',
    message: "What's your email for registration and recovery contact?",
    default: defaultEmails[emails.length],
  },
  {
    type: 'confirm',
    name: 'askAgain',
    message: 'Want to enter another domain name?',
    default: true,
  },
];

const subdomainQuestions = [
  {
    type: 'confirm',
    name: 'wwwSubdomain',
    message: "Want to have 'www' subdomain (e.g. www.example.com)?",
    default: appConfig.WWW_SUBDOMAIN !== '0' || true,
  },
];

const certbotQuestions = [
  {
    type: 'confirm',
    name: 'testCert',
    message: 'Want to obtain a test certificate from a staging server?',
    default: appConfig.CERTBOT_TEST_CERT !== '0' || true,
  },
  {
    type: 'number',
    name: 'rsaKeySize',
    message: 'What is the RSA key size?',
    default: appConfig.CERTBOT_RSA_KEY_SIZE || 4096,
  },
];

function askCertbot() {
  inquirer.prompt(certbotQuestions).then((answers) => {
    appConfig.CERTBOT_TEST_CERT = answers.testCert ? '1' : '0';
    appConfig.CERTBOT_RSA_KEY_SIZE = answers.rsaKeySize;
  });
}

function askSubdomain() {
  inquirer.prompt(subdomainQuestions).then((answers) => {
    appConfig.WWW_SUBDOMAIN = answers.wwwSubdomain ? '1' : '0';
    askCertbot();
  });
}

function askDomains() {
  inquirer.prompt(domainQuestions).then((answers) => {
    domains.push(answers.domain);
    emails.push(answers.email);
    if (answers.askAgain) {
      askDomains();
    } else {
      appConfig.DOMAINS = domains;
      appConfig.CERTBOT_EMAILS = emails;
      askSubdomain();
    }
  });
}

function askProject() {
  inquirer.prompt(projectQuestions).then((answers) => {
    dockerComposeConfig.COMPOSE_PROJECT_NAME = answers.projectName;
    askDomains();
  });
}

askProject();
