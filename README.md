# Vite plugin for Spring Boot backend

## Functionality

This [vite plugin](https://vitejs.dev/guide/api-plugin) has 2 main functionlities to make it possible to use [Spring Boot](https://spring.io/projects/spring-boot) with [Vite](https://vitejs.dev/):

* Copy the HTML templates (Thymeleaf or whatever template engine is used) when the Vite Dev Server is running when they change.
* Write a file containing the host and port that the Vite Dev Server is running on. This will allow the Spring Boot application to point to the correct URL for the JavaScript and CSS files so [Hot Module Replacement](https://vitejs.dev/guide/features.html#hot-module-replacement) works.

## Usage

Add the plugin:

```
npm i -D @wim.deblauwe/vite-plugin-spring-boot
```

Update `vite.config.js` to use the plugin:

```js
import springBoot from '@wim.deblauwe/vite-plugin-spring-boot';

export default defineConfig({
  plugins: [
    springBoot()
  ],
});
```

This plugin should be used together with
the [vite-spring-boot](https://github.com/wimdeblauwe/vite-spring-boot)
library on the backend.

> [!TIP]
> The easiest way to generate a working setup is to generate the Spring Boot project
> using [ttcli](https://github.com/wimdeblauwe/ttcli).

## Configuration

### fullCopyFilePaths

Allows to set what file paths should be copied when anything changes to the files in those file paths.
After they are copied, a full page refresh is done.

Example:

```js
export default defineConfig({
    plugins: [
        springBoot({
            fullCopyFilePaths: {
                include: ['**/*.html', '**/*.svg', '**/*.png']
            }
        }),
    ],
});
```

If the option is not set, the default is used: `['**/*.html', '**/*.svg']`.

It is also possible to define `exclude` to exclude some file paths:

```js
export default defineConfig({
    plugins: [
        springBoot({
            fullCopyFilePaths: {
                include: ['**/*.html', '**/*.svg'],
                exclude: ['**/dontcopyme.svg']
            }
        }),
    ],
});
```

### buildSystem

By default, the plugin assumes that Maven is used, and it will copy files to `target/classes`.

If you use Gradle and want things to be copied to `build/resources`, you can configure the plugin like this:

```js
export default defineConfig({
    plugins: [
        springBoot({
            buildSystem: BuildSystem.Gradle
        }),
    ],
});
```

### verbose

When setting `verbose` to `true`, the plugin will log more information about what files it copies.

Example:

```js
export default defineConfig({
    plugins: [
        springBoot({
            verbose: true
        }),
    ],
});
```

## Building

* Run `npm install`
* Run `npm run build-plugin`

## Testing locally

1. Run `npm link` from this plugin.
2. Run `npm link @wim.deblauwe/vite-plugin-spring-boot` from the project that would like to use the plugin

During development, run `npm run build-plugin` to have the changes available in the project that uses the plugin.

When done, you can run the following commands:

1. Run `npm unlink --no-save @wim.deblauwe/vite-plugin-spring-boot` in the project that uses the plugin.
2. Run `npm unlink -g` from this plugin.

## Releasing

1. Set the version number in `package.json`
2. Commit locally.
3. Tag the commit with the version number (e.g. `1.0.0`)
4. Push the commit and the tag to remote. This will trigger the release action on GitHub.