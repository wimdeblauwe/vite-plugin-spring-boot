import {HmrContext, ResolvedConfig, ViteDevServer} from "vite";
import path from "path";
import fs from "fs";
import {globby} from "globby";
import {minimatch} from "minimatch";

export default function springBoot() {
  const targetDir: string = path.resolve(process.cwd(), 'target');
  const outputDir: string = path.join(targetDir, 'classes');
  const devServerConfigOutputDir: string = path.join(targetDir, 'vite-plugin-spring-boot');
  const devServerConfigOutputFile: string = path.join(devServerConfigOutputDir, 'dev-server-config.json');

  const filePathsToHandle = ['**/*.html', '**/*.svg'];

  let config: ResolvedConfig;

  return {
    name: "vite-plugin-spring-boot",
    configResolved(resolvedConfig: ResolvedConfig) {
      config = resolvedConfig;
    },
    async configureServer(server: ViteDevServer) {
      const rootDir = server.config.root;
      await copyFiles(filePathsToHandle, rootDir, outputDir);
      writeDevServerConfigFile(config, devServerConfigOutputFile);
      updateDevServerConfigFile(server, devServerConfigOutputFile);
    },
    handleHotUpdate(context: HmrContext) {
      const file: string = context.file;
      const server: ViteDevServer = context.server;
      if (filePathsToHandle.some(pattern => matchGlobPattern(pattern, file, server.config.root))) {
        const relativePath = path.relative(server.config.root, file);
        const outputPath = path.join(outputDir, relativePath);
        copyFile(file, outputPath, true);
        // Force a full page reload when a file was updated
        server.ws.send({ type: "full-reload" });
      }
    },
    async buildEnd() {
      const rootDir = config.root;
      copyFiles(filePathsToHandle, rootDir, outputDir);
    }
  }
}

function matchGlobPattern(pattern: string, filePath: string, rootDir: string): boolean {
  const relativePath = path.relative(rootDir, filePath);
  return minimatch(relativePath, pattern);
}

/**
 * Writes the static configuration of the Vite Dev Server to a file.
 */
function writeDevServerConfigFile(config: ResolvedConfig, devServerConfigOutputFile: string) {
  const host = config.server.host || 'localhost';
  const port = config.server.port || 5173;
  const configData = JSON.stringify({host, port}, null, 2);

  ensureDirectoryExistence(devServerConfigOutputFile);
  fs.writeFileSync(
      path.resolve(process.cwd(), devServerConfigOutputFile),
      configData
  );
}

/**
 * Update the config file with the actual port that was used (This can differ from
 * the configured port if that port is not free when the Vite Dev Server is started).
 */
function updateDevServerConfigFile(server: ViteDevServer, configPath: string) {
  server.httpServer?.once('listening', () => {

    try {
      ensureDirectoryExistence(configPath)
      // Read the existing config file
      const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));

      // Update using the actual port that the dev server is running on
      configData.port = server.config.server.port;

      // Write the updated config back to the file
      fs.writeFileSync(configPath, JSON.stringify(configData, null, 2));
    } catch (error) {
      console.error('Error updating server-config.json:', error);
    }
  })
}

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

function copyFile(src: string, dest: string, logCopy = false) {
  ensureDirectoryExistence(dest);
  fs.copyFileSync(src, dest);

  if (logCopy) {
    console.log(`Copied ${src} to ${dest}`);
  }
}

async function copyFiles(patterns: string[], rootDir: string, outputDir: string) {
  const files = await globby(patterns, {cwd: rootDir});
  files.forEach((file: string) => {
    const srcPath = path.join(rootDir, file);
    const destPath = path.join(outputDir, file);
    copyFile(srcPath, destPath);
  });
  if (files.length > 0) {
      console.log(`Copied ${files.length} files to ${outputDir}`);
  }
}
