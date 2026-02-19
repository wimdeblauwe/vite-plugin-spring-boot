import {HmrContext, ResolvedConfig, ViteDevServer} from "vite";
import {createFilter, FilterPattern} from '@rollup/pluginutils';
import path from "path";
import fs from "fs";
import {globbySync} from "globby";

export enum BuildSystem {
    Maven = 'maven',
    Gradle = 'gradle'
}

interface SpringBootOptions {
    fullCopyFilePaths?: {
        /**
         * Defines the file paths for files that need to be copied as is when changed. After they are
         * copied, a full page refresh is done. By default, they are equal to `['**\/*.html', '**\/*.svg']`
         */
        include?: FilterPattern;
        /**
         * Defines patterns to exclude files from being processed. No files are excluded by default.
         */
        exclude?: FilterPattern;
    };

    /**
     * Enable verbose logging of the copy actions this plugin does
     */
    verbose?: boolean;

    /**
     * Specify the build system to use (Maven or Gradle). Affects the output directory structure.
     * Defaults to Maven if not specified.
     */
    buildSystem?: BuildSystem;
}

export default function springBoot(options: SpringBootOptions = {}) {
    const buildSystem = options.buildSystem || BuildSystem.Maven;

    const targetDir: string = path.resolve(process.cwd(),
        buildSystem === BuildSystem.Maven ? 'target' : 'build');

    const outputDir: string = path.join(targetDir,
        buildSystem === BuildSystem.Maven ? 'classes' : 'resources/main');

    const devServerConfigOutputDir: string = path.join(targetDir, 'vite-plugin-spring-boot');
    const devServerConfigOutputFile: string = path.join(devServerConfigOutputDir, 'dev-server-config.json');

    let filter: (id: string | unknown) => boolean;

    const verbose: boolean = options.verbose || false;

    if (verbose) {
        console.log(`Using build system: ${buildSystem}`);
        console.log(`Output directory: ${outputDir}`);
    }

    let config: ResolvedConfig;

    const initializeFilter = (rootDir: string) => {
        if (!filter) {
            filter = createFilter(
                options.fullCopyFilePaths?.include || ['**/*.html', '**/*.svg'],
                options.fullCopyFilePaths?.exclude,
                {
                    resolve: rootDir,
                }
            );
        }
        return filter;
    };

    return {
        name: "vite-plugin-spring-boot",
        configResolved(resolvedConfig: ResolvedConfig) {
            config = resolvedConfig;
        },
        async configureServer(server: ViteDevServer) {
            const rootDir = server.config.root;
            const currentFilter = initializeFilter(rootDir);

            await copyFiles(currentFilter, rootDir, outputDir, verbose);
            writeDevServerConfigFile(config, devServerConfigOutputFile);
            updateDevServerConfigFile(server, devServerConfigOutputFile);
        },
        handleHotUpdate(context: HmrContext) {
            const file: string = context.file;
            const server: ViteDevServer = context.server;
            const currentFilter = filter || initializeFilter(server.config.root);

            if (currentFilter(file)) {
                const relativePath = path.relative(server.config.root, file);
                const outputPath = path.join(outputDir, relativePath);
                copyFile(file, outputPath, true);
                // Force a full page reload when a file was updated
                server.ws.send({type: "full-reload"});
            }
        },
        async buildEnd() {
            const rootDir = config.root;
            const currentFilter = initializeFilter(rootDir);

            copyFiles(currentFilter, rootDir, outputDir, verbose);
        }
    }
}

/**
 * Writes the static configuration of the Vite Dev Server to a file.
 */
function writeDevServerConfigFile(config: ResolvedConfig, devServerConfigOutputFile: string) {
    const configHmrProtocol = typeof config.server.hmr === 'object' ? config.server.hmr.protocol : null;
    const clientProtocol = configHmrProtocol ? (configHmrProtocol === 'wss' ? 'https' : 'http') : null;
    const serverProtocol = config.server.https ? 'https' : 'http';
    const protocol = clientProtocol ?? serverProtocol;

    const configHmrHost = typeof config.server.hmr === 'object' ? config.server.hmr.host : null;
    const configHost = typeof config.server.host === 'string' ? config.server.host : null;
    const host = configHmrHost ?? configHost;

    const configHmrClientPort = typeof config.server.hmr === 'object' ? config.server.hmr.clientPort : null;
    const configPort = config.server.port;
    const port = configHmrClientPort ?? configPort ?? 5173;
    
    const configData = JSON.stringify({`${protocol}://${host}`, port}, null, 2);

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

async function copyFiles(filter: (id: string | unknown) => boolean, rootDir: string, outputDir: string, verbose: boolean) {
    const files = globbySync('**/*', {cwd: rootDir});
    if (verbose) {
        console.log(`Found ${files.length} files at ${rootDir}, filtering and copying...`);
    }

    let count = 0;
    files.forEach((file: string) => {
        const srcPath = path.join(rootDir, file);
        if (filter(srcPath)) {
            const destPath = path.join(outputDir, file);
            copyFile(srcPath, destPath, verbose);
            count++;
        }
    });
    if (count > 0) {
        console.log(`Copied ${count} files to ${outputDir}`);
    }
}
