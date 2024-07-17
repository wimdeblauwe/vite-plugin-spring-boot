# Vite plugin for Spring Boot backend

## Building

* Run `npm install`
* Run `npm run build-plugin`

## Testing locally

1. Run `npm link` from this plugin.
2. Run `npm link @wimdeblauwe/vite-plugin-spring-boot` from the project that would like to use the plugin

When done, you can run the following commands:

1. Run `npm unlink @wimdeblauwe/vite-plugin-spring-boot` in the project that uses the plugin.
2. Run `npm unlink` from this plugin.