import * as fs from 'fs/promises';
import Handlebars from 'handlebars';

const configPath = './config.json';
const templatesDir = './templates';
const nginxConfDir = './nginx-conf';

export const readConfig = async () => {
  console.log('Reading config', configPath);
  const defaultConfig = { domains: [] };
  try {
    const configJson = await fs.readFile(configPath, 'utf8');
    const config = JSON.parse(configJson);
    console.log('Found an existing config');
    return Object.assign(defaultConfig, config);
  } catch (e) {
    console.log('Existing valid config not found, using new empty config');
    return defaultConfig;
  }
};

export const writeConfig = async (config) => {
  console.log('Writing config', configPath);
  const configJson = JSON.stringify(config, null, 2);
  await fs.writeFile(configPath, configJson);
};

const compileTemplate = async (templateFilename) => {
  const templatePath = `${templatesDir}/${templateFilename}`;
  console.log('Compiling template', templatePath);
  const template = await fs.readFile(templatePath, 'utf8');
  return Handlebars.compile(template);
};

const writeNginxConfigFile = async (configFilename, content) => {
  const nginxConfigPath = `${nginxConfDir}/${configFilename}`;
  console.log('Writing', nginxConfigPath);
  await fs.writeFile(nginxConfigPath, content);
};

export const writeNginxConfigFiles = async (config) => {
  const nginxConfTemplate = await compileTemplate('nginx.conf.hbs');
  const serverConfTemplate = await compileTemplate('servers.conf.hbs');

  await writeNginxConfigFile('nginx.conf', nginxConfTemplate(config));

  const writeServerConfigPromises = config.domains?.map((serverConfig) =>
    writeNginxConfigFile(
      `conf.d/${serverConfig.domain}.conf`,
      serverConfTemplate(serverConfig)
    )
  );
  if (writeServerConfigPromises) {
    await Promise.all(writeServerConfigPromises);
  }
};

export const deleteNginxConfigFile = async (domainName) => {
  const nginxConfigPath = `${nginxConfDir}/conf.d/${domainName}.conf`;
  console.log('Deleting', nginxConfigPath);
  await fs.unlink(nginxConfigPath);
};
