import {ViteDevServer} from "vite";

export default function springBoot() {
    return {
      name: "vite-plugin-spring-boot",
      configureServer(server: ViteDevServer){
        console.log("configure server ", server);
      }
    }
}